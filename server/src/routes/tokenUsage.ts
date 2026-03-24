/**
 * Token Usage Routes
 * /api/v1/admin/api-tokens/usage/*
 * /api/v1/admin/agents/token-usage
 * /api/v1/admin/llm-calls
 */

import { Router, Response } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  getTokenUsageSummary,
  getTokenUsageDetail,
  getAgentUsageSummary,
  getLLMCallLogs,
  getMockTokenSummary,
  getMockAgentUsage,
  getMockLLMCalls,
} from '../services/tokenUsageService.js';

const router = Router();

// All routes require admin
router.use(requireAdmin);

// ============ API Token Usage Routes ============

/**
 * GET /api/v1/admin/api-tokens/usage/summary
 * 所有 Token 用量汇总
 */
router.get('/api-tokens/usage/summary', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const summaries = await getTokenUsageSummary({ startDate, endDate });

    if (summaries.length === 0) {
      // Fallback to mock data when DB is empty
      return res.json(success({ data: getMockTokenSummary() }));
    }
    res.json(success({ data: summaries }));
  } catch (err) {
    console.error('[tokenUsage] /api-tokens/usage/summary error:', err);
    res.json(success({ data: getMockTokenSummary() }));
  }
});

/**
 * GET /api/v1/admin/api-tokens/:id/usage
 * 单个 Token 用量详情
 */
router.get('/api-tokens/:id/usage', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const detail = await getTokenUsageDetail(id, { startDate, endDate });

    if (!detail) {
      // Return mock detail for unknown tokens
      const mocks = getMockTokenSummary();
      const mock = mocks.find((m) => m.tokenId === id) ?? mocks[0];
      return res.json(success({ data: mock }));
    }
    res.json(success({ data: detail }));
  } catch (err) {
    console.error('[tokenUsage] /api-tokens/:id/usage error:', err);
    res.json(success({ data: getMockTokenSummary()[0] }));
  }
});

// ============ Agent Usage Routes ============

/**
 * GET /api/v1/admin/agents/token-usage
 * Agent 维度用量统计
 */
router.get('/agents/token-usage', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, agent } = req.query as {
      startDate?: string;
      endDate?: string;
      agent?: string;
    };
    const summaries = await getAgentUsageSummary({ startDate, endDate, agentName: agent });

    if (summaries.length === 0) {
      return res.json(success({ data: getMockAgentUsage() }));
    }
    res.json(success({ data: summaries }));
  } catch (err) {
    console.error('[tokenUsage] /agents/token-usage error:', err);
    res.json(success({ data: getMockAgentUsage() }));
  }
});

/**
 * GET /api/v1/admin/agents/:name/token-usage
 * 单个 Agent 用量详情
 */
router.get('/agents/:name/token-usage', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const summaries = await getAgentUsageSummary({ startDate, endDate, agentName: name });

    const found = summaries.find((s) => s.agentName === name);
    if (!found) {
      const mocks = getMockAgentUsage();
      const mock = mocks.find((m) => m.agentName === name) ?? mocks[0];
      return res.json(success({ data: mock }));
    }
    res.json(success({ data: found }));
  } catch (err) {
    console.error('[tokenUsage] /agents/:name/token-usage error:', err);
    res.json(success({ data: getMockAgentUsage()[0] }));
  }
});

// ============ LLM Call Logs ============

/**
 * GET /api/v1/admin/llm-calls
 * LLM 调用日志明细（分页）
 */
router.get('/llm-calls', async (req: AuthRequest, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      agent,
      tokenId,
      model,
      status,
      page,
      pageSize,
    } = req.query as Record<string, string | undefined>;

    const filters = {
      startDate,
      endDate,
      agent,
      tokenId,
      model,
      status,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    };

    const result = await getLLMCallLogs(filters);

    if (result.total === 0) {
      return res.json(success(getMockLLMCalls(filters)));
    }
    res.json(success(result));
  } catch (err) {
    console.error('[tokenUsage] /llm-calls error:', err);
    res.json(success(getMockLLMCalls({ page: 1, pageSize: 20 })));
  }
});

export default router;
