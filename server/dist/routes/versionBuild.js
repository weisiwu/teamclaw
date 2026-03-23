import { Router } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { getDb } from '../db/sqlite.js';
import { VersionSummaryModel } from '../models/versionSummary.js';
import { runBuild, getBuildConfig } from '../services/buildService.js';
import { listArtifacts, deleteArtifacts, getArtifactInfo, getArtifactStream, importArtifactsFromDir, getArtifactsTotalSize } from '../services/artifactStore.js';
import { executeAutoBump } from '../services/autoBump.js';
import { getSettings } from '../services/versionSettingsStore.js';
import { getGitLog, getTags, getBranches, getCurrentBranch, createBranch } from '../services/gitService.js';
import path from 'path';
import os from 'os';
const router = Router();
// GET /api/v1/versions/:id/build-config — Get build configuration for a version
router.get('/:id/build-config', (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    const config = getBuildConfig(projectPath);
    res.json(success(config));
});
// POST /api/v1/versions/:id/build — Trigger a build for a version
router.post('/:id/build', async (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const { buildCommand, projectPath: explicitPath } = req.body;
    const projectPath = explicitPath ||
        row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    db.prepare('UPDATE versions SET build_status = ? WHERE id = ?').run('building', req.params.id);
    try {
        const result = await runBuild(projectPath, { buildCommand });
        db.prepare('UPDATE versions SET build_status = ? WHERE id = ?').run(result.success ? 'success' : 'failed', req.params.id);
        let artifactCount = 0;
        let artifactUrl;
        if (result.success && result.artifacts.length > 0) {
            for (const artifact of result.artifacts) {
                const srcPath = path.join(projectPath, artifact.path);
                await importArtifactsFromDir(req.params.id, row.version, path.dirname(srcPath));
                artifactCount++;
            }
            artifactUrl = `/artifacts/${req.params.id}/${row.version}`;
        }
        let autoBumped = false;
        let bumpedVersionId;
        let bumpedVersionStr;
        const settings = getSettings();
        if (result.success && settings.autoBump) {
            try {
                const bumpResult = await executeAutoBump({
                    versionId: req.params.id,
                    currentVersion: row.version,
                    triggerType: 'build_success',
                    projectPath,
                });
                autoBumped = bumpResult.success;
                bumpedVersionId = bumpResult.newVersionId;
                bumpedVersionStr = bumpResult.newVersion;
            }
            catch (err) {
                console.warn('[build] executeAutoBump failed:', err);
            }
        }
        if (result.success) {
            try {
                const title = row.title || `v${row.version}`;
                VersionSummaryModel.upsert({
                    versionId: req.params.id,
                    title,
                    content: `Build successful for v${row.version}`,
                    features: [],
                    fixes: [],
                    changes: [],
                    breaking: [],
                    createdBy: 'system',
                });
            }
            catch (err) {
                console.warn('[build] Auto summary generation failed:', err);
            }
        }
        res.json(success({
            success: result.success,
            duration: result.duration,
            command: result.command,
            exitCode: result.exitCode,
            artifactCount,
            artifactsUrl: artifactUrl,
            outputExcerpt: result.output.slice(-2000),
            errorOutput: result.errorOutput.slice(-2000),
            autoBumped,
            bumpedVersion: bumpedVersionId ? { id: bumpedVersionId, version: bumpedVersionStr } : undefined,
        }));
    }
    catch (err) {
        db.prepare('UPDATE versions SET build_status = ? WHERE id = ?').run('failed', req.params.id);
        res.status(500).json(error(500, `Build failed: ${err instanceof Error ? err.message : String(err)}`));
    }
});
// GET /api/v1/versions/:id/artifacts — List build artifacts
router.get('/:id/artifacts', (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT id, version FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const artifacts = listArtifacts(req.params.id, row.version);
    const totalSize = getArtifactsTotalSize(req.params.id, row.version);
    res.json(success({
        data: artifacts,
        total: artifacts.length,
        totalSize,
        downloadRoot: `/artifacts/${req.params.id}/${row.version}`,
    }));
});
// GET /api/v1/versions/:id/artifacts/* — Download a specific artifact
router.get('/:id/artifacts/*', (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT id, version FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const artifactPath = req.params[0] || '';
    const info = getArtifactInfo(req.params.id, row.version, artifactPath);
    if (!info || !info.exists) {
        res.status(404).json(error(404, 'Artifact not found'));
        return;
    }
    const artifactStream = getArtifactStream(req.params.id, row.version, artifactPath);
    if (!artifactStream) {
        res.status(404).json(error(404, 'Unable to read artifact'));
        return;
    }
    res.setHeader('Content-Disposition', `attachment; filename="${info.name}"`);
    res.setHeader('Content-Length', info.size);
    res.setHeader('Content-Type', 'application/octet-stream');
    artifactStream.stream.pipe(res);
});
// DELETE /api/v1/versions/:id/artifacts — Delete all artifacts for a version（仅管理员）
router.delete('/:id/artifacts', requireAdmin, (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT id, version FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const deleted = deleteArtifacts(req.params.id, row.version);
    db.prepare('UPDATE versions SET build_status = ? WHERE id = ?').run('pending', req.params.id);
    res.json(success({ deleted }));
});
// ========== Git Log Routes ==========
// GET /api/v1/versions/:id/git-log — Get git commit history
router.get('/:id/git-log', (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const maxCount = parseInt(req.query.maxCount) || 50;
    const branch = req.query.branch;
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    const tagName = `v${row.version}`;
    const commits = getGitLog(projectPath, { maxCount, branch: branch || tagName });
    const currentBranch = getCurrentBranch(projectPath);
    const tags = getTags(projectPath);
    res.json(success({
        commits,
        currentBranch,
        tags: tags.slice(0, 20),
        total: commits.length,
    }));
});
// ========== Branch Routes (top-level) ==========
// GET /api/v1/branches — List branches for a project version
router.get('/branches', (req, res) => {
    const versionId = req.query.versionId;
    if (!versionId) {
        res.status(400).json(error(400, 'versionId query parameter required'));
        return;
    }
    const db = getDb();
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(versionId);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', versionId);
    const branches = getBranches(projectPath);
    const currentBranch = getCurrentBranch(projectPath);
    res.json(success({
        data: branches,
        total: branches.length,
        currentBranch,
    }));
});
// POST /api/v1/branches — Create a new branch
router.post('/branches', (req, res) => {
    const { versionId, branchName, baseRef } = req.body;
    if (!versionId || !branchName) {
        res.status(400).json(error(400, 'versionId and branchName are required'));
        return;
    }
    const db = getDb();
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(versionId);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', versionId);
    const created = createBranch(projectPath, branchName, baseRef);
    if (created) {
        res.status(201).json(success({ created: true, branchName, baseRef: baseRef || 'HEAD' }));
    }
    else {
        res.status(500).json(error(500, `Failed to create branch ${branchName}`));
    }
});
// PUT /api/v1/branches/primary — Set primary/default branch
router.put('/branches/primary', (req, res) => {
    const { versionId, branchName } = req.body;
    if (!versionId || !branchName) {
        res.status(400).json(error(400, 'versionId and branchName are required'));
        return;
    }
    const db = getDb();
    const row = db.prepare('SELECT id FROM versions WHERE id = ?').get(versionId);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    db.prepare('UPDATE versions SET branch = ? WHERE id = ?').run(branchName, versionId);
    res.json(success({ updated: true, defaultBranch: branchName }));
});
export default router;
