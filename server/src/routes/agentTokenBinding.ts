/**
 * Agent Token Binding 路由
 * /api/v1/admin/agents/:name/token-bindings
 * /api/v1/admin/agent-token-bindings
 */

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { agentTokenBindingService } from '../services/agentTokenBindingService.js';
import { tokenResolver } from '../services/tokenResolver.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { CreateAgentTokenBindingParams, UpdateAgentTokenBindingParams } from '../models/agentTokenBinding.js';
import { AGENT_TEAM } from '../constants/agents.js';

const router = Router();

/**
 * GET /api/v1/admin/agents/:name/token-bindings
 * 获取指定 Agent 的 Token 绑定列表
 */
router.get('/agents/:name/token-bindings', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;

    // 验证 Agent 是否存在
    const agent = AGENT_TEAM.find(a => a.name === name);
    if (!agent) {
      res.status(404).json(error(404, `Agent ${name} not found`));
      return;
    }

    const bindings = await agentTokenBindingService.getBindingsByAgent(name);
    res.json(success(bindings));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to get bindings:', err);
    res.status(500).json(error(500, 'Failed to get token bindings'));
  }
});

/**
 * POST /api/v1/admin/agents/:name/token-bindings
 * 为 Agent 添加 Token 绑定
 */
router.post('/agents/:name/token-bindings', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const params = req.body as CreateAgentTokenBindingParams;

    // 验证 Agent 是否存在
    const agent = AGENT_TEAM.find(a => a.name === name);
    if (!agent) {
      res.status(404).json(error(404, `Agent ${name} not found`));
      return;
    }

    // 验证必填字段
    if (!params.tokenId) {
      res.status(400).json(error(400, 'Missing required field: tokenId'));
      return;
    }

    // 验证 tierFilter
    if (params.tierFilter) {
      const validTiers = ['light', 'medium', 'strong'];
      for (const tier of params.tierFilter) {
        if (!validTiers.includes(tier)) {
          res.status(400).json(error(400, `Invalid tier: ${tier}. Must be one of: ${validTiers.join(', ')}`));
          return;
        }
      }
    }

    const binding = await agentTokenBindingService.createBinding({
      ...params,
      agentName: name,
    });

    res.status(201).json(success(binding));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to create binding:', err);
    if (err instanceof Error) {
      if (err.message.includes('not found')) {
        res.status(404).json(error(404, err.message));
        return;
      }
      if (err.message.includes('already exists')) {
        res.status(409).json(error(409, err.message));
        return;
      }
    }
    res.status(500).json(error(500, 'Failed to create token binding'));
  }
});

/**
 * PUT /api/v1/admin/agent-token-bindings/:id
 * 更新绑定规则
 */
router.put('/agent-token-bindings/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const params = req.body as UpdateAgentTokenBindingParams;

    // 验证 tierFilter
    if (params.tierFilter) {
      const validTiers = ['light', 'medium', 'strong'];
      for (const tier of params.tierFilter) {
        if (!validTiers.includes(tier)) {
          res.status(400).json(error(400, `Invalid tier: ${tier}. Must be one of: ${validTiers.join(', ')}`));
          return;
        }
      }
    }

    // 验证 priority
    if (params.priority !== undefined && (params.priority < 1 || params.priority > 100)) {
      res.status(400).json(error(400, 'Priority must be between 1 and 100'));
      return;
    }

    const binding = await agentTokenBindingService.updateBinding(id, params);

    if (!binding) {
      res.status(404).json(error(404, 'Binding not found'));
      return;
    }

    res.json(success(binding));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to update binding:', err);
    res.status(500).json(error(500, 'Failed to update token binding'));
  }
});

/**
 * DELETE /api/v1/admin/agent-token-bindings/:id
 * 删除绑定
 */
router.delete('/agent-token-bindings/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await agentTokenBindingService.deleteBinding(id);

    if (!deleted) {
      res.status(404).json(error(404, 'Binding not found'));
      return;
    }

    res.json(success({ deleted: true }));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to delete binding:', err);
    res.status(500).json(error(500, 'Failed to delete token binding'));
  }
});

/**
 * GET /api/v1/admin/token-bindings/overview
 * 全局绑定概览（矩阵视图数据）
 */
router.get('/token-bindings/overview', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const overview = await agentTokenBindingService.getBindingOverview();
    res.json(success(overview));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to get overview:', err);
    res.status(500).json(error(500, 'Failed to get binding overview'));
  }
});

/**
 * GET /api/v1/admin/token-bindings/stats
 * 获取绑定统计信息
 */
router.get('/token-bindings/stats', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const stats = await agentTokenBindingService.getBindingStats();
    res.json(success(stats));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to get stats:', err);
    res.status(500).json(error(500, 'Failed to get binding stats'));
  }
});

/**
 * POST /api/v1/admin/token-bindings/resolve
 * 测试 Token 调度（调试用）
 */
router.post('/token-bindings/resolve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { agentName, tier, preferredModel } = req.body as {
      agentName: string;
      tier: 'light' | 'medium' | 'strong';
      preferredModel?: string;
    };

    if (!agentName || !tier) {
      res.status(400).json(error(400, 'Missing required fields: agentName, tier'));
      return;
    }

    const result = await tokenResolver.scheduleToken({
      agentName,
      tier,
      preferredModel,
    });

    // 脱敏 API Key
    if (result.success && result.token) {
      const maskedKey = result.token.apiKey.slice(0, 3) + '...' + result.token.apiKey.slice(-3);
      res.json(success({
        ...result,
        token: {
          ...result.token,
          apiKey: maskedKey,
        },
      }));
    } else {
      res.json(success(result));
    }
  } catch (err) {
    console.error('[agentTokenBinding] Failed to resolve token:', err);
    res.status(500).json(error(500, 'Failed to resolve token'));
  }
});

/**
 * PATCH /api/v1/admin/agent-token-bindings/:id/enable
 * 启用/禁用绑定
 */
router.patch('/agent-token-bindings/:id/enable', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body as { enabled: boolean };

    if (typeof enabled !== 'boolean') {
      res.status(400).json(error(400, 'enabled must be a boolean'));
      return;
    }

    const binding = await agentTokenBindingService.toggleBindingEnabled(id, enabled);

    if (!binding) {
      res.status(404).json(error(404, 'Binding not found'));
      return;
    }

    res.json(success(binding));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to toggle binding:', err);
    res.status(500).json(error(500, 'Failed to toggle binding'));
  }
});

export default router;
