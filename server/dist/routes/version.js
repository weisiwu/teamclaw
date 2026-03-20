import { Router } from 'express';
import { success, error } from '../utils/response.js';
import { ScreenshotModel } from '../models/screenshot.js';
import { VersionSummaryModel } from '../models/versionSummary.js';
import { saveScreenshot, deleteScreenshotFile } from '../services/fileStorage.js';
import { generateChangelogFromCommits } from '../services/changelogGenerator.js';
import { onVersionCreated, onScreenshotLinked, onChangelogGenerated } from '../services/changeTracker.js';
import { getGitLog, getTags, createTag, getBranches, getCurrentBranch, createBranch, tagExists } from '../services/gitService.js';
import { runBuild, getBuildConfig } from '../services/buildService.js';
import { listArtifacts, deleteArtifacts, getArtifactInfo, getArtifactStream, importArtifactsFromDir, getArtifactsTotalSize } from '../services/artifactStore.js';
import { rollbackToTag, rollbackToBranch, rollbackToCommit, getRollbackPreview, getRollbackTargets } from '../services/rollbackService.js';
import { compareTwoVersions, quickCompare } from '../services/versionCompare.js';
import { performBump, formatBumpSummary } from '../services/versionBump.js';
import { autoCreateTagForVersion, createTagRecord } from '../services/tagService.js';
import { isValidSemver, bumpVersion } from '../services/semver.js';
import { getDb } from '../db/sqlite.js';
import { runMigrations } from '../db/migrations/run.js';
import { executeAutoBump, getBumpHistory } from '../services/autoBump.js';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
const router = Router();
// Run database migrations on module load
runMigrations();
// ========== In-Memory Storage ==========
const db = getDb();
const settings = {
    autoBump: true,
    bumpType: 'patch',
    autoTag: true,
    tagPrefix: 'v',
    tagOnStatus: ['published'],
};
/** 导出 settings 访问函数（供 autoBump 服务使用） */
export function getVersionSettings() {
    return settings;
}
// Initialize with sample data
const sampleVersions = [
    {
        id: 'v1',
        version: '1.0.0',
        title: '初始版本',
        description: '第一个正式发布版本',
        status: 'published',
        tags: ['stable'],
        gitTag: 'v1.0.0',
        gitTagCreatedAt: '2026-03-01T10:00:00Z',
        buildStatus: 'success',
        artifactUrl: '/builds/v1.0.0.zip',
        releasedAt: '2026-03-01T10:00:00Z',
        createdAt: '2026-03-01T09:00:00Z',
        updatedAt: '2026-03-01T10:00:00Z',
        isMain: true,
        commitCount: 10,
        changedFiles: ['README.md', 'package.json'],
    },
    {
        id: 'v2',
        version: '1.1.0',
        title: '新增用户管理',
        description: '添加完整的用户管理功能',
        status: 'published',
        tags: ['feature'],
        gitTag: 'v1.1.0',
        gitTagCreatedAt: '2026-03-10T14:00:00Z',
        buildStatus: 'success',
        artifactUrl: '/builds/v1.1.0.zip',
        releasedAt: '2026-03-10T14:00:00Z',
        createdAt: '2026-03-10T12:00:00Z',
        updatedAt: '2026-03-10T14:00:00Z',
        isMain: false,
        commitCount: 25,
        changedFiles: ['src/users/*.ts', 'src/auth/*.ts'],
    },
    {
        id: 'v3',
        version: '1.2.0',
        title: '版本管理增强',
        description: '支持自动 Tag 和版本回退',
        status: 'draft',
        tags: ['enhancement'],
        buildStatus: 'pending',
        createdAt: '2026-03-18T08:00:00Z',
        updatedAt: '2026-03-18T08:00:00Z',
        isMain: false,
        commitCount: 5,
        changedFiles: [],
    },
];
// ========== Helper Functions ==========
function autoBumpVersion(currentVersion, bumpType) {
    const match = currentVersion.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
    if (!match)
        return currentVersion;
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
function makeTagName(version, prefix, customPrefix) {
    const prefixMap = {
        v: 'v',
        release: 'release/',
        version: 'version/',
    };
    const p = prefix === 'custom' ? (customPrefix || 'v') : prefixMap[prefix];
    return prefix === 'release' || prefix === 'version' ? `${p}${version}` : `${p}${version}`;
}
// ========== Routes ==========
// GET /api/v1/versions — 列表
router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const status = req.query.status;
    const branch = req.query.branch;
    const hasScreenshot = req.query.hasScreenshot;
    const hasSummary = req.query.hasSummary;
    let sql = 'SELECT * FROM versions WHERE 1=1';
    const params = {};
    if (status && status !== 'all') {
        sql += ' AND status = @status';
        params.status = status;
    }
    if (branch) {
        sql += ' AND branch = @branch';
        params.branch = branch;
    }
    sql += ' ORDER BY created_at DESC';
    // Fetch all rows for in-memory filtering (versions table is typically small)
    const allRows = db.prepare(sql).all(params);
    // Build screenshot index for hasScreenshot filtering
    const screenshotIndex = new Map();
    const screenshotData = ScreenshotModel.getAllScreenshots();
    for (const shot of screenshotData) {
        screenshotIndex.set(shot.versionId, true);
    }
    // Build summary index for hasSummary filtering (SQLite)
    const summaryIndex = new Set();
    const summaryRows = db.prepare('SELECT version_id FROM version_summaries').all();
    for (const row of summaryRows) {
        summaryIndex.add(row.version_id);
    }
    // Apply in-memory filters
    let filteredRows = allRows;
    if (hasScreenshot === 'true') {
        filteredRows = filteredRows.filter(r => screenshotIndex.get(r.id));
    }
    else if (hasScreenshot === 'false') {
        filteredRows = filteredRows.filter(r => !screenshotIndex.get(r.id));
    }
    if (hasSummary === 'true') {
        filteredRows = filteredRows.filter(r => summaryIndex.has(r.id));
    }
    else if (hasSummary === 'false') {
        filteredRows = filteredRows.filter(r => !summaryIndex.has(r.id));
    }
    const total = filteredRows.length;
    const offset = (page - 1) * pageSize;
    const paginatedRows = filteredRows.slice(offset, offset + pageSize);
    const data = paginatedRows.map(row => {
        const summaryRecord = VersionSummaryModel.findByVersionId(row.id);
        return {
            id: row.id,
            version: row.version,
            branch: row.branch,
            summary: row.summary || summaryRecord?.content || undefined,
            summaryGeneratedAt: summaryRecord?.generatedAt || undefined,
            summaryGeneratedBy: summaryRecord?.generatedBy || undefined,
            commit_hash: row.commit_hash,
            created_by: row.created_by,
            created_at: row.created_at,
            build_status: row.build_status,
            tag_created: row.tag_created === 1,
            gitTag: row.git_tag || undefined,
            gitTagCreatedAt: row.git_tag_created_at || undefined,
            hasScreenshot: !!screenshotIndex.get(row.id),
            hasSummary: summaryIndex.has(row.id),
        };
    });
    res.json(success({
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    }));
});
// GET /api/v1/versions/:id — 详情
router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const summaryRecord = VersionSummaryModel.findByVersionId(req.params.id);
    // Check if there's a protected tag for this version
    const tagRow = db.prepare('SELECT protected FROM tags WHERE version_id = ? LIMIT 1').get(req.params.id);
    res.json(success({
        id: row.id,
        version: row.version,
        branch: row.branch,
        commit_hash: row.commit_hash,
        created_by: row.created_by,
        created_at: row.created_at,
        build_status: row.build_status,
        tag_created: row.tag_created === 1,
        tagged: row.tag_created === 1,
        gitTag: row.git_tag || undefined,
        gitTagCreatedAt: row.git_tag_created_at || undefined,
        protected: tagRow ? tagRow.protected === 1 : false,
        hasScreenshot: ScreenshotModel.findByVersionId(req.params.id).length > 0,
        hasSummary: !!summaryRecord,
        summary: summaryRecord?.content || row.summary || undefined,
        summaryGeneratedAt: summaryRecord?.generatedAt || undefined,
        summaryGeneratedBy: summaryRecord?.generatedBy || undefined,
    }));
});
// GET /api/v1/versions/:id/timeline — get full change timeline for a version
router.get('/:id/timeline', (req, res) => {
    const { id } = req.params;
    const row = db.prepare('SELECT id, version FROM versions WHERE id = ?').get(id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    try {
        const { getVersionTimeline } = require('../services/changeTracker.js');
        const events = getVersionTimeline(id);
        res.json(success({
            versionId: id,
            version: row.version,
            events,
        }));
    }
    catch (err) {
        console.error('[version] Timeline fetch error:', err);
        res.status(500).json(error(500, 'Failed to fetch timeline'));
    }
});
// POST /api/v1/versions/:id/events — Add a manual note to the timeline
router.post('/:id/events', (req, res) => {
    const { id: versionId } = req.params;
    const { note, actor, actorId } = req.body;
    if (!note || typeof note !== 'string') {
        res.status(400).json(error(400, 'note is required and must be a string'));
        return;
    }
    const row = db.prepare('SELECT id FROM versions WHERE id = ?').get(versionId);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    try {
        const { onManualNote } = require('../services/changeTracker.js');
        const eventId = onManualNote(versionId, note, actor || 'user', actorId);
        res.json(success({ eventId }));
    }
    catch (err) {
        console.error('[version] Add manual note error:', err);
        res.status(500).json(error(500, 'Failed to add manual note'));
    }
});
// DELETE /api/v1/versions/:id/events/:eventId — Delete a manual note
router.delete('/:id/events/:eventId', (req, res) => {
    const { id: versionId, eventId } = req.params;
    const event = db.prepare('SELECT id, event_type FROM version_change_events WHERE id = ? AND version_id = ?').get(eventId, versionId);
    if (!event) {
        res.status(404).json(error(404, 'Event not found'));
        return;
    }
    if (event.event_type !== 'manual_note') {
        res.status(403).json(error(403, 'Only manual notes can be deleted'));
        return;
    }
    try {
        db.prepare('DELETE FROM version_change_events WHERE id = ?').run(eventId);
        res.json(success({ eventId }));
    }
    catch (err) {
        console.error('[version] Delete event error:', err);
        res.status(500).json(error(500, 'Failed to delete event'));
    }
});
router.post('/', (req, res) => {
    const { version, title, description, status, tags, branch, projectPath } = req.body;
    if (!version || !title) {
        res.status(400).json(error(400, 'version and title are required'));
        return;
    }
    // Semver validation
    if (!isValidSemver(version)) {
        res.status(400).json({ code: 400, message: '无效的版本号格式，需要 semver 如 1.0.0' });
        return;
    }
    const id = `v_${Date.now()}`;
    const now = new Date().toISOString();
    const vBranch = branch || 'main';
    db.prepare(`
    INSERT INTO versions (id, version, branch, summary, created_by, created_at, build_status, tag_created)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)
  `).run(id, version, vBranch, description || '', 'system', now);
    // Auto create git tag — only for official release versions (no pre-release suffix like -alpha, -beta)
    let tagCreated = false;
    let gitTagName;
    const semverReleaseRegex = /^\d+\.\d+\.\d+$/;
    const effectiveProjectPath = projectPath || path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', id);
    if (semverReleaseRegex.test(version)) {
        gitTagName = `v${version}`;
        try {
            tagCreated = createTag(effectiveProjectPath, gitTagName, `Release ${version} - ${title}`);
            if (tagCreated) {
                const tagTime = new Date().toISOString();
                db.prepare('UPDATE versions SET tag_created = 1, git_tag = ?, git_tag_created_at = ? WHERE id = ?').run(gitTagName, tagTime, id);
                // Create tag record in DB via tagService
                createTagRecord({
                    name: gitTagName,
                    versionId: id,
                    versionName: version,
                    message: `Release ${version} - ${title}`,
                    createdBy: 'system',
                    commitHash: undefined,
                    annotation: `Release ${version} - ${title}`,
                });
            }
        }
        catch (err) {
            console.warn('[version] Failed to create git tag:', err);
        }
    }
    else {
        console.log(`[version] Skipping auto-tag for pre-release version: ${version}`);
    }
    // Auto-generate version summary on creation
    try {
        VersionSummaryModel.upsert({
            versionId: id,
            title: title,
            content: description || `Version ${version} created`,
            features: [],
            fixes: [],
            changes: [],
            breaking: [],
            createdBy: 'system',
        });
    }
    catch (err) {
        console.warn('[version] Auto summary generation failed:', err);
    }
    // Record version creation event
    try {
        onVersionCreated(id, 'system');
    }
    catch (err) {
        console.warn('[version] Failed to record creation event:', err);
    }
    res.status(201).json(success({
        id,
        version,
        title,
        description: description || '',
        status: status || 'draft',
        tags: tags || [],
        branch: vBranch,
        buildStatus: 'pending',
        createdAt: now,
        updatedAt: now,
        isMain: false,
        commitCount: 0,
        changedFiles: [],
        tagCreated,
        gitTag: tagCreated ? gitTagName : undefined,
        gitTagCreatedAt: tagCreated ? new Date().toISOString() : undefined,
    }));
});
// PUT /api/v1/versions/:id — 更新版本（含自动 bump 逻辑）
router.put('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const { status, title, description, tags } = req.body;
    const previousStatus = row.status || 'draft';
    const newStatus = status || previousStatus;
    const isPublishing = previousStatus !== 'published' && newStatus === 'published';
    // Auto-bump: when publishing and autoBump is enabled
    if (isPublishing && settings.autoBump) {
        const newVersionStr = autoBumpVersion(row.version, settings.bumpType);
        // Auto-tag
        if (settings.autoTag && settings.tagOnStatus.includes('published')) {
            const tagName = makeTagName(newVersionStr, settings.tagPrefix, settings.customPrefix);
            const projectPath = row.projectPath ||
                path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
            try {
                createTag(projectPath, tagName, `Release ${newVersionStr} - ${title || ''}`);
                db.prepare('UPDATE versions SET tag_created = 1 WHERE id = ?').run(req.params.id);
            }
            catch (err) {
                console.warn('[version] Failed to create git tag on publish:', err);
            }
        }
        db.prepare('UPDATE versions SET version = ?, summary = ?, build_status = ? WHERE id = ?').run(newVersionStr, description || row.summary || '', 'success', req.params.id);
    }
    else {
        // Plain update
        if (description !== undefined) {
            db.prepare('UPDATE versions SET summary = ? WHERE id = ?').run(description, req.params.id);
        }
    }
    const updatedRow = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    res.json(success({
        version: {
            id: updatedRow.id,
            version: updatedRow.version,
            title: title || req.params.id,
            description: description || updatedRow.summary || '',
            status: newStatus,
            tags: tags || [],
            branch: updatedRow.branch,
            buildStatus: updatedRow.build_status,
            createdAt: updatedRow.created_at,
            updatedAt: new Date().toISOString(),
        },
        autoBumped: isPublishing && settings.autoBump,
        bumpedTo: isPublishing && settings.autoBump ? updatedRow.version : undefined,
    }));
});
// DELETE /api/v1/versions/:id — 删除
router.delete('/:id', (req, res) => {
    const row = db.prepare('SELECT id FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    db.prepare('DELETE FROM versions WHERE id = ?').run(req.params.id);
    res.json(success({ deleted: true }));
});
// POST /api/v1/versions/:id/bump — 手动 bump（自动生成摘要）
router.post('/:id/bump', async (req, res) => {
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const { bumpType } = req.body;
    const type = bumpType || settings.bumpType;
    const previousVersion = row.version;
    const newVersion = autoBumpVersion(previousVersion, type);
    db.prepare('UPDATE versions SET version = ? WHERE id = ?').run(newVersion, req.params.id);
    if (settings.autoTag && settings.tagOnStatus.includes('published')) {
        const tagName = makeTagName(newVersion, settings.tagPrefix, settings.customPrefix);
        const projectPath = row.projectPath ||
            path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
        try {
            createTag(projectPath, tagName, `Release ${newVersion}`);
            db.prepare('UPDATE versions SET tag_created = 1 WHERE id = ?').run(req.params.id);
        }
        catch (err) {
            console.warn('[bump] Failed to create git tag:', err);
        }
    }
    // Auto-generate summary after bump
    try {
        const projectPath = row.projectPath ||
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
    }
    catch (e) {
        console.warn('[bump] Auto summary generation failed:', e);
    }
    res.json(success({
        previousVersion,
        newVersion,
        bumpType: type,
        gitTag: makeTagName(newVersion, settings.tagPrefix, settings.customPrefix),
    }));
});
// GET /api/v1/versions/settings — 获取设置
router.get('/settings', (req, res) => {
    res.json(success({ ...settings }));
});
// PUT /api/v1/versions/settings — 更新设置
router.put('/settings', (req, res) => {
    const partial = req.body;
    Object.assign(settings, partial);
    if (partial.autoBump !== undefined || partial.bumpType !== undefined) {
        settings.lastBumpedAt = new Date().toISOString();
    }
    res.json(success({ ...settings }));
});
// POST /api/v1/versions/:id/publish — 发布版本（触发 auto-bump）
router.post('/:id/publish', async (req, res) => {
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const previousVersion = row.version;
    // Auto-bump on publish
    let newVersion = previousVersion;
    let bumped = false;
    if (settings.autoBump) {
        newVersion = autoBumpVersion(previousVersion, settings.bumpType);
        bumped = true;
    }
    let tagCreated = false;
    if (settings.autoTag && settings.tagOnStatus.includes('published')) {
        const tagName = makeTagName(newVersion, settings.tagPrefix, settings.customPrefix);
        const projectPath = row.projectPath ||
            path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
        try {
            tagCreated = createTag(projectPath, tagName, `Release ${newVersion}`);
        }
        catch (err) {
            console.warn('[publish] Failed to create git tag:', err);
        }
    }
    db.prepare('UPDATE versions SET version = ?, build_status = ?, tag_created = ? WHERE id = ?').run(newVersion, 'success', tagCreated ? 1 : 0, req.params.id);
    // Auto-generate version summary on publish
    try {
        const commitLog = row.commit_log || `Version ${newVersion} published`;
        const currentBranch = row.branch || 'main';
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
    }
    catch (err) {
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
// ========== Build Routes ==========
// GET /api/v1/versions/:id/build-config — Get build configuration for a version
router.get('/:id/build-config', (req, res) => {
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    // Project path: data/{versionId}/ or ~/.openclaw/projects/{versionId}/
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    const config = getBuildConfig(projectPath);
    res.json(success(config));
});
// POST /api/v1/versions/:id/build — Trigger a build for a version
router.post('/:id/build', async (req, res) => {
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const { buildCommand, projectPath: explicitPath } = req.body;
    // Default project path
    const projectPath = explicitPath ||
        row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    db.prepare('UPDATE versions SET build_status = ? WHERE id = ?').run('building', req.params.id);
    try {
        const result = await runBuild(projectPath, { buildCommand });
        db.prepare('UPDATE versions SET build_status = ? WHERE id = ?').run(result.success ? 'success' : 'failed', req.params.id);
        // Import artifacts into store
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
        // Auto-bump on build success via shared executeAutoBump()
        let autoBumped = false;
        let bumpedVersionId;
        let bumpedVersionStr;
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
        // Auto-generate version summary on build success
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
// GET /api/v1/versions/:id/artifacts/:artifactPath — Download a specific artifact
router.get('/:id/artifacts/*', (req, res) => {
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
// DELETE /api/v1/versions/:id/artifacts — Delete all artifacts for a version
router.delete('/:id/artifacts', (req, res) => {
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
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const maxCount = parseInt(req.query.maxCount) || 50;
    const branch = req.query.branch;
    // Determine project path
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
// GET /api/v1/versions/:id/git-tags — Get git tags
router.get('/:id/git-tags', (req, res) => {
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    const tags = getTags(projectPath);
    res.json(success({ data: tags, total: tags.length }));
});
// POST /api/v1/versions/:id/git-tags — Create a git tag for a version
router.post('/:id/git-tags', (req, res) => {
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const { tagName, message } = req.body;
    const name = tagName || makeTagName(row.version, settings.tagPrefix, settings.customPrefix);
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    const created = createTag(projectPath, name, message);
    if (created) {
        db.prepare('UPDATE versions SET tag_created = 1 WHERE id = ?').run(req.params.id);
        // 同时在 Tag 生命周期系统中创建记录（+ 实际 git tag 已在上面创建）
        autoCreateTagForVersion(req.params.id, row.version, {
            name,
            message,
            createdBy: 'user',
            projectPath,
        });
    }
    res.json(success({ created, tag: name, tagExists: tagExists(projectPath, name) }));
});
// POST /api/v1/versions/:id/create-tag — Manually trigger tag creation for a version
router.post('/:id/create-tag', (req, res) => {
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const existingTag = row.git_tag;
    if (existingTag) {
        res.status(409).json(error(409, `Version already has a tag: ${existingTag}`));
        return;
    }
    const versionName = row.version;
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    // Use tagService's autoCreateTagForVersion for consistent tagging
    const tagRecord = autoCreateTagForVersion(req.params.id, versionName, {
        projectPath,
        message: `Release ${versionName}`,
        createdBy: 'user',
    });
    if (!tagRecord) {
        res.status(400).json(error(400, 'Tag creation returned null — check if autoTag is enabled in settings'));
        return;
    }
    // Update version record with git_tag info
    db.prepare('UPDATE versions SET tag_created = 1, git_tag = ?, git_tag_created_at = ? WHERE id = ?').run(tagRecord.name, tagRecord.createdAt, req.params.id);
    res.status(201).json(success({
        versionId: req.params.id,
        tagName: tagRecord.name,
        tagRecord,
    }));
});
// In-memory rollback history store (same pattern as tag/tokens modules)
import { RollbackRecordModel } from '../models/rollbackRecord.js';
// ========== Rollback Routes ==========
// In-memory rollback history (same pattern as other modules)
// GET /api/v1/versions/:id/rollback-history — Get rollback history for a version
router.get('/:id/rollback-history', (req, res) => {
    const row = db.prepare('SELECT id FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const history = RollbackRecordModel.findByVersionId(req.params.id);
    res.json(success(history));
});
// GET /api/v1/versions/:id/rollback-targets — Get available rollback targets
router.get('/:id/rollback-targets', (req, res) => {
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    const targets = getRollbackTargets(projectPath);
    res.json(success(targets));
});
// GET /api/v1/versions/:id/rollback-preview — Preview what a rollback would do
router.get('/:id/rollback-preview', (req, res) => {
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const targetRef = req.query.ref;
    if (!targetRef) {
        res.status(400).json(error(400, 'ref query parameter required'));
        return;
    }
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    const preview = getRollbackPreview(projectPath, targetRef);
    res.json(success(preview));
});
// POST /api/v1/versions/:id/rollback — Rollback to a tag, branch, or commit
router.post('/:id/rollback', async (req, res) => {
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const { target, type, createBranch: shouldCreateBranch } = req.body;
    if (!target) {
        res.status(400).json(error(400, 'target is required'));
        return;
    }
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    let result;
    if (type === 'branch') {
        result = rollbackToBranch(projectPath, target, { createBackupBranch: true });
    }
    else if (type === 'commit') {
        result = rollbackToCommit(projectPath, target, { createBranch: shouldCreateBranch, branchName: shouldCreateBranch ? `rollback/${row.version}-${Date.now()}` : undefined });
    }
    else {
        // Default to tag
        result = rollbackToTag(projectPath, target, { createBranch: shouldCreateBranch, branchName: shouldCreateBranch ? `rollback/${row.version}` : undefined });
    }
    // Record in rollback history (DB persistence)
    RollbackRecordModel.create({
        id: `rb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        versionId: req.params.id,
        versionName: row.version,
        targetRef: target,
        targetType: type || 'tag',
        mode: type === 'branch' ? 'checkout' : 'revert',
        previousRef: result.previousRef,
        newBranch: result.newBranch,
        backupCreated: shouldCreateBranch || false,
        success: result.success,
        error: result.error,
        performedBy: 'developer',
        performedAt: new Date().toISOString(),
    });
    // Update version rollback tracking fields (iter75)
    const now = new Date().toISOString();
    db.prepare(`
    UPDATE versions
    SET rollback_count = COALESCE(rollback_count, 0) + 1,
        last_rollback_at = ?
    WHERE id = ?
  `).run(now, req.params.id);
    // Auto-generate version summary on rollback
    try {
        const rollbackMsg = `Rollback to ${target} (${type || 'tag'})`;
        const currentBranch = row.branch || 'main';
        const generated = await generateChangelogFromCommits(req.params.id, rollbackMsg, currentBranch);
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
        db.prepare('UPDATE versions SET summary = ? WHERE id = ?').run(`已回退到 ${target}`, req.params.id);
    }
    catch (err) {
        console.warn('[rollback] Auto summary generation failed:', err);
    }
    // Return enriched response with rollback tracking info (iter75)
    const updated = db.prepare('SELECT rollback_count, last_rollback_at FROM versions WHERE id = ?').get(req.params.id);
    res.json(success({
        ...result,
        rollbackCount: updated?.rollback_count ?? 1,
        lastRollbackAt: updated?.last_rollback_at ?? now,
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
    const row = db.prepare('SELECT id FROM versions WHERE id = ?').get(versionId);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    db.prepare('UPDATE versions SET branch = ? WHERE id = ?').run(branchName, versionId);
    res.json(success({ updated: true, defaultBranch: branchName }));
});
// ========== Screenshot Routes ==========
// GET /api/v1/versions/:id/screenshots - List screenshots for a version
router.get('/:id/screenshots', (req, res) => {
    const { id } = req.params;
    const screenshots = ScreenshotModel.findByVersionId(id);
    res.json(success({ data: screenshots, total: screenshots.length }));
});
// POST /api/v1/versions/:id/screenshots - Upload/link a screenshot
router.post('/:id/screenshots', async (req, res) => {
    try {
        const { id } = req.params;
        const { imageData, messageId, messageContent, senderName, senderAvatar, screenshotUrl, branchName } = req.body;
        let savedUrl = screenshotUrl || '';
        // If imageData is provided (Base64), save to file
        if (imageData) {
            const result = await saveScreenshot(id, imageData);
            savedUrl = result.url;
        }
        const screenshot = ScreenshotModel.create({
            versionId: id,
            messageId,
            messageContent,
            senderName,
            senderAvatar,
            screenshotUrl: savedUrl,
            thumbnailUrl: savedUrl,
            branchName,
        });
        // Record screenshot linked event
        try {
            onScreenshotLinked(id, screenshot.id, senderName || 'system');
        }
        catch (err) {
            console.warn('[version] Failed to record screenshot event:', err);
        }
        res.status(201).json(success(screenshot));
    }
    catch (err) {
        console.error('Screenshot upload error:', err);
        res.status(500).json(error(500, '截图上传失败'));
    }
});
// DELETE /api/v1/versions/:id/screenshots/:screenshotId - Delete a screenshot
router.delete('/:id/screenshots/:screenshotId', async (req, res) => {
    try {
        const { screenshotId } = req.params;
        const screenshot = ScreenshotModel.findById(screenshotId);
        if (!screenshot) {
            res.status(404).json(error(404, '截图不存在'));
            return;
        }
        // Delete file if it's a local file
        if (screenshot.screenshotUrl.startsWith('/screenshots/')) {
            await deleteScreenshotFile(screenshot.versionId, screenshot.screenshotUrl);
        }
        ScreenshotModel.delete(screenshotId);
        res.json(success({ deleted: true }));
    }
    catch (err) {
        console.error('Screenshot delete error:', err);
        res.status(500).json(error(500, '截图删除失败'));
    }
});
// ========== Changelog/Summary Routes ==========
// GET /api/v1/versions/:id/summary - Get changelog summary for a version
router.get('/:id/summary', (req, res) => {
    const { id } = req.params;
    const summary = VersionSummaryModel.findByVersionId(id);
    if (!summary) {
        res.status(404).json(error(404, '变更摘要不存在'));
        return;
    }
    res.json(success(summary));
});
// POST /api/v1/versions/:id/summary - Create or update changelog summary
router.post('/:id/summary', (req, res) => {
    try {
        const { id } = req.params;
        const { content, features, changes, fixes, breaking, createdBy } = req.body;
        const existing = VersionSummaryModel.findByVersionId(id);
        let summary;
        if (existing) {
            summary = VersionSummaryModel.update(id, { content, features, changes, fixes, breaking });
        }
        else {
            summary = VersionSummaryModel.create({
                versionId: id,
                content: content || '',
                features: features || [],
                changes: changes || [],
                fixes: fixes || [],
                breaking: breaking || [],
                createdBy: createdBy || 'system',
            });
        }
        res.json(success(summary));
    }
    catch (err) {
        console.error('Summary save error:', err);
        res.status(500).json(error(500, '变更摘要保存失败'));
    }
});
// PUT /api/v1/versions/:id/summary - Update changelog summary
router.put('/:id/summary', (req, res) => {
    try {
        const { id } = req.params;
        const { content, features, changes, fixes, breaking } = req.body;
        const existing = VersionSummaryModel.findByVersionId(id);
        if (!existing) {
            res.status(404).json(error(404, '变更摘要不存在'));
            return;
        }
        const summary = VersionSummaryModel.update(id, { content, features, changes, fixes, breaking });
        // Also sync summary to versions DB table
        if (content !== undefined) {
            db.prepare('UPDATE versions SET summary = ? WHERE id = ?').run(content, id);
        }
        res.json(success(summary));
    }
    catch (err) {
        console.error('Summary update error:', err);
        res.status(500).json(error(500, '变更摘要更新失败'));
    }
});
// DELETE /api/v1/versions/:id/summary - Delete changelog summary
router.delete('/:id/summary', (req, res) => {
    const { id } = req.params;
    const deleted = VersionSummaryModel.delete(id);
    res.json(success({ deleted }));
});
// POST /api/v1/versions/:id/summary/generate - Generate changelog from commits via AI
router.post('/:id/summary/generate', async (req, res) => {
    try {
        const { id } = req.params;
        const { commitLog, branchName } = req.body;
        // Generate via AI (or fallback rule-based)
        const generated = await generateChangelogFromCommits(id, commitLog || 'feat: initial implementation\nfix: bug fixes', branchName);
        const summary = VersionSummaryModel.upsert({
            versionId: id,
            title: generated.title,
            content: generated.content,
            features: generated.features,
            fixes: generated.fixes,
            changes: generated.improvements,
            breaking: generated.breaking,
            createdBy: 'AI',
        });
        // Also sync summary to versions DB table
        db.prepare('UPDATE versions SET summary = ? WHERE id = ?').run(generated.content, id);
        // Record changelog generated event
        try {
            const entryCount = (generated.features?.length || 0) + (generated.fixes?.length || 0) + (generated.improvements?.length || 0);
            onChangelogGenerated(id, summary.id, entryCount);
        }
        catch (err) {
            console.warn('[version] Failed to record changelog event:', err);
        }
        res.json(success(summary));
    }
    catch (err) {
        console.error('Changelog generation error:', err);
        res.status(500).json(error(500, '变更摘要生成失败'));
    }
});
// POST /api/v1/versions/:id/summary/refresh - Re-generate and save summary to Version model
router.post('/:id/summary/refresh', async (req, res) => {
    try {
        const { id } = req.params;
        const row = db.prepare('SELECT id, version FROM versions WHERE id = ?').get(id);
        if (!row) {
            res.status(404).json(error(404, 'Version not found'));
            return;
        }
        const { commitLog, branchName } = req.body;
        const generated = await generateChangelogFromCommits(id, commitLog || row.version || '', branchName);
        const summary = VersionSummaryModel.upsert({
            versionId: id,
            title: generated.title,
            content: generated.content,
            features: generated.features,
            fixes: generated.fixes,
            changes: generated.improvements,
            breaking: generated.breaking,
            createdBy: 'AI',
        });
        // Update versions DB table with latest summary
        db.prepare('UPDATE versions SET summary = ? WHERE id = ?').run(generated.content, id);
        res.json(success({
            ...summary,
            versionSummary: generated.content,
            versionSummaryGeneratedAt: new Date().toISOString(),
            versionSummaryGeneratedBy: 'AI',
        }));
    }
    catch (err) {
        console.error('Summary refresh error:', err);
        res.status(500).json(error(500, '摘要刷新失败'));
    }
});
// GET /api/v1/versions/:id/summary/status — Check if summary exists
router.get('/:id/summary/status', (req, res) => {
    const row = db.prepare('SELECT id FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const summary = VersionSummaryModel.findByVersionId(req.params.id);
    res.json(success({
        hasSummary: !!summary,
        generatedAt: summary?.generatedAt || null,
        generatedBy: summary?.generatedBy || null,
    }));
});
// GET /api/v1/versions/:id/timeline — 获取版本变更时间线
router.get('/:id/timeline', (req, res) => {
    const { id: versionId } = req.params;
    const row = db.prepare('SELECT id, version, created_at FROM versions WHERE id = ?').get(versionId);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    // 获取截图记录
    const screenshots = ScreenshotModel.findByVersionId(versionId);
    // 获取摘要记录
    const summary = VersionSummaryModel.findByVersionId(versionId);
    const events = [];
    // 版本创建 event
    events.push({
        id: `version-created-${versionId}`,
        type: 'version_created',
        title: '版本创建',
        description: `版本 ${row.version} 已创建`,
        timestamp: row.created_at,
    });
    // 截图关联 events
    for (const shot of screenshots) {
        events.push({
            id: `screenshot-linked-${shot.id}`,
            type: 'screenshot_linked',
            title: '截图关联',
            description: `${shot.senderName}：${shot.messageContent.substring(0, 50)}...`,
            timestamp: shot.createdAt,
            actor: shot.senderName,
            screenshotId: shot.id,
        });
    }
    // 摘要生成 event
    if (summary) {
        events.push({
            id: `changelog-generated-${summary.id}`,
            type: 'changelog_generated',
            title: '变更摘要生成',
            description: `${summary.generatedBy === 'AI' ? 'AI' : '手动'}生成了包含 ${summary.features?.length || 0} 个新功能的变更摘要`,
            timestamp: summary.generatedAt,
            actor: summary.generatedBy,
            summaryId: summary.id,
        });
    }
    // 按时间倒序
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(success({
        versionId,
        version: row.version,
        events,
    }));
});
// GET /api/v1/versions/:id/bump-history — Get bump history for a version
router.get('/:id/bump-history', (req, res) => {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
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
router.post('/summary/batch-generate', async (req, res) => {
    try {
        const { versionIds } = req.body;
        if (!Array.isArray(versionIds) || versionIds.length === 0) {
            res.status(400).json(error(400, 'versionIds must be a non-empty array'));
            return;
        }
        const results = [];
        for (const id of versionIds) {
            const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(id);
            if (!row) {
                results.push({ versionId: id, success: false, error: 'Version not found' });
                continue;
            }
            try {
                const projectPath = row.projectPath ||
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
            }
            catch (e) {
                results.push({ versionId: id, success: false, error: e instanceof Error ? e.message : 'Unknown error' });
            }
        }
        res.json(success({ total: versionIds.length, results }));
    }
    catch (err) {
        console.error('Batch summary generation error:', err);
        res.status(500).json(error(500, '批量生成失败'));
    }
});
export default router;
// ========== Version Compare Routes ==========
// GET /api/v1/versions/compare — Compare two versions
router.get('/compare', async (req, res) => {
    const { from, to, fromId, toId } = req.query;
    if (!from || !to) {
        res.status(400).json(error(400, 'from and to query parameters are required'));
        return;
    }
    try {
        const result = await compareTwoVersions(fromId || from, toId || to, from, to);
        res.json(success(result));
    }
    catch (err) {
        console.error('Version compare error:', err);
        res.status(500).json(error(500, `版本对比失败: ${err instanceof Error ? err.message : String(err)}`));
    }
});
// GET /api/v1/versions/compare/quick — Quick diff summary
router.get('/compare/quick', async (req, res) => {
    const { from, to, fromId, toId } = req.query;
    if (!from || !to) {
        res.status(400).json(error(400, 'from and to query parameters are required'));
        return;
    }
    try {
        const result = await quickCompare(fromId || from, toId || to, from, to);
        res.json(success(result));
    }
    catch (err) {
        res.status(500).json(error(500, `快速对比失败: ${err instanceof Error ? err.message : String(err)}`));
    }
});
// POST /api/v1/versions/:id/bump-with-task — Bump version based on task type
router.post('/:id/bump-with-task', async (req, res) => {
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const { taskType, taskId, taskTitle } = req.body;
    if (!taskType || !taskId) {
        res.status(400).json(error(400, 'taskType and taskId are required'));
        return;
    }
    if (!isValidSemver(row.version)) {
        res.status(400).json(error(400, `Invalid semver: ${row.version}`));
        return;
    }
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    // Use shared executeAutoBump for consistency
    const bumpResult = await executeAutoBump({
        versionId: req.params.id,
        currentVersion: row.version,
        triggerType: 'manual',
        taskId,
        taskTitle,
        taskType,
        projectPath,
    });
    // Build changelog summary using existing performBump logic
    const performResult = performBump(row.version, { taskType, taskId, taskTitle });
    res.json(success({
        version: { id: req.params.id, version: bumpResult.newVersion },
        bump: performResult,
        summary: formatBumpSummary(performResult),
    }));
});
// POST /api/v1/versions/:id/auto-bump — Manually trigger auto-bump (creates new bumped version)
router.post('/:id/auto-bump', (req, res) => {
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const { bumpType } = req.body;
    const type = bumpType || settings.bumpType;
    if (!isValidSemver(row.version)) {
        res.status(400).json(error(400, `Invalid semver: ${row.version}`));
        return;
    }
    const prevVersion = row.version;
    const newVersionStr = autoBumpVersion(prevVersion, type);
    const tagName = makeTagName(newVersionStr, settings.tagPrefix, settings.customPrefix);
    // Create new version record in DB
    const newId = `v${Date.now()}`;
    db.prepare(`
    INSERT INTO versions (id, version, branch, summary, created_by, created_at, build_status, tag_created)
    VALUES (?, ?, ?, ?, 'system', datetime('now'), ?, 1)
  `).run(newId, newVersionStr, row.branch || 'main', `Auto-bump ${newVersionStr}`, row.build_status || 'pending');
    // Create Tag record
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
router.get('/:id/bump-preview', (req, res) => {
    const row = db.prepare('SELECT version FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const { taskType } = req.query;
    if (!isValidSemver(row.version)) {
        res.status(400).json(error(400, `Invalid semver: ${row.version}`));
        return;
    }
    // Default bump types to preview
    const bumpTypes = ['patch', 'minor', 'major'];
    const previews = bumpTypes.map(type => {
        const newVersion = bumpVersion(row.version, type);
        const context = taskType ? { taskType, taskId: 'preview', taskTitle: '预览' } : null;
        const changelog = context ? performBump(row.version, context) : null;
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
// ========== Version Vector Store (ChromaDB) ==========
import { storeVersionVector, searchSimilarVersions, deleteVersionVector } from '../services/versionVectorStore.js';
import { generateVersionChangelog, saveChangelog, loadChangelog, getFileChanges } from '../services/changeTracker.js';
// POST /api/v1/versions/:id/vector — Store version summary in ChromaDB vector store
router.post('/:id/vector', async (req, res) => {
    try {
        const { id } = req.params;
        const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(id);
        if (!row) {
            res.status(404).json(error(404, 'Version not found'));
            return;
        }
        const entry = {
            versionId: id,
            versionTag: row.version,
            summary: row.summary || '',
            commits: JSON.parse(row.commits || '[]'),
            relatedTasks: JSON.parse(row.related_tasks || '[]'),
            createdAt: row.created_at,
            tokenUsed: row.token_used || 0
        };
        await storeVersionVector(entry);
        res.json(success({ stored: true, versionId: id }));
    }
    catch (err) {
        console.error('[vector] Store error:', err);
        res.status(500).json(error(500, '向量存储失败'));
    }
});
// GET /api/v1/versions/:id/vector/search — Search similar versions by natural language
router.get('/vector/search', async (req, res) => {
    try {
        const { q, limit } = req.query;
        if (!q) {
            res.status(400).json(error(400, 'Missing query parameter: q'));
            return;
        }
        const results = await searchSimilarVersions(q, parseInt(limit || '5', 10));
        res.json(success({ results }));
    }
    catch (err) {
        console.error('[vector] Search error:', err);
        res.status(500).json(error(500, '向量搜索失败'));
    }
});
// DELETE /api/v1/versions/:id/vector — Delete version from vector store
router.delete('/:id/vector', async (req, res) => {
    try {
        await deleteVersionVector(req.params.id);
        res.json(success({ deleted: true }));
    }
    catch (err) {
        console.error('[vector] Delete error:', err);
        res.status(500).json(error(500, '向量删除失败'));
    }
});
// GET /api/v1/versions/:id/changelog — Generate and return version changelog
router.get('/:id/changelog', async (req, res) => {
    try {
        const { id } = req.params;
        const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(id);
        if (!row) {
            res.status(404).json(error(404, 'Version not found'));
            return;
        }
        const versionTag = row.version;
        const projectPath = row.project_path ||
            path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', id);
        const relatedTasks = JSON.parse(row.related_tasks || '[]');
        const result = await generateVersionChangelog(projectPath, versionTag, relatedTasks);
        // Auto-save to disk
        saveChangelog(versionTag, result.markdown);
        res.json(success(result));
    }
    catch (err) {
        console.error('[changelog] Generate error:', err);
        res.status(500).json(error(500, '变更日志生成失败'));
    }
});
// GET /api/v1/versions/:id/changelog/file — Get saved changelog markdown from disk
router.get('/:id/changelog/file', (req, res) => {
    const { id } = req.params;
    const row = db.prepare('SELECT version FROM versions WHERE id = ?').get(id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const versionTag = row.version;
    const saved = loadChangelog(versionTag);
    if (saved) {
        res.json(success({ markdown: saved, source: 'file' }));
    }
    else {
        res.status(404).json(error(404, 'Changelog file not found'));
    }
});
// GET /api/v1/versions/:id/file-changes — Get changed files for a version
router.get('/:id/file-changes', (req, res) => {
    try {
        const { id } = req.params;
        const { from, to } = req.query;
        const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(id);
        if (!row) {
            res.status(404).json(error(404, 'Version not found'));
            return;
        }
        const projectPath = row.project_path ||
            path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', id);
        const versionTag = row.version;
        const fromRef = from || `${versionTag}~5`;
        const toRef = to || versionTag;
        const changes = getFileChanges(projectPath, fromRef, toRef);
        res.json(success({ changes, from: fromRef, to: toRef }));
    }
    catch (err) {
        console.error('[file-changes] Error:', err);
        res.status(500).json(error(500, '文件变更获取失败'));
    }
});
// GET /api/v1/versions/change-stats — Get change stats summary for a tag
router.get('/change-stats', (req, res) => {
    try {
        const { tag } = req.query;
        if (!tag) {
            res.status(400).json(error(400, 'tag parameter required'));
            return;
        }
        const projectPath = process.env.TEAMCLAW_PROJECT_PATH || '';
        // Get commits between this tag and previous tag
        let commitCount = 0;
        let changeTypes = { feat: 0, fix: 0, docs: 0, style: 0, refactor: 0, perf: 0, ci: 0, test: 0, chore: 0, other: 0 };
        let totalAdditions = 0;
        let totalDeletions = 0;
        const topFiles = [];
        try {
            // Get commits for this tag
            const logOutput = execSync(`git log ${tag}~10..${tag} --pretty=format:"%s" 2>/dev/null`, { cwd: projectPath, encoding: 'utf-8', timeout: 10000 });
            const subjects = (logOutput || '').split('\n').filter(Boolean);
            commitCount = subjects.length;
            for (const subject of subjects) {
                const m = subject.match(/^(\w+)[\(:]/);
                const type = m ? m[1].toLowerCase() : null;
                if (type && type in changeTypes) {
                    changeTypes[type]++;
                }
                else {
                    changeTypes.other++;
                }
            }
            // Get file changes summary
            const diffOutput = execSync(`git diff --numstat ${tag}~10..${tag} 2>/dev/null`, { cwd: projectPath, encoding: 'utf-8', timeout: 10000 });
            const lines = (diffOutput || '').trim().split('\n').filter(Boolean);
            for (const line of lines) {
                const parts = line.split('\t');
                if (parts.length >= 3) {
                    const adds = parseInt(parts[0], 10) || 0;
                    const dels = parseInt(parts[1], 10) || 0;
                    totalAdditions += adds;
                    totalDeletions += dels;
                    topFiles.push({ path: parts.slice(2).join('\t'), additions: adds, deletions: dels });
                }
            }
            // Sort by total changes and take top 5
            topFiles.sort((a, b) => (b.additions + b.deletions) - (a.additions + a.deletions));
            topFiles.splice(5);
        }
        catch {
            // Git operations may fail for some tags - return partial data
        }
        res.json(success({
            tagName: tag,
            commitCount,
            fileCount: topFiles.length,
            totalAdditions,
            totalDeletions,
            changeTypes,
            topFiles,
        }));
    }
    catch (err) {
        console.error('[change-stats] Error:', err);
        res.status(500).json(error(500, '获取变更统计失败'));
    }
});
