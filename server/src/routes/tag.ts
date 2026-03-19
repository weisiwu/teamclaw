// Tag 生命周期管理 API 路由
// 提供标签的 CRUD、归档、保护、配置等 API

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
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
} from '../services/tagService.js';

const router = Router();

// ========== Tag 记录 CRUD ==========

// GET /api/v1/tags — 获取所有标签记录
router.get('/', (req: Request, res: Response) => {
  const { versionId, archived, protected: isProtected, page, pageSize } = req.query;

  let tags = getAllTagRecords();

  // 按版本过滤
  if (versionId && typeof versionId === 'string') {
    tags = tags.filter(t => t.versionId === versionId);
  }

  // 按归档状态过滤
  if (archived !== undefined) {
    const isArchived = archived === 'true';
    tags = tags.filter(t => t.archived === isArchived);
  }

  // 按保护状态过滤
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

// GET /api/v1/tags/:id — 获取单个标签
router.get('/:id', (req: Request, res: Response) => {
  const tag = getTagRecord(req.params.id);
  if (!tag) {
    res.status(404).json(error(404, 'Tag not found'));
    return;
  }
  res.json(success(tag));
});

// POST /api/v1/tags — 手动创建标签记录
router.post('/', (req: Request, res: Response) => {
  const { name, versionId, versionName, message, commitHash, createdBy } = req.body as {
    name?: string;
    versionId: string;
    versionName: string;
    message?: string;
    commitHash?: string;
    createdBy?: string;
  };

  if (!versionId || !versionName) {
    res.status(400).json(error(400, 'versionId and versionName are required'));
    return;
  }

  const tagName = name || makeTagName(versionName, getTagConfig().tagPrefix, getTagConfig().customPrefix);

  // 检查是否已存在
  const existing = getTagByName(tagName);
  if (existing) {
    res.status(409).json(error(409, `Tag ${tagName} already exists`));
    return;
  }

  const record = createTagRecord({
    name: tagName,
    versionId,
    versionName,
    message: message || `Release ${versionName}`,
    commitHash,
    createdBy,
    annotation: message || `Version ${versionName}`,
  });

  res.status(201).json(success(record));
});

// DELETE /api/v1/tags/:id — 删除标签记录
router.delete('/:id', (req: Request, res: Response) => {
  const record = getTagRecord(req.params.id);
  if (!record) {
    res.status(404).json(error(404, 'Tag not found'));
    return;
  }

  if (record.protected) {
    res.status(403).json(error(403, 'Cannot delete protected tag'));
    return;
  }

  const deleted = deleteTagRecord(req.params.id);
  res.json(success({ deleted }));
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
