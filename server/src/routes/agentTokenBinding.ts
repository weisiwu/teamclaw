/**
 * Agent-Token 绑定路由
 * /api/v1/admin/agents/:name/token-bindings
 * /api/v1/admin/agent-token-bindings/:id
 * /api/v1/admin/token-bindings/overview
 */

import { Router } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { auditService } from '../services/auditService.js';
import { agentTokenBindingService } from '../services/agentTokenBindingService.js';
import { apiTokenService } from '../services/apiTokenService.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { CreateBindingParams, UpdateBindingParams, ModelTier } from '../models/agentTokenBinding.js';

const router = Router();

// ========== 中间件 ==========
router.use(requireAdmin);

// ========== 辅助函数 ==========

function getClientInfo(req: AuthRequest) {
  return {
    ipAddress: req.ip || req.socket.remoteAddress as string | undefined,
    userAgent: req.headers['user-agent'] as string | undefined,
  };
}

// ========== 路由实现 ==========

/**
 * GET /api/v1/admin/agents/:name/token-bindings
 * 获取 Agent 的 Token 绑定列表
 */
router.get('/agents/:name/token-bindings', async (req: AuthRequest, res) => {
  try {
    const { name } = req.params;
    const bindings = await agentTokenBindingService.getBindingsByAgent(name, false);

    // 填充 Token 详情
    const tokens = await apiTokenService.getAllTokens(true);
    const tokenMap = new Map(tokens.map((t) => [t.id, t]));

    const result = bindings.map((b) => ({
      ...b,
      token: tokenMap.get(b.tokenId) || null,
    }));

    res.json(success(result));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to list bindings:', err);
    res.status(500).json(error(500, 'Failed to list bindings'));
  }
});

/**
 * POST /api/v1/admin/agents/:name/token-bindings
 * 为 Agent 添加 Token 绑定
 */
router.post('/agents/:name/token-bindings', async (req: AuthRequest, res) => {
  try {
    const { name } = req.params;
    const params = req.body as CreateBindingParams;
    const actor = req.user?.id || 'unknown';

    // 验证必填字段
    if (!params.tokenId) {
      res.status(400).json(error(400, 'Missing required field: tokenId'));
      return;
    }

    // 验证 tokenId 对应的 Token 是否存在
    const token = await apiTokenService.getTokenById(params.tokenId);
    if (!token) {
      res.status(400).json(error(400, 'Token not found'));
      return;
    }

    // 验证 tierFilter（如果提供）
    if (params.tierFilter) {
      const validTiers: ModelTier[] = ['light', 'medium', 'strong'];
      const invalid = params.tierFilter.filter((t) => !validTiers.includes(t));
      if (invalid.length > 0) {
        res.status(400).json(error(400, `Invalid tierFilter: ${invalid.join(', ')}. Must be one of: ${validTiers.join(', ')}`));
        return;
      }
    }

    // 验证 priority
    if (params.priority === undefined) {
      params.priority = 100;
    }

    const binding = await agentTokenBindingService.createBinding({
      agentName: name,
      tokenId: params.tokenId,
      priority: params.priority,
      modelFilter: params.modelFilter,
      tierFilter: params.tierFilter,
      enabled: params.enabled !== undefined ? params.enabled : true,
    });

    // 审计日志
    auditService.log({
      action: 'agent_token_binding.create',
      actor,
      target: binding.id,
      details: {
        agentName: name,
        tokenId: params.tokenId,
        priority: binding.priority,
        tierFilter: binding.tierFilter,
      },
      ...getClientInfo(req),
    });

    res.status(201).json(success(binding));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to create binding:', err);
    res.status(500).json(error(500, 'Failed to create binding'));
  }
});

/**
 * PUT /api/v1/admin/agent-token-bindings/:id
 * 更新绑定规则
 */
router.put('/agent-token-bindings/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const params = req.body as UpdateBindingParams;
    const actor = req.user?.id || 'unknown';

    // 如果更新 tokenId，验证新的 Token 是否存在
    if (params.tokenId) {
      const token = await apiTokenService.getTokenById(params.tokenId);
      if (!token) {
        res.status(400).json(error(400, 'Token not found'));
        return;
      }
    }

    // 验证 tierFilter（如果提供）
    if (params.tierFilter) {
      const validTiers: ModelTier[] = ['light', 'medium', 'strong'];
      const invalid = params.tierFilter.filter((t) => !validTiers.includes(t));
      if (invalid.length > 0) {
        res.status(400).json(error(400, `Invalid tierFilter: ${invalid.join(', ')}. Must be one of: ${validTiers.join(', ')}`));
        return;
      }
    }

    const binding = await agentTokenBindingService.updateBinding(id, params);

    if (!binding) {
      res.status(404).json(error(404, 'Binding not found'));
      return;
    }

    // 审计日志
    auditService.log({
      action: 'agent_token_binding.update',
      actor,
      target: id,
      details: {
        updatedFields: Object.keys(params),
        binding,
      },
      ...getClientInfo(req),
    });

    res.json(success(binding));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to update binding:', err);
    res.status(500).json(error(500, 'Failed to update binding'));
  }
});

/**
 * DELETE /api/v1/admin/agent-token-bindings/:id
 * 删除绑定
 */
router.delete('/agent-token-bindings/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const actor = req.user?.id || 'unknown';

    // 获取绑定信息用于审计
    const existing = await agentTokenBindingService.getBindingById(id);
    if (!existing) {
      res.status(404).json(error(404, 'Binding not found'));
      return;
    }

    const deleted = await agentTokenBindingService.deleteBinding(id);

    if (!deleted) {
      res.status(500).json(error(500, 'Failed to delete binding'));
      return;
    }

    // 审计日志
    auditService.log({
      action: 'agent_token_binding.delete',
      actor,
      target: id,
      details: {
        agentName: existing.agentName,
        tokenId: existing.tokenId,
        priority: existing.priority,
      },
      ...getClientInfo(req),
    });

    res.json(success({ deleted: true }));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to delete binding:', err);
    res.status(500).json(error(500, 'Failed to delete binding'));
  }
});

/**
 * GET /api/v1/admin/token-bindings/overview
 * 全局绑定概览（矩阵视图数据）
 */
router.get('/token-bindings/overview', async (req: AuthRequest, res) => {
  try {
    const overview = await agentTokenBindingService.getBindingOverview();
    res.json(success(overview));
  } catch (err) {
    console.error('[agentTokenBinding] Failed to get overview:', err);
    res.status(500).json(error(500, 'Failed to get overview'));
  }
});

export default router;
