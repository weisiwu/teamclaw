import { Router } from 'express';
import { searchService } from '../services/searchService.js';
import { success, error } from '../utils/response.js';

const router = Router();

// 文档搜索 GET /api/v1/search/docs?q=xxx&type=semantic&page=1&pageSize=10
router.get('/docs', (req, res) => {
  const { q, page = '1', pageSize = '10' } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json(error('INVALID_PARAMS', '需要 q 参数'));
  }
  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  // 语义搜索和全文搜索在内存版本中功能相同（后续可接入 ChromaDB）
  const result = searchService.searchDocs(q, pageNum, size);
  res.json(success(result));
});

// 任务搜索 GET /api/v1/search/tasks?q=xxx&page=1&pageSize=10
router.get('/tasks', (req, res) => {
  const { q, page = '1', pageSize = '10' } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json(error('INVALID_PARAMS', '需要 q 参数'));
  }
  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const result = searchService.searchTasks(q, pageNum, size);
  res.json(success(result));
});

// 全局搜索 GET /api/v1/search?q=xxx (文档+任务合并)
router.get('/', (req, res) => {
  const { q, page = '1', pageSize = '10' } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json(error('INVALID_PARAMS', '需要 q 参数'));
  }
  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const docResults = searchService.searchDocs(q, pageNum, size);
  const taskResults = searchService.searchTasks(q, pageNum, size);
  res.json(success({
    docs: docResults,
    tasks: taskResults,
  }));
});

export default router;
