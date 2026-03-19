import { Router } from 'express';
import * as fs from 'fs';
import { docService } from '../services/docService.js';
import { success, error } from '../utils/response.js';

const router = Router();

// 获取文档列表 (GET /api/v1/docs)
router.get('/', (req, res) => {
  const { search, page = '1', pageSize = '20' } = req.query;
  const list = docService.getDocList(search as string | undefined);
  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const total = list.length;
  const paged = list.slice((pageNum - 1) * size, pageNum * size);
  res.json(success({ list: paged, total, page: pageNum, pageSize: size }));
});

// 获取单个文档内容（在线浏览）(GET /api/v1/docs/:docId)
router.get('/:docId', (req, res) => {
  const result = docService.getDocContent(req.params.docId);
  if (!result) {
    return res.status(404).json(error('DOC_NOT_FOUND', '文档不存在'));
  }
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

// 上传文档 (POST /api/v1/docs) - multipart
router.post('/', (req, res) => {
  // 简单处理：支持 base64 上传
  const { filename, content } = req.body;
  if (!filename || !content) {
    return res.status(400).json(error('INVALID_PARAMS', '需要 filename 和 content'));
  }
  try {
    const buffer = Buffer.from(content, 'base64');
    const doc = docService.uploadDoc(filename, buffer);
    res.json(success(doc));
  } catch {
    res.status(500).json(error('UPLOAD_FAILED', '上传失败'));
  }
});

export default router;
