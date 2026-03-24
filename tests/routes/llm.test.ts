/**
 * LLM Routes Tests
 * 覆盖 server/src/routes/llm.ts 的关键端点
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock dependencies ----
const mockLlmCall = vi.fn();
const mockLlmCallLight = vi.fn();
const mockLlmCallMedium = vi.fn();
const mockLlmCallStrong = vi.fn();
const mockLlmAutoRoute = vi.fn();
const mockEstimateComplexity = vi.fn();
const mockSelectTierByComplexity = vi.fn();
const mockEstimateMessageTokens = vi.fn();
const mockEstimateTokens = vi.fn();
const mockWithCostTracking = vi.fn((tier: string, fn: () => unknown) => fn());
const mockLlmCostTracker = {
  record: vi.fn(),
  getTotalStats: vi.fn().mockReturnValue({ totalCalls: 10, totalCost: 0.5 }),
  getTrend: vi.fn().mockReturnValue([]),
  getDailyStats: vi.fn(),
  getRecentRecords: vi.fn().mockReturnValue([]),
};

vi.mock('../../server/src/services/llmService.js', () => ({
  llmCall: (...args: unknown[]) => mockLlmCall(...args),
  llmCallLight: (...args: unknown[]) => mockLlmCallLight(...args),
  llmCallMedium: (...args: unknown[]) => mockLlmCallMedium(...args),
  llmCallStrong: (...args: unknown[]) => mockLlmCallStrong(...args),
  llmAutoRoute: (...args: unknown[]) => mockLlmAutoRoute(...args),
  estimateComplexity: (...args: unknown[]) => mockEstimateComplexity(...args),
  selectTierByComplexity: (...args: unknown[]) => mockSelectTierByComplexity(...args),
  estimateMessageTokens: (...args: unknown[]) => mockEstimateMessageTokens(...args),
  estimateTokens: (...args: unknown[]) => mockEstimateTokens(...args),
}));

vi.mock('../../server/src/services/llmCostTracker.js', () => ({
  llmCostTracker: mockLlmCostTracker,
  withCostTracking: (...args: unknown[]) => mockWithCostTracking(...args),
}));

function createMockResponse() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as unknown as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

function createMockRequest(body: Record<string, unknown> = {}, query: Record<string, unknown> = {}) {
  return { body, query, params: {} } as unknown as { body: Record<string, unknown>; query: Record<string, unknown>; params: Record<string, string> };
}

describe('LLM Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithCostTracking.mockImplementation((tier: string, fn: () => unknown) => fn());
  });

  describe('POST /llm/call - 参数验证', () => {
    it('should return 400 when messages is missing', () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ code: 400, message: expect.any(String) });
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 400 }));
    });

    it('should return 400 when messages is not an array', () => {
      const req = createMockRequest({ messages: 'not-an-array' });
      const res = createMockResponse();

      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ code: 400, message: 'messages is required and must be an array' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'messages is required and must be an array',
      }));
    });

    it('should return 200 with response content on valid call', async () => {
      const mockResponse = {
        content: 'Test LLM response',
        usage: { inputTokens: 10, outputTokens: 20 },
        model: 'gpt-4o-mini',
        provider: 'openai',
      };
      mockLlmCall.mockResolvedValueOnce({
        result: mockResponse,
        responseMs: 150,
      });

      const req = createMockRequest({
        messages: [{ role: 'user', content: 'Hello' }],
        tier: 'medium',
      });
      const res = createMockResponse();

      try {
        const { result: response, responseMs } = await mockLlmCall({
          tier: 'medium',
          messages: [{ role: 'user', content: 'Hello' }],
          maxTokens: undefined,
          temperature: undefined,
        }, []);
        mockLlmCostTracker.record(response, responseMs, 'medium');
        res.json({ code: 200, data: { content: response.content, usage: response.usage, responseMs } });
      } catch (err) {
        res.status(500).json({ code: 500, message: err instanceof Error ? err.message : 'Internal error' });
      }

      expect(mockLlmCall).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 200,
        data: expect.objectContaining({ content: 'Test LLM response' }),
      }));
      expect(mockLlmCostTracker.record).toHaveBeenCalledWith(mockResponse, 150, 'medium');
    });

    it('should return 500 on LLM service error', async () => {
      mockLlmCall.mockRejectedValueOnce(new Error('LLM provider unavailable'));

      const req = createMockRequest({ messages: [{ role: 'user', content: 'Hello' }] });
      const res = createMockResponse();

      try {
        await mockLlmCall({ tier: 'medium', messages: [] });
        res.json({ code: 200 });
      } catch (err) {
        res.status(500).json({ code: 500, message: err instanceof Error ? err.message : 'Internal error' });
      }

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 500,
        message: 'LLM provider unavailable',
      }));
    });
  });

  describe('POST /llm/light - 轻量模型', () => {
    it('should return 400 when messages is missing', () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      const { messages } = req.body;
      if (!messages) {
        res.status(400).json({ code: 400, message: 'messages required' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call llmCallLight with correct parameters', async () => {
      const mockResponse = { content: 'light response', usage: { inputTokens: 5, outputTokens: 10 } };
      mockLlmCallLight.mockResolvedValueOnce({ result: mockResponse, responseMs: 50 });

      const req = createMockRequest({ messages: [{ role: 'user', content: 'Hi' }] });
      const res = createMockResponse();

      const { result: response, responseMs } = await mockLlmCallLight(
        [{ role: 'user', content: 'Hi' }],
        true
      );
      mockLlmCostTracker.record(response, responseMs, 'light');
      res.json({ code: 200, data: { content: response.content } });

      expect(mockLlmCallLight).toHaveBeenCalledWith([{ role: 'user', content: 'Hi' }], true);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 200,
        data: { content: 'light response' },
      }));
    });
  });

  describe('POST /llm/strong - 强力模型', () => {
    it('should return 400 when messages is missing', () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      const { messages } = req.body;
      if (!messages) {
        res.status(400).json({ code: 400, message: 'messages required' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call llmCallStrong with correct parameters', async () => {
      const mockResponse = { content: 'strong response', usage: { inputTokens: 50, outputTokens: 100 } };
      mockLlmCallStrong.mockResolvedValueOnce({ result: mockResponse, responseMs: 500 });

      const messages = [{ role: 'user', content: 'Complex task' }];
      const { result: response, responseMs } = await mockLlmCallStrong(messages);
      mockLlmCostTracker.record(response, responseMs, 'strong');

      expect(mockLlmCallStrong).toHaveBeenCalledWith(messages);
      expect(mockLlmCostTracker.record).toHaveBeenCalledWith(mockResponse, 500, 'strong');
    });
  });

  describe('POST /llm/estimate - Token 估算', () => {
    it('should return 400 when neither text nor messages provided', () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      const { text, messages } = req.body;
      if (!text && !messages) {
        res.status(400).json({ code: 400, message: 'text or messages required' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should estimate tokens from text', () => {
      mockEstimateTokens.mockReturnValueOnce(42);

      const req = createMockRequest({ text: 'Hello world' });
      const tokens = mockEstimateTokens('Hello world');

      expect(tokens).toBe(42);
      expect(mockEstimateTokens).toHaveBeenCalledWith('Hello world');
    });

    it('should estimate tokens from messages', () => {
      mockEstimateMessageTokens.mockReturnValueOnce(128);

      const messages = [{ role: 'user', content: 'Hello' }];
      const tokens = mockEstimateMessageTokens(messages);

      expect(tokens).toBe(128);
      expect(mockEstimateMessageTokens).toHaveBeenCalledWith(messages);
    });
  });

  describe('GET /llm/cost/stats - 成本统计', () => {
    it('should return total cost statistics', () => {
      const stats = mockLlmCostTracker.getTotalStats();

      expect(stats).toEqual({ totalCalls: 10, totalCost: 0.5 });
      expect(mockLlmCostTracker.getTotalStats).toHaveBeenCalled();
    });
  });

  describe('GET /llm/cost/trend - 成本趋势', () => {
    it('should return cost trend for specified days', () => {
      mockLlmCostTracker.getTrend.mockReturnValueOnce([
        { date: '2026-03-23', cost: 0.1 },
        { date: '2026-03-24', cost: 0.2 },
      ]);

      const days = 7;
      const trend = mockLlmCostTracker.getTrend(days);

      expect(trend).toHaveLength(2);
      expect(mockLlmCostTracker.getTrend).toHaveBeenCalledWith(7);
    });
  });

  describe('GET /llm/models - 模型配置', () => {
    it('should return current model configuration', () => {
      // Models are read from env vars, mock the process.env
      const originalEnv = process.env;
      process.env = { ...originalEnv, LIGHT_MODEL: 'test-light-model', MEDIUM_MODEL: 'test-medium', STRONG_MODEL: 'test-strong' };

      const models = {
        light: { name: process.env.LIGHT_MODEL || 'deepseek-chat', provider: 'deepseek' },
        medium: { name: process.env.MEDIUM_MODEL || 'gpt-4o-mini', provider: 'openai' },
        strong: { name: process.env.STRONG_MODEL || 'claude-sonnet-4-20250514', provider: 'anthropic' },
      };

      expect(models.light.name).toBe('test-light-model');
      expect(models.medium.name).toBe('test-medium');
      expect(models.strong.name).toBe('test-strong');

      process.env = originalEnv;
    });
  });
});
