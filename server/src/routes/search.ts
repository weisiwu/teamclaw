import { Router } from 'express';
import { searchService } from '../services/searchService.js';
import {
  semanticDocSearch,
  applyFilters,
  getSearchSuggestions,
  saveSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  indexDocInChroma,
  SearchFilter,
} from '../services/searchEnhancer.js';
import { docService } from '../services/docService.js';
import { success, error } from '../utils/response.js';

const router = Router();

// 增强文档搜索 GET /api/v1/search/docs?q=xxx&mode=semantic&type=md&dateFrom=2026-01-01&page=1&pageSize=10
router.get('/docs', async (req, res) => {
  const {
    q, mode = 'keyword', type, dateFrom, dateTo, projectId, sizeMin, sizeMax,
    page = '1', pageSize = '10', userId = 'default'
  } = req.query;

  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const filter: SearchFilter = { type: type as string, dateFrom: dateFrom as string, dateTo: dateTo as string, projectId: projectId as string, sizeMin: sizeMin ? parseInt(sizeMin as string) : undefined, sizeMax: sizeMax ? parseInt(sizeMax as string) : undefined };

  // Semantic search via ChromaDB
  if (mode === 'semantic' && q && typeof q === 'string') {
    const semanticResults = await semanticDocSearch(q as string, size);
    const docIds = semanticResults.map(r => r.id);
    // Fetch full doc info and apply filters
    let docs = docIds.map(id => docService.getDoc(id)).filter(Boolean);
    docs = applyFilters(docs, filter);
    const total = docs.length;
    const paged = docs.slice((pageNum - 1) * size, pageNum * size);
    saveSearchHistory(userId as string, q as string, 'semantic', filter, total);
    return res.json(success({
      list: paged.map(d => ({
        type: 'doc',
        id: d.id,
        title: d.name,
        snippet: `类型: ${d.type} | 大小: ${d.size} | 上传: ${d.uploadedAt}`,
        url: `/docs/${d.id}`,
        score: semanticResults.find(r => r.id === d.id)?.score ?? 0,
      })),
      total,
      page: pageNum,
      pageSize: size,
      mode: 'semantic',
    }));
  }

  // Keyword search with filters
  let docs = docService.getDocList(q as string | undefined);
  docs = applyFilters(docs, filter);
  const total = docs.length;
  const paged = docs.slice((pageNum - 1) * size, pageNum * size);
  if (q && typeof q === 'string') saveSearchHistory(userId as string, q, 'keyword', filter, total);
  res.json(success({
    list: paged.map(d => ({
      type: 'doc',
      id: d.id,
      title: d.name,
      snippet: `类型: ${d.type} | 大小: ${d.size} | 上传: ${d.uploadedAt}`,
      url: `/docs/${d.id}`,
      score: 1,
    })),
    total,
    page: pageNum,
    pageSize: size,
    mode: 'keyword',
  }));
});

// 任务搜索 GET /api/v1/search/tasks?q=xxx&page=1&pageSize=10
router.get('/tasks', (req, res) => {
  const { q, page = '1', pageSize = '10' } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json(error(400, '需要 q 参数', 'INVALID_PARAMS'));
  }
  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const result = searchService.searchTasks(q, pageNum, size);
  res.json(success(result));
});

// 全局搜索 GET /api/v1/search?q=xxx (文档+任务合并)
router.get('/', async (req, res) => {
  const { q, page = '1', pageSize = '10' } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json(error(400, '需要 q 参数', 'INVALID_PARAMS'));
  }
  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const docResults = searchService.searchDocs(q, pageNum, size);
  const taskResults = await searchService.searchTasks(q, pageNum, size);
  res.json(success({
    docs: docResults,
    tasks: taskResults,
  }));
});

// 搜索建议 GET /api/v1/search/suggestions?q=xxx&limit=5
router.get('/suggestions', (req, res) => {
  const { q, limit = '5' } = req.query;
  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.json(success({ suggestions: [] }));
  }
  const suggestions = getSearchSuggestions(q, parseInt(limit as string));
  res.json(success({ suggestions }));
});

// 搜索历史 GET /api/v1/search/history?userId=xxx&limit=10
router.get('/history', (req, res) => {
  const { userId = 'default', limit = '10' } = req.query;
  const { getSearchHistoryRecords } = require('../services/searchEnhancer.js');
  const history = getSearchHistoryRecords(userId as string, parseInt(limit as string));
  res.json(success({ history }));
});

// 清除搜索历史 DELETE /api/v1/search/history?userId=xxx
router.delete('/history', (req, res) => {
  const { userId = 'default' } = req.query;
  clearSearchHistory(userId as string);
  res.json(success({ message: '搜索历史已清除' }));
});

// 索引文档 POST /api/v1/search/index (body: { docId })
router.post('/index', async (req, res) => {
  const { docId } = req.body;
  if (!docId) return res.status(400).json(error(400, '需要 docId', 'INVALID_PARAMS'));
  const doc = docService.getDoc(docId);
  if (!doc) return res.status(404).json(error(404, '文档不存在', 'NOT_FOUND'));
  await indexDocInChroma(doc);
  res.json(success({ message: '文档已索引到向量数据库' }));
});

export default router;
