// Tag 生命周期管理 API 路由
// 提供标签的 CRUD、归档、保护、配置等 API

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
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

const router = Router();

// Default project path for git tag operations
const DEFAULT_PROJECT_PATH = process.env.TEAMCLAW_PROJECT_PATH || '';

// ========== Tag 记录 CRUD ==========

// GET /api/v1/tags — 获取所有标签记录（从 git + DB 合并）
router.get('/', (req: Request, res: Response) => {
  const { versionId, archived, protected: isProtected, page, pageSize, projectPath: reqProjectPath } = req.query;

  // Get git tags from project path
  const projectPath = (reqProjectPath as string) || DEFAULT_PROJECT_PATH;
  let gitTags: Array<{ name: string; commit: string; date: string; message?: string }> = [];
  if (projectPath) {
    gitTags = gitGetTags(projectPath);
  }

  // Get DB tag records for protected marks
  const dbTags = getAllTagRecords();
  const protectedMap = new Map<string, boolean>();
  for (const t of dbTags) {
    protectedMap.set(t.name, t.protected);
  }

  // Merge: git tags + protected from DB
  const mergedTags = gitTags.map(t => ({
    name: t.name,
    commit: t.commit,
    date: t.date,
    annotation: t.message,
    hasRecord: protectedMap.has(t.name),
    protected: protectedMap.get(t.name) || false,
  }));

  // Apply filters
  let tags = mergedTags;

  if (isProtected !== undefined) {
    const isProt = isProtected === 'true';
    tags = tags.filter(t => t.protected === isProt);
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

// DELETE /api/v1/tags/:tagName — 删除标签（同时删除 git tag）
router.delete('/:tagName', (req: Request, res: Response) => {
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
    res.status(403).json({ code: 403, message: '受保护的 tag 不可删除' });
    return;
  }

  const deleted = removeTag(record.id, { projectPath });
  res.json(success({ deleted }));
});

// PUT /api/v1/tags/:tagName — 重命名标签（同时更新 git tag + DB）
router.put('/:tagName', (req: Request, res: Response) => {
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

// PUT /api/v1/tags/:tagName/rename — 重命名标签（别名路由）
router.put('/:tagName/rename', (req: Request, res: Response) => {
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

  const updated = renameTag(record.id, newName, { projectPath });
  if (!updated) {
    res.status(404).json(error(404, 'Tag rename failed'));
    return;
  }

  res.json(success(updated));
});

// ========== 生命周期操作 ==========

// PUT /api/v1/tags/:id/archive — 归档/取消归档标签
router.put('/:id/archive', (req: Request, res: Response) => {
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

// PUT /api/v1/tags/:id/protect — 设置/取消保护标签
router.put('/:id/protect', (req: Request, res: Response) => {
  const { protect } = req.body as { protect: boolean };

  const record = getTagRecord(req.params.id);
  if (!record) {
    res.status(404).json(error(404, 'Tag not found'));
    return;
  }

  const updated = protectTag(req.params.id, protect);
  res.json(success(updated));
});

// PUT /api/v1/tags/:id — 更新标签记录
router.put('/:id', (req: Request, res: Response) => {
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

// PUT /api/v1/tags/config — 更新 Tag 配置
router.put('/config', (req: Request, res: Response) => {
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

export default router;
