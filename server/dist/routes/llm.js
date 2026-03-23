/**
 * LLM API 路由
 * 提供模型调用、成本查询等接口
 */
import { Router } from 'express';
import { llmCall, llmCallLight, llmCallMedium, llmCallStrong, llmAutoRoute, estimateComplexity, selectTierByComplexity, estimateMessageTokens, estimateTokens, } from '../services/llmService.js';
import { llmCostTracker, withCostTracking } from '../services/llmCostTracker.js';
import { success, error } from '../utils/response.js';
const router = Router();
// ============ 核心调用接口 ============
/**
 * POST /api/v1/llm/call
 * 通用 LLM 调用接口
 */
router.post('/call', async (req, res) => {
    try {
        const { tier, messages, maxTokens, temperature, fallback } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json(error(400, 'messages is required and must be an array', 'BAD_REQUEST'));
        }
        const { result: response, responseMs } = await withCostTracking(tier || 'medium', async () => {
            return llmCall({ tier: tier || 'medium', messages, maxTokens, temperature }, fallback !== false ? ['strong'] : []);
        });
        llmCostTracker.record(response, responseMs, tier || 'medium');
        res.json(success({
            content: response.content,
            usage: response.usage,
            model: response.model,
            provider: response.provider,
            responseMs,
        }));
    }
    catch (err) {
        res.status(500).json(error(500, err instanceof Error ? err.message : String(err), 'INTERNAL_ERROR'));
    }
});
/**
 * POST /api/v1/llm/light
 * 轻量模型调用
 */
router.post('/light', async (req, res) => {
    try {
        const { messages, fallback } = req.body;
        if (!messages)
            return res.status(400).json(error(400, 'messages required', 'BAD_REQUEST'));
        const { result: response, responseMs } = await withCostTracking('light', async () => {
            return llmCallLight(messages, fallback !== false);
        });
        llmCostTracker.record(response, responseMs, 'light');
        res.json(success({ content: response.content, usage: response.usage, responseMs }));
    }
    catch (err) {
        res.status(500).json(error(500, err instanceof Error ? err.message : String(err), 'INTERNAL_ERROR'));
    }
});
/**
 * POST /api/v1/llm/medium
 * 中等模型调用
 */
router.post('/medium', async (req, res) => {
    try {
        const { messages, fallback } = req.body;
        if (!messages)
            return res.status(400).json(error(400, 'messages required', 'BAD_REQUEST'));
        const { result: response, responseMs } = await withCostTracking('medium', async () => {
            return llmCallMedium(messages, fallback !== false);
        });
        llmCostTracker.record(response, responseMs, 'medium');
        res.json(success({ content: response.content, usage: response.usage, responseMs }));
    }
    catch (err) {
        res.status(500).json(error(500, err instanceof Error ? err.message : String(err), 'INTERNAL_ERROR'));
    }
});
/**
 * POST /api/v1/llm/strong
 * 强力模型调用
 */
router.post('/strong', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages)
            return res.status(400).json(error(400, 'messages required', 'BAD_REQUEST'));
        const { result: response, responseMs } = await withCostTracking('strong', async () => {
            return llmCallStrong(messages);
        });
        llmCostTracker.record(response, responseMs, 'strong');
        res.json(success({ content: response.content, usage: response.usage, responseMs }));
    }
    catch (err) {
        res.status(500).json(error(500, err instanceof Error ? err.message : String(err), 'INTERNAL_ERROR'));
    }
});
/**
 * POST /api/v1/llm/auto-route
 * 自动路由：根据任务复杂度选择模型
 */
router.post('/auto-route', async (req, res) => {
    try {
        const { messages, overrideTier } = req.body;
        if (!messages)
            return res.status(400).json(error(400, 'messages required', 'BAD_REQUEST'));
        const userText = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
        const complexity = estimateComplexity(userText);
        const tier = overrideTier || selectTierByComplexity(complexity);
        const { result: response, responseMs } = await withCostTracking(tier, async () => {
            return llmAutoRoute(messages, overrideTier);
        });
        llmCostTracker.record(response, responseMs, tier);
        res.json(success({
            content: response.content,
            usage: response.usage,
            model: response.model,
            provider: response.provider,
            complexity,
            selectedTier: tier,
            responseMs,
        }));
    }
    catch (err) {
        res.status(500).json(error(500, err instanceof Error ? err.message : String(err), 'INTERNAL_ERROR'));
    }
});
// ============ 工具接口 ============
/**
 * POST /api/v1/llm/estimate
 * 估算 token 数量和成本
 */
router.post('/estimate', async (req, res) => {
    try {
        const { text, messages } = req.body;
        if (text) {
            const tokens = estimateTokens(text);
            res.json(success({ tokens, estimatedChars: text.length }));
            return;
        }
        if (messages) {
            const tokens = estimateMessageTokens(messages);
            res.json(success({ tokens, messageCount: messages.length }));
            return;
        }
        res.status(400).json(error(400, 'text or messages required', 'BAD_REQUEST'));
    }
    catch (err) {
        res.status(500).json(error(500, err instanceof Error ? err.message : String(err), 'INTERNAL_ERROR'));
    }
});
// ============ 成本统计接口 ============
/**
 * GET /api/v1/llm/cost/stats
 * 获取总成本统计
 */
router.get('/cost/stats', (_req, res) => {
    res.json(success(llmCostTracker.getTotalStats()));
});
/**
 * GET /api/v1/llm/cost/trend
 * 获取成本趋势
 */
router.get('/cost/trend', (req, res) => {
    const days = parseInt(req.query.days) || 7;
    res.json(success(llmCostTracker.getTrend(days)));
});
/**
 * GET /api/v1/llm/cost/daily/:date
 * 获取指定日期的成本统计
 */
router.get('/cost/daily/:date', (req, res) => {
    const stats = llmCostTracker.getDailyStats(req.params.date);
    if (!stats) {
        return res.status(404).json(error(404, 'No data for this date', 'NOT_FOUND'));
    }
    res.json(success(stats));
});
/**
 * GET /api/v1/llm/cost/recent
 * 获取最近调用记录
 */
router.get('/cost/recent', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    res.json(success(llmCostTracker.getRecentRecords(limit)));
});
/**
 * GET /api/v1/llm/models
 * 获取当前模型配置
 */
router.get('/models', (_req, res) => {
    res.json(success({
        light: { name: process.env.LIGHT_MODEL || 'deepseek-chat', provider: 'deepseek' },
        medium: { name: process.env.MEDIUM_MODEL || 'gpt-4o-mini', provider: 'openai' },
        strong: { name: process.env.STRONG_MODEL || 'claude-sonnet-4-20250514', provider: 'anthropic' },
    }));
});
export default router;
