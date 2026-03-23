/**
 * Search Routes
 * 搜索增强模块 - 语义搜索 API
 *
 * GET /api/v1/search/tasks?q=xxx&mode=semantic&topK=5  语义搜索历史任务
 * GET /api/v1/search?q=xxx&mode=semantic              全局语义搜索
 */

import { Router } from 'express';
import { searchService } from '../services/searchService.js';
import { taskMemory, TaskSearchResult } from '../services/taskMemory.js';
import { searchVersionMemory } from '../services/versionMemory.js';
import {
  semanticDocSearch,
  applyFilters,
  getSearchSuggestions,
  saveSearchHistory,
  clearSearchHistory,
  indexDocInChroma,
  getSearchHistoryRecords,
  SearchFilter,
} from '../services/searchEnhancer.js';
import { docService } from '../services/docService.js';
import { success, error } from '../utils/response.js';

const router = Router();

// 增强文档搜索 GET /api/v1/search/docs?q=xxx&mode=semantic&type=md&dateFrom=2026-01-01&page=1&pageSize=10
router.get('/docs', async (req, res) => {
  const {
    q,
    mode = 'keyword',
    type,
    dateFrom,
    dateTo,
    projectId,
    sizeMin,
    sizeMax,
    page = '1',
    pageSize = '10',
    userId = 'default',
  } = req.query;

  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const filter: SearchFilter = {
    type: type as string,
    dateFrom: dateFrom as string,
    dateTo: dateTo as string,
    projectId: projectId as string,
    sizeMin: sizeMin ? parseInt(sizeMin as string) : undefined,
    sizeMax: sizeMax ? parseInt(sizeMax as string) : undefined,
  };

  // Semantic search via ChromaDB
  if (mode === 'semantic' && q && typeof q === 'string') {
    const semanticResults = await semanticDocSearch(q as string, size);
    const docIds = semanticResults.map(r => r.id);
    let docs = docIds.map(id => docService.getDoc(id)).filter(Boolean);
    docs = applyFilters(docs, filter);
    const total = docs.length;
    const paged = docs.slice((pageNum - 1) * size, pageNum * size);
    saveSearchHistory(userId as string, q as string, 'semantic', filter, total);
    return res.json(
      success({
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
      })
    );
  }

  // Keyword search with filters
  let docs = docService.getDocList(q as string | undefined);
  docs = applyFilters(docs, filter);
  const total = docs.length;
  const paged = docs.slice((pageNum - 1) * size, pageNum * size);
  if (q && typeof q === 'string') saveSearchHistory(userId as string, q, 'keyword', filter, total);
  res.json(
    success({
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
    })
  );
});

// 任务搜索 GET /api/v1/search/tasks?q=xxx&mode=semantic&topK=5
router.get('/tasks', async (req, res) => {
  const { q, mode = 'keyword', page = '1', pageSize = '10', topK = '5' } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json(error(400, 'query parameter "q" is required', 'INVALID_PARAMS'));
  }

  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const k = parseInt(topK as string);

  // 语义搜索模式
  if (mode === 'semantic') {
    try {
      const results = await taskMemory.searchSimilarTasks(q, k);
      const total = results.length;
      const paged = results.slice((pageNum - 1) * size, pageNum * size);
      saveSearchHistory('default', q, 'semantic', {}, total);
      return res.json(
        success({
          list: paged.map((r: TaskSearchResult) => ({
            taskId: r.taskId,
            title: r.title,
            summary: r.summary,
            similarity: r.similarity,
            completedAt: r.completedAt,
          })),
          total,
          page: pageNum,
          pageSize: size,
          mode: 'semantic',
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[search] Semantic task search failed:', msg);
      return res.status(500).json(error(500, 'Semantic search failed', 'SEARCH_ERROR'));
    }
  }

  // 关键词搜索模式（fallback）
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
  res.json(
    success({
      docs: docResults,
      tasks: taskResults,
    })
  );
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
  const history = getSearchHistoryRecords(userId as string, parseInt(limit as string));
  res.json(success({ history }));
});

// 清除搜索历史 DELETE /api/v1/search/history?userId=xxx
router.delete('/history', (req, res) => {
  const { userId = 'default' } = req.query;
  clearSearchHistory(userId as string);
  res.json(success({ message: '搜索历史已清除' }));
});

// 版本语义搜索 GET /api/v1/search/versions?q=xxx&topK=5
router.get('/versions', async (req, res) => {
  const { q, topK = '5', minSimilarity = '0.3' } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json(error(400, '需要 q 参数', 'INVALID_PARAMS'));
  }

  try {
    const results = await searchVersionMemory(q, {
      topK: parseInt(topK as string),
      minSimilarity: parseFloat(minSimilarity as string),
    });
    res.json(
      success({
        list: results,
        total: results.length,
        query: q,
      })
    );
  } catch (err) {
    console.warn('[search] Version memory search failed:', err);
    res.json(success({ list: [], total: 0, query: q, error: 'Search failed' }));
  }
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
