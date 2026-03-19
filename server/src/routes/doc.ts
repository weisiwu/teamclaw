import { Router } from 'express';
import * as fs from 'fs';
import { docService } from '../services/docService.js';
import { docVersionService } from '../services/docVersion.js';
import { docFavoriteService } from '../services/docFavorite.js';
import { success, error } from '../utils/response.js';

const router = Router();

// 获取文档列表 (GET /api/v1/docs) - 增强：支持 type 和 size 过滤
router.get('/', (req, res) => {
  const { search, type, sizeMin, sizeMax, page = '1', pageSize = '20' } = req.query;
  let list = docService.getDocList(search as string | undefined);

  // 按类型过滤
  if (type) {
    list = list.filter(d => d.type.toLowerCase() === (type as string).toLowerCase());
  }
  // 按大小范围过滤
  if (sizeMin) {
    const min = parseInt(sizeMin as string);
    list = list.filter(d => d.size >= min);
  }
  if (sizeMax) {
    const max = parseInt(sizeMax as string);
    list = list.filter(d => d.size <= max);
  }

  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const total = list.length;
  const paged = list.slice((pageNum - 1) * size, pageNum * size);
  res.json(success({ list: paged, total, page: pageNum, pageSize: size }));
});

// 获取单个文档内容（在线浏览）(GET /api/v1/docs/:docId)
// 同时记录访问历史
router.get('/:docId', (req, res) => {
  const result = docService.getDocContent(req.params.docId);
  if (!result) {
    return res.status(404).json(error('DOC_NOT_FOUND', '文档不存在'));
  }
  // 记录访问历史
  docFavoriteService.recordAccess(req.params.docId, (req.query.userId as string) || 'default');
  res.json(success(result));
});

// 下载文档 (GET /api/v1/docs/:docId/download)
router.get('/:docId/download', (req, res) => {
  const filePath = docService.getDocFilePath(req.params.docId);
  if (!filePath) {
    return res.status(404).json(error('DOC_NOT_FOUND', '文档不存在'));
  }
  const doc = docService.getDoc(req.params.docId);
  const filename = encodeURIComponent(doc?.name || 'download');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// 上传文档 (POST /api/v1/docs) - 支持 base64
router.post('/', (req, res) => {
  const { filename, content, note } = req.body;
  if (!filename || !content) {
    return res.status(400).json(error('INVALID_PARAMS', '需要 filename 和 content'));
  }
  try {
    const buffer = Buffer.from(content, 'base64');
    const doc = docService.uploadDoc(filename, buffer);
    // 保存版本快照
    docVersionService.saveVersion(doc.id, buffer, 'default', note);
    res.json(success(doc));
  } catch {
    res.status(500).json(error('UPLOAD_FAILED', '上传失败'));
  }
});

// 删除文档 (DELETE /api/v1/docs/:docId)
router.delete('/:docId', (req, res) => {
  const ok = docService.deleteDoc(req.params.docId);
  if (!ok) {
    return res.status(404).json(error('DOC_NOT_FOUND', '文档不存在'));
  }
  // 清理版本和收藏
  docVersionService.deleteAllVersions(req.params.docId);
  res.json(success({ deleted: true }));
});

// ========== 文档版本管理 ==========

// 获取文档版本列表 (GET /api/v1/docs/:docId/versions)
router.get('/:docId/versions', (req, res) => {
  const { page = '1', pageSize = '10' } = req.query;
  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const result = docVersionService.getVersionsPaged(req.params.docId, pageNum, size);
  res.json(success(result));
});

// 获取指定版本内容 (GET /api/v1/docs/:docId/versions/:versionId)
router.get('/:docId/versions/:versionId', (req, res) => {
  const buffer = docVersionService.getVersionContent(req.params.docId, req.params.versionId);
  if (!buffer) {
    return res.status(404).json(error('VERSION_NOT_FOUND', '版本不存在'));
  }
  const doc = docService.getDoc(req.params.docId);
  const filename = encodeURIComponent(`${doc?.name || 'doc'}-${req.params.versionId}`);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(buffer);
});

// 恢复指定版本 (POST /api/v1/docs/:docId/versions/:versionId/restore)
router.post('/:docId/versions/:versionId/restore', (req, res) => {
  const buffer = docVersionService.getVersionContent(req.params.docId, req.params.versionId);
  if (!buffer) {
    return res.status(404).json(error('VERSION_NOT_FOUND', '版本不存在'));
  }
  const doc = docService.getDoc(req.params.docId);
  if (!doc) {
    return res.status(404).json(error('DOC_NOT_FOUND', '文档不存在'));
  }
  // 保存当前版本为新版本，然后覆盖
  docVersionService.saveVersion(req.params.docId, buffer, 'default', `restore-from:${req.params.versionId}`);
  docService.uploadDoc(doc.name, buffer); // 覆盖原文件
  res.json(success({ restored: true, versionId: req.params.versionId }));
});

// ========== 文档收藏 ==========

// 添加收藏 (POST /api/v1/docs/:docId/favorite)
router.post('/:docId/favorite', (req, res) => {
  const userId = (req.body.userId as string) || 'default';
  const favorite = docFavoriteService.addFavorite(req.params.docId, userId);
  if (!favorite) {
    return res.json(success({ alreadyFavorite: true }));
  }
  res.json(success(favorite));
});

// 取消收藏 (DELETE /api/v1/docs/:docId/favorite)
router.delete('/:docId/favorite', (req, res) => {
  const userId = (req.query.userId as string) || 'default';
  const ok = docFavoriteService.removeFavorite(req.params.docId, userId);
  res.json(success({ removed: ok }));
});

// 获取收藏列表 (GET /api/v1/docs/favorites)
router.get('/favorites/list', (req, res) => {
  const userId = (req.query.userId as string) || 'default';
  // 构建文档名映射
  const docNameMap = new Map<string, { name: string; type: string; size: number }>();
  const allDocs = docService.getDocList();
  for (const d of allDocs) {
    docNameMap.set(d.id, { name: d.name, type: d.type, size: d.size });
  }
  const favorites = docFavoriteService.getFavorites(userId, docNameMap);
  res.json(success({ list: favorites, total: favorites.length }));
});

// 检查是否已收藏 (GET /api/v1/docs/:docId/favorite)
router.get('/:docId/favorite', (req, res) => {
  const userId = (req.query.userId as string) || 'default';
  const isFav = docFavoriteService.isFavorite(req.params.docId, userId);
  res.json(success({ isFavorite: isFav }));
});

// ========== 最近访问 ==========

// 获取最近访问 (GET /api/v1/docs/recent)
router.get('/recent/access', (req, res) => {
  const userId = (req.query.userId as string) || 'default';
  const limit = parseInt((req.query.limit as string) || '10');
  const docNameMap = new Map<string, { name: string; type: string; size: number }>();
  const allDocs = docService.getDocList();
  for (const d of allDocs) {
    docNameMap.set(d.id, { name: d.name, type: d.type, size: d.size });
  }
  const recent = docFavoriteService.getRecentAccess(userId, limit, docNameMap);
  res.json(success({ list: recent, total: recent.length }));
});

// ========== 文档统计 ==========

// 获取文档统计 (GET /api/v1/docs/stats)
router.get('/stats/overview', (req, res) => {
  const allDocs = docService.getDocList();
  const totalSize = allDocs.reduce((sum, d) => sum + d.size, 0);
  const byType: Record<string, number> = {};
  for (const d of allDocs) {
    byType[d.type] = (byType[d.type] || 0) + 1;
  }
  res.json(success({
    totalDocs: allDocs.length,
    totalSize,
    byType,
  }));
});

// ========== 文档在线预览 (增强版) ==========

// 在线预览文档 GET /api/v1/docs/:docId/preview
router.get('/:docId/preview', async (req, res) => {
  const { generatePreview } = await import('../services/docPreviewService.js');
  const { page, maxLines } = req.query;

  const result = await generatePreview(req.params.docId, {
    page: page ? parseInt(page as string) : undefined,
    maxLines: maxLines ? parseInt(maxLines as string) : undefined,
  });

  if (!result.canPreview) {
    return res.status(415).json(error('UNSUPPORTED_TYPE', result.message || '该文件类型不支持在线预览'));
  }

  if (result.type === 'html' || result.type === 'code') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(result.content);
  }

  if (result.type === 'image') {
    return res.json(success(result));
  }

  // PDF: return preview metadata, frontend uses react-pdf
  return res.json(success(result));
});

// PDF分页预览数据 GET /api/v1/docs/:docId/preview/pdf?page=1
router.get('/:docId/preview/pdf', async (req, res) => {
  const { generatePreview } = await import('../services/docPreviewService.js');
  const page = parseInt((req.query.page as string) || '1');

  const result = await generatePreview(req.params.docId, { page });

  if (!result.canPreview || result.type !== 'pdf') {
    return res.status(415).json(error('UNSUPPORTED_TYPE', result.message || 'PDF预览不可用'));
  }

  // Return PDF metadata and download URL
  return res.json(success({
    type: 'pdf',
    url: `/api/v1/docs/${req.params.docId}/download`,
    pages: result.pages,
    currentPage: page,
    size: result.size,
    filename: result.filename,
    canPreview: result.canPreview,
  }));
});

export default router;
