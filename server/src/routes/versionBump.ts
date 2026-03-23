import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { getDb } from '../db/sqlite.js';
import { VersionSummaryModel } from '../models/versionSummary.js';
import { isValidSemver } from '../services/semver.js';
import { performBump, formatBumpSummary } from '../services/versionBump.js';
import { executeAutoBump, getBumpHistory } from '../services/autoBump.js';
import { getGitLog, getCurrentBranch, createTag } from '../services/gitService.js';
import { generateChangelogFromCommits } from '../services/changelogGenerator.js';
import { getSettings } from '../services/versionSettingsStore.js';
import path from 'path';
import os from 'os';
import type { VersionBumpType, VersionSettings } from '../models/version.js';
import { createTagRecord } from '../services/tagService.js';
import path from 'path';
import os from 'os';

const router = Router();

export function autoBumpVersion(currentVersion: string, bumpType: VersionBumpType): string {
  const match = currentVersion.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return currentVersion;

  let [, major, minor, patch] = match.map(Number);
  switch (bumpType) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
      patch += 1;
      break;
  }
  return `v${major}.${minor}.${patch}`;
}

function makeTagName(version: string, prefix: VersionSettings['tagPrefix'], customPrefix?: string): string {
  const prefixMap: Record<string, string> = {
    v: 'v',
    release: 'release/',
    version: 'version/',
  };
  const p = prefix === 'custom' ? (customPrefix || 'v') : prefixMap[prefix];
  return prefix === 'release' || prefix === 'version' ? `${p}${version}` : `${p}${version}`;
}

// POST /api/v1/versions/:id/bump — 手动 bump（自动生成摘要）
router.post('/:id/bump', async (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { bumpType } = req.body as { bumpType?: VersionBumpType };
  const settings = getSettings();
  const type = bumpType || settings.bumpType;
  const previousVersion = row.version as string;
  const newVersion = autoBumpVersion(previousVersion, type);

  db.prepare('UPDATE versions SET version = ? WHERE id = ?').run(newVersion, req.params.id);

  if (settings.autoTag && settings.tagOnStatus.includes('published')) {
    const tagName = makeTagName(newVersion, settings.tagPrefix, settings.customPrefix);
    const projectPath = (row.projectPath as string) ||
      path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    try {
      createTag(projectPath, tagName, `Release ${newVersion}`);
      db.prepare('UPDATE versions SET tag_created = 1 WHERE id = ?').run(req.params.id);
    } catch (err) {
      console.warn('[bump] Failed to create git tag:', err);
    }
  }

  try {
    const projectPath = (row.projectPath as string) ||
      path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    const tagName = makeTagName(newVersion, settings.tagPrefix, settings.customPrefix);
    const commits = getGitLog(projectPath, { maxCount: 30, branch: tagName });
    const commitText = commits.map(c => `${c.hash.slice(0, 7)} ${c.message}`).join('\n') || 'bump version';
    const currentBranch = getCurrentBranch(projectPath);
    const generated = await generateChangelogFromCommits(req.params.id, commitText, currentBranch);
    VersionSummaryModel.upsert({
      versionId: req.params.id,
      title: generated.title,
      content: generated.content,
      features: generated.features,
      fixes: generated.fixes,
      changes: generated.improvements,
      breaking: generated.breaking,
      createdBy: 'AI',
    });
  } catch (e) {
    console.warn('[bump] Auto summary generation failed:', e);
  }

  res.json(success({
    previousVersion,
    newVersion,
    bumpType: type,
    gitTag: makeTagName(newVersion, settings.tagPrefix, settings.customPrefix),
  }));
});

// POST /api/v1/versions/:id/publish — 发布版本（触发 auto-bump）
router.post('/:id/publish', async (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const previousVersion = row.version as string;
  const settings = getSettings();

  let newVersion = previousVersion;
  let bumped = false;
  if (settings.autoBump) {
    newVersion = autoBumpVersion(previousVersion, settings.bumpType);
    bumped = true;
  }

  let tagCreated = false;
  if (settings.autoTag && settings.tagOnStatus.includes('published')) {
    const tagName = `v${newVersion}`;
    const projectPath = (row.projectPath as string) ||
      path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    try {
      tagCreated = createTag(projectPath, tagName, `Release ${newVersion}`);
    } catch (err) {
      console.warn('[publish] Failed to create git tag:', err);
    }
  }

  db.prepare(
    'UPDATE versions SET version = ?, build_status = ?, tag_created = ? WHERE id = ?'
  ).run(newVersion, 'success', tagCreated ? 1 : 0, req.params.id);

  try {
    const commitLog = (row.commit_log as string) || `Version ${newVersion} published`;
    const currentBranch = (row.branch as string) || 'main';
    const generated = await generateChangelogFromCommits(req.params.id, commitLog, currentBranch);
    VersionSummaryModel.upsert({
      versionId: req.params.id,
      title: generated.title,
      content: generated.content,
      features: generated.features,
      fixes: generated.fixes,
      changes: generated.improvements,
      breaking: generated.breaking,
      createdBy: 'system',
    });
    db.prepare('UPDATE versions SET summary = ? WHERE id = ?').run(generated.content, req.params.id);
  } catch (err) {
    console.warn('[publish] Auto summary generation failed:', err);
  }

  res.json(success({
    version: { id: req.params.id, version: newVersion, status: 'published', buildStatus: 'success' },
    bumped,
    previousVersion: bumped ? previousVersion : undefined,
    newVersion,
    tagCreated,
  }));
});

// GET /api/v1/versions/:id/bump-history — Get bump history for a version
router.get('/:id/bump-history', (req: Request, res: Response) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 50;
  const offset = (page - 1) * pageSize;

  const history = getBumpHistory(id);
  const total = history.length;
  const paginated = history.slice(offset, offset + pageSize);

  res.json(success({
    data: paginated,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }));
});

// POST /api/v1/versions/summary/batch-generate — Batch generate summaries for multiple versions
router.post('/summary/batch-generate', async (req: Request, res: Response) => {
  try {
    const { versionIds } = req.body as { versionIds: string[] };
    if (!Array.isArray(versionIds) || versionIds.length === 0) {
      res.status(400).json(error(400, 'versionIds must be a non-empty array'));
      return;
    }

    const results: { versionId: string; success: boolean; error?: string }[] = [];

    for (const id of versionIds) {
      const db = getDb();
      const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      if (!row) {
        results.push({ versionId: id, success: false, error: 'Version not found' });
        continue;
      }
      try {
        const projectPath = (row.projectPath as string) ||
          path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', id);
        const tagName = `v${row.version}`;
        const commits = getGitLog(projectPath, { maxCount: 30, branch: tagName });
        const commitText = commits.map(c => `${c.hash.slice(0, 7)} ${c.message}`).join('\n') || 'version update';
        const currentBranch = getCurrentBranch(projectPath);
        const generated = await generateChangelogFromCommits(id, commitText, currentBranch);
        VersionSummaryModel.upsert({
          versionId: id,
          title: generated.title,
          content: generated.content,
          features: generated.features,
          fixes: generated.fixes,
          changes: generated.improvements,
          breaking: generated.breaking,
          createdBy: 'AI',
        });
        results.push({ versionId: id, success: true });
      } catch (e) {
        results.push({ versionId: id, success: false, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    res.json(success({ total: versionIds.length, results }));
  } catch (err) {
    console.error('Batch summary generation error:', err);
    res.status(500).json(error(500, '批量生成失败'));
  }
});

// POST /api/v1/versions/:id/bump-with-task — Bump version based on task type
router.post('/:id/bump-with-task', async (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { taskType, taskId, taskTitle } = req.body as {
    taskType: string;
    taskId: string;
    taskTitle?: string;
  };

  if (!taskType || !taskId) {
    res.status(400).json(error(400, 'taskType and taskId are required'));
    return;
  }

  if (!isValidSemver(row.version as string)) {
    res.status(400).json(error(400, `Invalid semver: ${row.version}`));
    return;
  }

  const projectPath = (row.projectPath as string) ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);

  const bumpResult = await executeAutoBump({
    versionId: req.params.id,
    currentVersion: row.version as string,
    triggerType: 'manual',
    taskId,
    taskTitle,
    taskType,
    projectPath,
  });

  const performResult = performBump(row.version as string, { taskType, taskId, taskTitle });

  res.json(success({
    version: { id: req.params.id, version: bumpResult.newVersion },
    bump: performResult,
    summary: formatBumpSummary(performResult!),
  }));
});

// POST /api/v1/versions/:id/auto-bump — Manually trigger auto-bump (creates new bumped version)
router.post('/:id/auto-bump', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { bumpType } = req.body as { bumpType?: VersionBumpType };
  const settings = getSettings();
  const type = bumpType || settings.bumpType;

  if (!isValidSemver(row.version as string)) {
    res.status(400).json(error(400, `Invalid semver: ${row.version}`));
    return;
  }

  const prevVersion = row.version as string;
  const newVersionStr = autoBumpVersion(prevVersion, type);
  const tagName = makeTagName(newVersionStr, settings.tagPrefix, settings.customPrefix);

  const newId = `v${Date.now()}`;
  db.prepare(`
    INSERT INTO versions (id, version, branch, summary, created_by, created_at, build_status, tag_created)
    VALUES (?, ?, ?, ?, 'system', datetime('now'), ?, 1)
  `).run(newId, newVersionStr, row.branch as string || 'main', `Auto-bump ${newVersionStr}`, row.build_status as string || 'pending');

  createTagRecord({
    name: tagName,
    versionId: newId,
    versionName: newVersionStr,
    message: `Auto-bump triggered manually (${prevVersion} → ${newVersionStr})`,
    createdBy: 'system',
    commitHash: undefined,
    annotation: undefined,
  });

  res.json(success({
    previousVersion: prevVersion,
    newVersion: { id: newId, version: newVersionStr, status: 'draft', buildStatus: row.build_status },
    bumpType: type,
    tagName,
    autoBumped: true,
  }));
});

// GET /api/v1/versions/:id/bump-preview — Preview what a bump would produce
router.get('/:id/bump-preview', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT version FROM versions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { taskType } = req.query as { taskType?: string };

  if (!isValidSemver(row.version as string)) {
    res.status(400).json(error(400, `Invalid semver: ${row.version}`));
    return;
  }

  const bumpTypes = ['patch', 'minor', 'major'] as const;

  const previews = bumpTypes.map(type => {
    const newVersion = require('../services/semver.js').bumpVersion(row.version as string, type);
    const context = taskType ? { taskType, taskId: 'preview', taskTitle: '预览' } : null;
    const changelog = context ? performBump(row.version as string, context) : null;

    return {
      bumpType: type,
      currentVersion: row.version,
      newVersion: newVersion || row.version,
      isDefault: taskType ? changelog?.bumpType === type : type === 'patch',
      changelog: changelog && changelog.bumpType === type ? changelog.changelog : null,
    };
  });

  res.json(success({
    currentVersion: row.version,
    taskType: taskType || null,
    previews,
  }));
});

export default router;
