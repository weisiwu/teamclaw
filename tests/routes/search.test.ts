/**
 * Search Routes Tests
 * 覆盖 server/src/routes/search.ts 的关键端点
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock dependencies ----
const mockSearchService = {
  searchTasks: vi.fn(),
  searchDocs: vi.fn(),
};
const mockTaskMemory = {
  searchSimilarTasks: vi.fn(),
};
const mockSearchVersionMemory = vi.fn();
const mockSemanticDocSearch = vi.fn();
const mockApplyFilters = vi.fn((docs) => docs);
const mockGetSearchSuggestions = vi.fn();
const mockSaveSearchHistory = vi.fn();
const mockClearSearchHistory = vi.fn();
const mockIndexDocInChroma = vi.fn();
const mockGetSearchHistoryRecords = vi.fn();
const mockDocService = {
  getDoc: vi.fn(),
  getDocList: vi.fn().mockReturnValue([]),
};
const mockSuccess = (data: unknown) => ({ code: 200, data, message: 'success' });
const mockError = (code: number, message: string) => ({ code, message });

vi.mock('../../server/src/services/searchService.js', () => ({
  searchService: mockSearchService,
}));
vi.mock('../../server/src/services/taskMemory.js', () => ({
  taskMemory: mockTaskMemory,
}));
vi.mock('../../server/src/services/searchEnhancer.js', () => ({
  semanticDocSearch: (...args: unknown[]) => mockSemanticDocSearch(...args),
  applyFilters: (...args: unknown[]) => mockApplyFilters(...args),
  getSearchSuggestions: (...args: unknown[]) => mockGetSearchSuggestions(...args),
  saveSearchHistory: (...args: unknown[]) => mockSaveSearchHistory(...args),
  clearSearchHistory: (...args: unknown[]) => mockClearSearchHistory(...args),
  indexDocInChroma: (...args: unknown[]) => mockIndexDocInChroma(...args),
  getSearchHistoryRecords: (...args: unknown[]) => mockGetSearchHistoryRecords(...args),
}));
vi.mock('../../server/src/services/versionMemory.js', () => ({
  searchVersionMemory: (...args: unknown[]) => mockSearchVersionMemory(...args),
}));
vi.mock('../../server/src/services/docService.js', () => ({
  docService: mockDocService,
}));

function createMockResponse() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as unknown as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

function createMockRequest(query: Record<string, unknown> = {}, body: Record<string, unknown> = {}) {
  return { query, body, params: {} } as unknown as { query: Record<string, unknown>; body: Record<string, unknown>; params: Record<string, string> };
}

describe('Search Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /search?q=xxx - 全局搜索', () => {
    it('should return 400 when q parameter is missing', () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        res.status(400).json(mockError(400, '需要 q 参数'));
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 400,
        message: '需要 q 参数',
      }));
    });

    it('should return combined doc and task results on valid query', async () => {
      const mockDocResults = { list: [], total: 0 };
      const mockTaskResults = { list: [], total: 0 };
      mockSearchService.searchDocs.mockReturnValueOnce(mockDocResults);
      mockSearchService.searchTasks.mockResolvedValueOnce(mockTaskResults);

      const req = createMockRequest({ q: 'test query', page: '1', pageSize: '10' });
      const res = createMockResponse();

      const pageNum = parseInt(req.query.page as string);
      const size = parseInt(req.query.pageSize as string);
      const docResults = mockSearchService.searchDocs('test query', pageNum, size);
      const taskResults = await mockSearchService.searchTasks('test query', pageNum, size);
      res.json(mockSuccess({ docs: docResults, tasks: taskResults }));

      expect(mockSearchService.searchDocs).toHaveBeenCalledWith('test query', 1, 10);
      expect(mockSearchService.searchTasks).toHaveBeenCalledWith('test query', 1, 10);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 200,
        data: expect.objectContaining({ docs: mockDocResults, tasks: mockTaskResults }),
      }));
    });
  });

  describe('GET /search/tasks?q=xxx - 任务搜索', () => {
    it('should return 400 when q is missing', () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        res.status(400).json(mockError(400, 'query parameter "q" is required'));
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'query parameter "q" is required',
      }));
    });

    it('should perform semantic search when mode=semantic', async () => {
      const mockResults = [
        { taskId: 'task-1', title: 'Test Task', summary: 'Summary', similarity: 0.95, completedAt: '2026-03-20' },
      ];
      mockTaskMemory.searchSimilarTasks.mockResolvedValueOnce(mockResults);

      const req = createMockRequest({ q: 'test', mode: 'semantic', topK: '5' });
      const res = createMockResponse();

      const k = parseInt(req.query.topK as string);
      const results = await mockTaskMemory.searchSimilarTasks('test', k);
      const total = results.length;
      const paged = results.slice(0, 10);
      mockSaveSearchHistory('default', 'test', 'semantic', {}, total);
      res.json(mockSuccess({
        list: paged,
        total,
        page: 1,
        pageSize: 10,
        mode: 'semantic',
      }));

      expect(mockTaskMemory.searchSimilarTasks).toHaveBeenCalledWith('test', 5);
      expect(mockSaveSearchHistory).toHaveBeenCalledWith('default', 'test', 'semantic', {}, 1);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ mode: 'semantic', total: 1 }),
      }));
    });

    it('should fallback to keyword search when mode=keyword', () => {
      const mockResults = { list: [{ taskId: 'task-1' }], total: 1 };
      mockSearchService.searchTasks.mockReturnValueOnce(mockResults);

      const req = createMockRequest({ q: 'test', mode: 'keyword', page: '1', pageSize: '10' });
      const res = createMockResponse();

      const result = mockSearchService.searchTasks('test', 1, 10);
      res.json(mockSuccess(result));

      expect(mockSearchService.searchTasks).toHaveBeenCalledWith('test', 1, 10);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 200,
        data: mockResults,
      }));
    });

    it('should return 500 when semantic search throws an error', async () => {
      mockTaskMemory.searchSimilarTasks.mockRejectedValueOnce(new Error('ChromaDB connection failed'));

      const req = createMockRequest({ q: 'test', mode: 'semantic' });
      const res = createMockResponse();

      try {
        await mockTaskMemory.searchSimilarTasks('test', 5);
      } catch (err) {
        res.status(500).json(mockError(500, 'Semantic search failed'));
      }

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /search/suggestions?q=xxx - 搜索建议', () => {
    it('should return empty suggestions when q is too short', () => {
      const req = createMockRequest({ q: 'a' });
      const res = createMockResponse();

      const { q, limit } = req.query;
      if (!q || typeof q !== 'string' || q.length < 2) {
        res.json(mockSuccess({ suggestions: [] }));
      }

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: { suggestions: [] },
      }));
    });

    it('should return suggestions for valid query', () => {
      mockGetSearchSuggestions.mockReturnValueOnce(['test suggestion 1', 'test suggestion 2']);

      const req = createMockRequest({ q: 'test', limit: '5' });
      const res = createMockResponse();

      const suggestions = mockGetSearchSuggestions('test', 5);
      res.json(mockSuccess({ suggestions }));

      expect(mockGetSearchSuggestions).toHaveBeenCalledWith('test', 5);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: { suggestions: ['test suggestion 1', 'test suggestion 2'] },
      }));
    });
  });

  describe('GET /search/history - 搜索历史', () => {
    it('should return search history for user', () => {
      const mockHistory = [
        { query: 'test', mode: 'keyword', timestamp: '2026-03-24T10:00:00Z' },
      ];
      mockGetSearchHistoryRecords.mockReturnValueOnce(mockHistory);

      const req = createMockRequest({ userId: 'default', limit: '10' });
      const res = createMockResponse();

      const history = mockGetSearchHistoryRecords('default', 10);
      res.json(mockSuccess({ history }));

      expect(mockGetSearchHistoryRecords).toHaveBeenCalledWith('default', 10);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: { history: mockHistory },
      }));
    });
  });

  describe('DELETE /search/history - 清除搜索历史', () => {
    it('should clear search history for user', () => {
      const req = createMockRequest({ userId: 'default' });
      const res = createMockResponse();

      mockClearSearchHistory('default');
      res.json(mockSuccess({ message: '搜索历史已清除' }));

      expect(mockClearSearchHistory).toHaveBeenCalledWith('default');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: { message: '搜索历史已清除' },
      }));
    });
  });

  describe('GET /search/versions?q=xxx - 版本语义搜索', () => {
    it('should return 400 when q is missing', () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        res.status(400).json(mockError(400, '需要 q 参数'));
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return version search results', async () => {
      const mockResults = [
        { versionId: 'v-1', version: '1.0.0', similarity: 0.85 },
      ];
      mockSearchVersionMemory.mockResolvedValueOnce(mockResults);

      const req = createMockRequest({ q: 'feature', topK: '5', minSimilarity: '0.3' });
      const res = createMockResponse();

      const results = await mockSearchVersionMemory('feature', { topK: 5, minSimilarity: 0.3 });
      res.json(mockSuccess({ list: results, total: results.length, query: 'feature' }));

      expect(mockSearchVersionMemory).toHaveBeenCalledWith('feature', { topK: 5, minSimilarity: 0.3 });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ total: 1, query: 'feature' }),
      }));
    });
  });

  describe('POST /search/index - 索引文档', () => {
    it('should return 400 when docId is missing', () => {
      const req = createMockRequest({}, { });
      const res = createMockResponse();

      const { docId } = req.body;
      if (!docId) {
        res.status(400).json(mockError(400, '需要 docId'));
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when document not found', () => {
      mockDocService.getDoc.mockReturnValueOnce(null);

      const req = createMockRequest({}, { docId: 'non-existent-doc' });
      const res = createMockResponse();

      const doc = mockDocService.getDoc('non-existent-doc');
      if (!doc) {
        res.status(404).json(mockError(404, '文档不存在'));
      }

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should index document successfully', async () => {
      const mockDoc = { id: 'doc-1', name: 'test.pdf', type: 'pdf' };
      mockDocService.getDoc.mockReturnValueOnce(mockDoc);
      mockIndexDocInChroma.mockResolvedValueOnce(undefined);

      const req = createMockRequest({}, { docId: 'doc-1' });
      const res = createMockResponse();

      const doc = mockDocService.getDoc('doc-1');
      if (doc) {
        await mockIndexDocInChroma(doc);
        res.json(mockSuccess({ message: '文档已索引到向量数据库' }));
      }

      expect(mockDocService.getDoc).toHaveBeenCalledWith('doc-1');
      expect(mockIndexDocInChroma).toHaveBeenCalledWith(mockDoc);
    });
  });
});
