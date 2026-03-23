import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { requireProjectAccess } from '../middleware/projectAccess.js';
import { validateIdParam } from '../middleware/validation.js';
import { auditService } from '../services/auditService.js';
import { ScreenshotModel } from '../models/screenshot.js';
import { VersionSummaryModel } from '../models/versionSummary.js';
import { versionRepo } from '../db/repositories/versionRepo.js';
import { getDb } from '../db/sqlite.js';
import { isValidSemver } from '../services/semver.js';
import { createTag } from '../services/gitService.js';
import { createTagRecord } from '../services/tagService.js';
import { onVersionCreated } from '../services/changeTracker.js';
import path from 'path';
import os from 'os';
import versionBuildRouter from './versionBuild.js';
import versionRollbackRouter from './versionRollback.js';
import versionTagRouter from './versionTag.js';
import versionCompareRouter from './versionCompare.js';
import versionScreenshotRouter from './versionScreenshot.js';
import versionSummaryRouter from './versionSummary.js';
import versionBumpRouter from './versionBump.js';
import versionSettingsRouter from './versionSettings.js';
const router = Router();
const idParamSchema = z.string().min(1, 'id is required').max(100).regex(/^[a-zA-Z0-9_-]+$/, 'id contains invalid characters');
function validateId(paramName = 'id') {
    return (req, _res, next) => {
        const result = idParamSchema.safeParse(req.params[paramName]);
        if (!result.success) {
            _res.status(400).json(error(400, `Invalid ${paramName}: ${result.error.errors[0].message}`));
            return;
        }
        next();
    };
}
// GET /api/v1/versions — 列表
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const status = req.query.status;
    const branch = req.query.branch;
    const hasScreenshot = req.query.hasScreenshot;
    const hasSummary = req.query.hasSummary;
    const allRows = await versionRepo.search({ status: status !== 'all' ? status : undefined, branch, limit: 1000 });
    const screenshotIndex = new Map();
    for (const shot of ScreenshotModel.getAllScreenshots()) {
        screenshotIndex.set(shot.versionId, true);
    }
    const summaryIndex = new Set();
    const summaries = await VersionSummaryModel.findAll();
    for (const s of summaries) {
        summaryIndex.add(s.versionId);
    }
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
            tag_created: row.tag_created,
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
router.get('/:id', validateIdParam(), (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const summaryRecord = VersionSummaryModel.findByVersionId(req.params.id);
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
// POST /api/v1/versions — 创建版本
router.post('/', (req, res) => {
    const db = getDb();
    const { version, title, description, status, tags, branch, projectPath } = req.body;
    if (!version || !title) {
        res.status(400).json(error(400, 'version and title are required'));
        return;
    }
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
// PUT /api/v1/versions/:id — 更新版本
router.put('/:id', validateIdParam(), requireAdmin, (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const { description } = req.body;
    if (description !== undefined) {
        db.prepare('UPDATE versions SET summary = ? WHERE id = ?').run(description, req.params.id);
    }
    const updatedRow = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    res.json(success({
        version: {
            id: updatedRow.id,
            version: updatedRow.version,
            title: req.params.id,
            description: description || updatedRow.summary || '',
            status: updatedRow.status || 'draft',
            tags: [],
            branch: updatedRow.branch,
            buildStatus: updatedRow.build_status,
            createdAt: updatedRow.created_at,
            updatedAt: new Date().toISOString(),
        },
    }));
});
// DELETE /api/v1/versions/:id — 删除
router.delete('/:id', validateIdParam(), requireProjectAccess, (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT id, version, created_by FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    auditService.log({
        action: 'version_delete',
        actor: req.user?.id || 'unknown',
        target: req.params.id,
        details: { version: row.version, deletedBy: req.user?.id, originalCreator: row.created_by },
        ipAddress: (req.ip || req.socket.remoteAddress),
        userAgent: req.headers['user-agent'],
    });
    db.prepare('DELETE FROM versions WHERE id = ?').run(req.params.id);
    res.json(success({ deleted: true }));
});
// ========== Aggregate Sub-Routes ==========
router.use('/', versionBuildRouter);
router.use('/', versionRollbackRouter);
router.use('/', versionTagRouter);
router.use('/', versionCompareRouter);
router.use('/', versionScreenshotRouter);
router.use('/', versionSummaryRouter);
router.use('/', versionBumpRouter);
router.use('/', versionSettingsRouter);
export default router;
