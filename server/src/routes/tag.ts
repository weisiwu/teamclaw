// Tag 生命周期管理 API 路由
// 提供标签的 CRUD、归档、保护、配置等 API

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { auditService } from '../services/auditService.js';
import { getTags as gitGetTags, createTag as gitCreateTag, getTagDetails } from '../services/gitService.js';
import {
  getAllTagRecords,
  getTagRecord,
  getTagsByVersionId,
  createTagRecord,
  updateTagRecord,
  deleteTagRecord,
  archiveTag,
  protectTag,
  getTagConfig,
  updateTagConfig,
  getTagByName,
  deleteTagByName,
  makeTagName,
  shouldAutoTag,
  autoCreateTagForVersion,
  renameTag,
  removeTag,
} from '../services/tagService.js';
import { ScreenshotModel } from '../models/screenshot.js';
import { getDb } from '../db/sqlite.js';

const router = Router();

// Default project path for git tag operations
const DEFAULT_PROJECT_PATH = process.env.TEAMCLAW_PROJECT_PATH || '';

// ========== Tag 记录 CRUD ==========

// GET /api/v1/tags — 获取所有标签记录（从 git + DB 合并）
router.get('/', (req: Request, res: Response) => {
  const { versionId, archived, protected: isProtected, source, page, pageSize, projectPath: reqProjectPath } = req.query;

  // Get git tags from project path
  const projectPath = (reqProjectPath as string) || DEFAULT_PROJECT_PATH;
  let gitTags: Array<{ name: string; commit: string; date: string; message?: string }> = [];
  if (projectPath) {
    gitTags = gitGetTags(projectPath);
  }

  // Get DB tag records for protected marks and source info
  const dbTags = getAllTagRecords();
  const protectedMap = new Map<string, boolean>();
  const sourceMap = new Map<string, 'auto' | 'manual'>();
  for (const t of dbTags) {
    protectedMap.set(t.name, t.protected);
    sourceMap.set(t.name, t.source);
  }

  // Build screenshot and changelog indexes by versionId (iter69-change-tracking)
  const screenshotIndex = new Set<string>();
  for (const shot of ScreenshotModel.getAllScreenshots()) {
    screenshotIndex.add(shot.versionId);
  }
  const db = getDb();
  const summaryRows = db.prepare('SELECT version_id FROM version_summaries').all() as Array<{ version_id: string }>;
  const summaryIndex = new Set<string>();
  for (const row of summaryRows) {
    summaryIndex.add(row.version_id);
  }

  // Build versionId map: tagName -> versionId from DB records
  const tagVersionIdMap = new Map<string, string>();
  for (const t of dbTags) {
    tagVersionIdMap.set(t.name, t.versionId);
  }

  // Merge: git tags + protected from DB + screenshot/changelog status (iter69-change-tracking)
  const mergedTags = gitTags.map(t => {
    const versionId = tagVersionIdMap.get(t.name);
    return {
      name: t.name,
      commit: t.commit,
      date: t.date,
      annotation: t.message,
      hasRecord: protectedMap.has(t.name),
      protected: protectedMap.get(t.name) || false,
      source: sourceMap.get(t.name) || 'manual' as 'auto' | 'manual',
      hasScreenshot: versionId ? screenshotIndex.has(versionId) : false,
      hasChangelog: versionId ? summaryIndex.has(versionId) : false,
    };
  });

  // Apply filters
  let tags = mergedTags;

  if (isProtected !== undefined) {
    const isProt = isProtected === 'true';
    tags = tags.filter(t => t.protected === isProt);
  }

  if (source !== undefined && source !== 'all') {
    tags = tags.filter(t => t.source === source);
  }

  // Filter by hasScreenshot / hasChangelog (iter69-change-tracking)
  if (req.query.hasScreenshot === 'true') {
    tags = tags.filter(t => t.hasScreenshot === true);
  } else if (req.query.hasScreenshot === 'false') {
    tags = tags.filter(t => t.hasScreenshot === false);
  }
  if (req.query.hasChangelog === 'true') {
    tags = tags.filter(t => t.hasChangelog === true);
  } else if (req.query.hasChangelog === 'false') {
    tags = tags.filter(t => t.hasChangelog === false);
  }

  const total = tags.length;

  // 分页
  const p = parseInt(page as string) || 1;
  const ps = parseInt(pageSize as string) || 50;
  const start = (p - 1) * ps;
  const data = tags.slice(start, start + ps);

  res.json(success({
    data,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
  }));
});

// GET /api/v1/tags/:tagName — 获取单个标签详情
router.get('/:tagName', (req: Request, res: Response) => {
  const { tagName } = req.params;
  const { projectPath: reqProjectPath } = req.query;

  const projectPath = (reqProjectPath as string) || DEFAULT_PROJECT_PATH;

  // Get git tag basic info
  let tagInfo: { name: string; commit: string; date: string; message?: string } | undefined;
  if (projectPath) {
    const allGitTags = gitGetTags(projectPath);
    tagInfo = allGitTags.find(t => t.name === tagName);
  }

  // Get detailed git tag info (author, message, annotation)
  const tagDetails = projectPath ? getTagDetails(projectPath, tagName) : null;

  // Check DB for protected and record info
  const dbRecord = getTagByName(tagName);

  if (!tagInfo && !dbRecord) {
    res.status(404).json(error(404, 'Tag not found'));
    return;
  }

  res.json(success({
    name: tagName,
    commit: tagInfo?.commit || dbRecord?.commitHash || tagDetails?.commit || '',
    date: tagInfo?.date || dbRecord?.createdAt || tagDetails?.date || '',
    message: tagDetails?.message || tagInfo?.message || dbRecord?.message || '',
    author: tagDetails?.author || null,
    authorEmail: tagDetails?.authorEmail || null,
    taggerDate: tagDetails?.taggerDate || null,
    hasRecord: !!dbRecord,
    protected: dbRecord?.protected || false,
    annotation: tagInfo?.message || dbRecord?.annotation || '',
    source: dbRecord?.source || 'manual',
  }));
});

// POST /api/v1/tags — 手动创建标签（创建 git tag + DB 记录）
router.post('/', (req: Request, res: Response) => {
  const { name, versionId, versionName, message, commitHash, createdBy, projectPath: reqProjectPath } = req.body as {
    name?: string;
    versionId: string;
    versionName: string;
    message?: string;
    commitHash?: string;
    createdBy?: string;
    projectPath?: string;
  };

  if (!versionId || !versionName) {
    res.status(400).json(error(400, 'versionId and versionName are required'));
    return;
  }

  const projectPath = reqProjectPath || DEFAULT_PROJECT_PATH;
  const tagName = name || makeTagName(versionName, getTagConfig().tagPrefix, getTagConfig().customPrefix);

  // 检查是否已存在
  const existing = getTagByName(tagName);
  if (existing) {
    res.status(409).json(error(409, `Tag ${tagName} already exists`));
    return;
  }

  // 创建 git tag
  let gitTagCreated = false;
  if (projectPath) {
    try {
      gitTagCreated = gitCreateTag(projectPath, tagName, message || `Release ${versionName}`);
    } catch (err) {
      console.warn('[tag] Failed to create git tag:', err);
    }
  }

  // 创建 DB 记录
  const record = createTagRecord({
    name: tagName,
    versionId,
    versionName,
    message: message || `Release ${versionName}`,
    commitHash,
    createdBy,
    annotation: message || `Version ${versionName}`,
  });

  res.status(201).json(success({ ...record, gitTagCreated }));
});

// DELETE /api/v1/tags/:tagName — 删除标签（同时删除 git tag，仅管理员）
router.delete('/:tagName', requireAdmin, (req: Request, res: Response) => {
  const { tagName } = req.params;
  const { projectPath: reqProjectPath } = req.body as { projectPath?: string } || {};

  const projectPath = reqProjectPath || DEFAULT_PROJECT_PATH;

  const record = getTagByName(tagName);
  if (!record) {
    // 如果 DB 没有记录，仍尝试删除 git tag
    if (projectPath) {
      try {
        const { deleteTag } = require('../services/gitService.js');
        deleteTag(projectPath, tagName);
      } catch (err) {
        console.warn('[tag] Failed to delete git tag:', err);
      }
    }
    res.status(404).json(error(404, 'Tag not found'));
    return;
  }

  if (record.protected) {
    res.status(403).json(error(403, '受保护的 tag 不可删除', 'FORBIDDEN'));
    return;
  }

  const deleted = removeTag(record.id, { projectPath });

  // 审计日志
  auditService.log({
    action: 'tag_delete',
    actor: (req.headers['x-user-id'] as string) || 'unknown',
    target: tagName,
    ipAddress: (req.ip || req.socket.remoteAddress) as string | undefined,
    userAgent: req.headers['user-agent'] as string | undefined,
  });

  res.json(success({ deleted }));
});

// PUT /api/v1/tags/:tagName — 重命名标签（同时更新 git tag + DB，仅管理员）
router.put('/:tagName', requireAdmin, (req: Request, res: Response) => {
  const { tagName } = req.params;
  const { name: newName, projectPath: reqProjectPath } = req.body as { name: string; projectPath?: string };

  if (!newName) {
    res.status(400).json(error(400, 'name is required'));
    return;
  }

  const projectPath = reqProjectPath || DEFAULT_PROJECT_PATH;

  const record = getTagByName(tagName);
  if (!record) {
    res.status(404).json(error(404, 'Tag not found'));
    return;
  }

  if (record.protected) {
    res.status(403).json({ code: 403, message: '受保护的 tag 不可重命名' });
    return;
  }

  const existingNew = getTagByName(newName);
  if (existingNew && existingNew.id !== record.id) {
    res.status(409).json(error(409, `Tag ${newName} already exists`));
    return;
  }

  const updated = renameTag(record.id, newName, { projectPath });
  if (!updated) {
    res.status(404).json(error(404, 'Tag rename failed'));
    return;
  }

  res.json(success(updated));
});

// PUT /api/v1/tags/:tagName/rename — 重命名标签（别名路由，仅管理员）
router.put('/:tagName/rename', requireAdmin, (req: Request, res: Response) => {
  const { tagName } = req.params;
  const { name: newName, projectPath: reqProjectPath } = req.body as { name: string; projectPath?: string };

  if (!newName) {
    res.status(400).json(error(400, 'name is required'));
    return;
  }

  const projectPath = reqProjectPath || DEFAULT_PROJECT_PATH;
  const record = getTagByName(tagName);
  if (!record) {
    res.status(404).json(error(404, 'Tag not found'));
    return;
  }

  if (record.protected) {
    res.status(403).json(error(403, '受保护的 tag 不可重命名', 'FORBIDDEN'));
    return;
  }

  const updated = renameTag(record.id, newName, { projectPath });
  if (!updated) {
    res.status(404).json(error(404, 'Tag rename failed'));
    return;
  }

  res.json(success(updated));
});

// ========== 生命周期操作 ==========

// PUT /api/v1/tags/:id/archive — 归档/取消归档标签（仅管理员）
router.put('/:id/archive', requireAdmin, (req: Request, res: Response) => {
  const { archived } = req.body as { archived: boolean };

  const record = getTagRecord(req.params.id);
  if (!record) {
    res.status(404).json(error(404, 'Tag not found'));
    return;
  }

  if (record.protected && archived) {
    res.status(403).json(error(403, 'Cannot archive protected tag'));
    return;
  }

  const updated = archiveTag(req.params.id, archived);
  res.json(success(updated));
});

// PUT /api/v1/tags/:id/protect — 设置/取消保护标签（仅管理员）
router.put('/:id/protect', requireAdmin, (req: Request, res: Response) => {
  const { protect } = req.body as { protect: boolean };

  const record = getTagRecord(req.params.id);
  if (!record) {
    res.status(404).json(error(404, 'Tag not found'));
    return;
  }

  const updated = protectTag(req.params.id, protect);
  res.json(success(updated));
});

// PUT /api/v1/tags/:id — 更新标签记录（仅管理员）
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  const { message, name } = req.body as { message?: string; name?: string };

  const record = getTagRecord(req.params.id);
  if (!record) {
    res.status(404).json(error(404, 'Tag not found'));
    return;
  }

  const updates: Partial<typeof record> = {};
  if (message !== undefined) {
    updates.message = message;
    updates.annotation = message;
  }
  if (name !== undefined && name !== record.name) {
    // 检查新名称是否冲突
    const existing = getTagByName(name);
    if (existing && existing.id !== req.params.id) {
      res.status(409).json(error(409, `Tag ${name} already exists`));
      return;
    }
    updates.name = name;
  }

  const updated = updateTagRecord(req.params.id, updates);
  res.json(success(updated));
});

// ========== Tag 配置 ==========

// GET /api/v1/tags/config — 获取 Tag 配置
router.get('/config', (_req: Request, res: Response) => {
  res.json(success(getTagConfig()));
});

// PUT /api/v1/tags/config — 更新 Tag 配置（仅管理员）
router.put('/config', requireAdmin, (req: Request, res: Response) => {
  const config = req.body;
  const updated = updateTagConfig(config);
  res.json(success(updated));
});

// GET /api/v1/tags/preview/:version — 预览某版本会创建的 tag 名称
router.get('/preview/:version', (req: Request, res: Response) => {
  const version = req.params.version;
  const config = getTagConfig();
  const tagName = makeTagName(version, config.tagPrefix, config.customPrefix);
  const willAutoTag = shouldAutoTag('published');

  res.json(success({
    version,
    tagName,
    willAutoTag,
    config: {
      prefix: config.tagPrefix,
      customPrefix: config.customPrefix,
    },
  }));
});

// GET /api/v1/tags/versions/:versionId — 获取某版本的所有 tag
router.get('/versions/:versionId', (req: Request, res: Response) => {
  const tags = getTagsByVersionId(req.params.versionId);
  res.json(success({ data: tags, total: tags.length }));
});

// ========== Bulk Tag 操作（iter-34 API优化）==========

// POST /api/v1/tags/bulk — 批量归档/取消归档标签
router.post('/bulk', requireAdmin, (req: Request, res: Response) => {
  const { tagNames, action } = req.body as {
    tagNames: string[];
    action: 'archive' | 'unarchive';
  };

  if (!Array.isArray(tagNames) || tagNames.length === 0) {
    res.status(400).json(error(400, 'tagNames must be a non-empty array'));
    return;
  }

  if (!['archive', 'unarchive'].includes(action)) {
    res.status(400).json(error(400, 'action must be "archive" or "unarchive"'));
    return;
  }

  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  for (const tagName of tagNames) {
    try {
      const record = getTagByName(tagName);
      if (!record) {
        results.push({ name: tagName, success: false, error: 'Tag record not found' });
        continue;
      }

      if (action === 'archive') {
        archiveTag(record.id);
      } else {
        // Unarchive: update record to not archived
        updateTagRecord(record.id, { archived: false } as Parameters<typeof updateTagRecord>[1]);
      }
      results.push({ name: tagName, success: true });
    } catch (err) {
      results.push({ name: tagName, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  res.json(success({
    total: tagNames.length,
    succeeded,
    failed,
    results,
    message: failed === 0
      ? `All ${succeeded} tags ${action}d successfully`
      : `${succeeded} succeeded, ${failed} failed`,
  }));
});

// DELETE /api/v1/tags/bulk — 批量删除标签
router.delete('/bulk', requireAdmin, (req: Request, res: Response) => {
  const { tagNames, force } = req.body as {
    tagNames: string[];
    force?: boolean;
  };

  if (!Array.isArray(tagNames) || tagNames.length === 0) {
    res.status(400).json(error(400, 'tagNames must be a non-empty array'));
    return;
  }

  if (tagNames.length > 50) {
    res.status(400).json(error(400, 'Cannot delete more than 50 tags at once'));
    return;
  }

  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  for (const tagName of tagNames) {
    try {
      const record = getTagByName(tagName);
      if (!record) {
        results.push({ name: tagName, success: false, error: 'Tag record not found' });
        continue;
      }

      if (record.protected && !force) {
        results.push({ name: tagName, success: false, error: 'Tag is protected. Use force=true to override.' });
        continue;
      }

      removeTag(record.id);
      results.push({ name: tagName, success: true });
    } catch (err) {
      results.push({ name: tagName, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  res.json(success({
    total: tagNames.length,
    succeeded,
    failed,
    results,
    message: failed === 0
      ? `All ${succeeded} tags deleted successfully`
      : `${succeeded} succeeded, ${failed} failed`,
  }));
});

// GET /api/v1/tags/search — 标签搜索（支持名称/日期范围过滤）
router.get('/search', (req: Request, res: Response) => {
  const { q, source, hasScreenshot, hasChangelog, protected: isProtected, dateFrom, dateTo, page, pageSize } = req.query;

  // Get all DB tag records
  const dbTags = getAllTagRecords();
  const projectPath = (req.query.projectPath as string) || DEFAULT_PROJECT_PATH;
  const gitTags = projectPath ? gitGetTags(projectPath) : [];

  // Build merged tags
  const tagVersionIdMap = new Map<string, string>();
  for (const t of dbTags) {
    tagVersionIdMap.set(t.name, t.versionId);
  }

  const screenshotIndex = new Set<string>();
  for (const shot of ScreenshotModel.getAllScreenshots()) {
    screenshotIndex.add(shot.versionId);
  }

  const db = getDb();
  const summaryRows = db.prepare('SELECT version_id FROM version_summaries').all() as Array<{ version_id: string }>;
  const summaryIndex = new Set<string>();
  for (const row of summaryRows) {
    summaryIndex.add(row.version_id);
  }

  const protectedMap = new Map<string, boolean>();
  const sourceMap = new Map<string, 'auto' | 'manual'>();
  for (const t of dbTags) {
    protectedMap.set(t.name, t.protected);
    sourceMap.set(t.name, t.source);
  }

  let mergedTags = gitTags.map(t => {
    const versionId = tagVersionIdMap.get(t.name);
    return {
      name: t.name,
      commit: t.commit,
      date: t.date,
      annotation: t.message,
      protected: protectedMap.get(t.name) || false,
      source: sourceMap.get(t.name) || 'manual' as 'auto' | 'manual',
      hasScreenshot: versionId ? screenshotIndex.has(versionId) : false,
      hasChangelog: versionId ? summaryIndex.has(versionId) : false,
    };
  });

  // Apply filters
  if (q) {
    const query = (q as string).toLowerCase();
    mergedTags = mergedTags.filter(t => t.name.toLowerCase().includes(query));
  }

  if (source && source !== 'all') {
    mergedTags = mergedTags.filter(t => t.source === source);
  }

  if (isProtected !== undefined) {
    mergedTags = mergedTags.filter(t => t.protected === (isProtected === 'true'));
  }

  if (hasScreenshot === 'true') {
    mergedTags = mergedTags.filter(t => t.hasScreenshot);
  } else if (hasScreenshot === 'false') {
    mergedTags = mergedTags.filter(t => !t.hasScreenshot);
  }

  if (hasChangelog === 'true') {
    mergedTags = mergedTags.filter(t => t.hasChangelog);
  } else if (hasChangelog === 'false') {
    mergedTags = mergedTags.filter(t => !t.hasChangelog);
  }

  if (dateFrom) {
    const from = new Date(dateFrom as string).getTime();
    mergedTags = mergedTags.filter(t => new Date(t.date).getTime() >= from);
  }

  if (dateTo) {
    const to = new Date(dateTo as string).getTime();
    mergedTags = mergedTags.filter(t => new Date(t.date).getTime() <= to);
  }

  const total = mergedTags.length;
  const p = parseInt(page as string) || 1;
  const ps = parseInt(pageSize as string) || 50;
  const start = (p - 1) * ps;
  const data = mergedTags.slice(start, start + ps);

  res.json(success({
    data,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
  }));
});

export default router;
