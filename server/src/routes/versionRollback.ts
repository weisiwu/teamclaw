import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/projectAccess.js';
import { getDb } from '../db/sqlite.js';
import { VersionSummaryModel } from '../models/versionSummary.js';
import { RollbackRecordModel } from '../models/rollbackRecord.js';
import {
  rollbackToTag,
  rollbackToBranch,
  rollbackToCommit,
  getRollbackPreview,
  getRollbackTargets,
} from '../services/rollbackService.js';
import { generateChangelogFromCommits } from '../services/changelogGenerator.js';
import { onVersionRollback } from '../services/changeTracker.js';
import { auditService } from '../services/auditService.js';
import { AuthRequest } from '../middleware/auth.js';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const router = Router();

// GET /api/v1/versions/:id/rollback-history — Get rollback history for a version
router.get('/:id/rollback-history', (req: Request, res: Response) => {
  const row = getDb().prepare('SELECT id FROM versions WHERE id = ?').get(req.params.id);
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const history = RollbackRecordModel.findByVersionId(req.params.id);
  res.json(success(history));
});

// GET /api/v1/versions/:id/rollback-targets — Get available rollback targets
router.get('/:id/rollback-targets', (req: Request, res: Response) => {
  const db = getDb();
  const row = db
    .prepare('SELECT id, version, projectPath FROM versions WHERE id = ?')
    .get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const projectPath =
    (row.projectPath as string) ||
    path.join(
      process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects',
      req.params.id
    );

  const targets = getRollbackTargets(projectPath);
  res.json(success(targets));
});

// GET /api/v1/versions/:id/rollback-preview — Preview what a rollback would do
router.get('/:id/rollback-preview', (req: Request, res: Response) => {
  const db = getDb();
  const row = db
    .prepare('SELECT id, version, projectPath FROM versions WHERE id = ?')
    .get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const targetRef = req.query.ref as string;
  if (!targetRef) {
    res.status(400).json(error(400, 'ref query parameter required'));
    return;
  }

  const projectPath =
    (row.projectPath as string) ||
    path.join(
      process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects',
      req.params.id
    );

  const preview = getRollbackPreview(projectPath, targetRef);
  res.json(success(preview));
});

// GET /api/v1/versions/:id/head-status — Check if version is at current HEAD (iter75)
router.get('/:id/head-status', (req: Request, res: Response) => {
  const db = getDb();
  const row = db
    .prepare('SELECT id, version, projectPath, commit_hash FROM versions WHERE id = ?')
    .get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const projectPath =
    (row.projectPath as string) ||
    path.join(
      process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects',
      req.params.id
    );

  let currentCommit = '';
  let isCurrentHead = false;

  try {
    currentCommit = execSync('git rev-parse HEAD', { cwd: projectPath, encoding: 'utf-8' }).trim();
    const versionCommit = (row.commit_hash as string) || '';
    isCurrentHead = currentCommit === versionCommit;
  } catch {
    currentCommit = '';
    isCurrentHead = false;
  }

  res.json(
    success({
      isCurrentHead,
      currentCommit,
      versionCommit: row.commit_hash || '',
      canRollback: !isCurrentHead,
    })
  );
});

// POST /api/v1/versions/:id/rollback — Rollback to a tag, branch, or commit（需要项目权限）
// FIX: 添加 requireAuth 确保身份从 JWT Token 验证，不再信任 HTTP Header
router.post(
  '/:id/rollback',
  requireAuth,
  requireProjectAccess,
  async (req: AuthRequest, res: Response) => {
    const db = getDb();
    const row = db
      .prepare('SELECT id, version, projectPath, created_by FROM versions WHERE id = ?')
      .get(req.params.id) as Record<string, unknown> | undefined;
    if (!row) {
      res.status(404).json(error(404, 'Version not found'));
      return;
    }

    const {
      target,
      type,
      createBranch: shouldCreateBranch,
    } = req.body as {
      target: string;
      type?: 'tag' | 'branch' | 'commit';
      createBranch?: boolean;
    };

    if (!target) {
      res.status(400).json(error(400, 'target is required'));
      return;
    }

    const projectPath =
      (row.projectPath as string) ||
      path.join(
        process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects',
        req.params.id
      );

    let result;
    if (type === 'branch') {
      result = rollbackToBranch(projectPath, target, { createBackupBranch: true });
    } else if (type === 'commit') {
      result = rollbackToCommit(projectPath, target, {
        createBranch: shouldCreateBranch,
        branchName: shouldCreateBranch ? `rollback/${row.version}-${Date.now()}` : undefined,
      });
    } else {
      result = rollbackToTag(projectPath, target, {
        createBranch: shouldCreateBranch,
        branchName: shouldCreateBranch ? `rollback/${row.version}` : undefined,
      });
    }

    RollbackRecordModel.create({
      id: `rb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      versionId: req.params.id,
      versionName: row.version as string,
      targetRef: target,
      targetType: type || 'tag',
      mode: type === 'branch' ? 'checkout' : 'revert',
      previousRef: result.previousRef,
      newBranch: result.newBranch,
      backupCreated: shouldCreateBranch || false,
      success: result.success,
      error: result.error,
      performedBy: req.user?.id || 'developer',
      performedAt: new Date().toISOString(),
    });

    const now = new Date().toISOString();
    db.prepare(
      `
    UPDATE versions
    SET rollback_count = COALESCE(rollback_count, 0) + 1,
        last_rollback_at = ?
    WHERE id = ?
  `
    ).run(now, req.params.id);

    try {
      onVersionRollback(
        req.params.id,
        target,
        type || 'tag',
        req.user?.id || 'developer',
        undefined,
        { success: result.success, backupCreated: shouldCreateBranch || false }
      );
    } catch (err) {
      console.warn('[rollback] Failed to record change event:', err);
    }

    try {
      const rollbackMsg = `Rollback to ${target} (${type || 'tag'})`;
      const currentBranch = (row.branch as string) || 'main';
      const generated = await generateChangelogFromCommits(
        req.params.id,
        rollbackMsg,
        currentBranch
      );
      VersionSummaryModel.upsert({
        versionId: req.params.id,
        title: `版本回退: ${row.version}`,
        content: generated.content || `已回退到 ${target}`,
        features: [],
        fixes: [],
        changes: [`回退到 ${target}`],
        breaking: [],
        createdBy: 'system',
      });
      db.prepare('UPDATE versions SET summary = ? WHERE id = ?').run(
        `已回退到 ${target}`,
        req.params.id
      );
    } catch (err) {
      console.warn('[rollback] Auto summary generation failed:', err);
    }

    const updated = db
      .prepare('SELECT rollback_count, last_rollback_at FROM versions WHERE id = ?')
      .get(req.params.id) as { rollback_count: number; last_rollback_at: string } | undefined;

    auditService.log({
      action: 'version_rollback',
      actor: req.user?.id || (req.headers['x-user-id'] as string) || 'unknown',
      target: req.params.id,
      details: {
        target,
        type: type || 'tag',
        success: result.success,
        operatorId: req.user?.id,
        targetResource: `version:${req.params.id}`,
        originalCreator: row.created_by,
        timestamp: new Date().toISOString(),
      },
      ipAddress: (req.ip || req.socket.remoteAddress) as string | undefined,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    res.json(
      success({
        ...result,
        rollbackCount: updated?.rollback_count ?? 1,
        lastRollbackAt: updated?.last_rollback_at ?? now,
      })
    );
  }
);

export default router;
