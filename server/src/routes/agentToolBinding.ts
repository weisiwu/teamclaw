/**
 * Agent-Tool Binding 路由
 * /api/v1/agents/:name/tools        - 获取/设置 Agent 的 Tool 权限
 * /api/v1/tools/:id/agents         - 获取 Tool 被哪些 Agent 使用
 * /api/v1/agent-tool-matrix        - 全局绑定矩阵
 */

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { agentToolBindingService } from '../services/agentToolBindingService.js';
import { toolService } from '../services/toolService.js';
import { AGENT_TEAM } from '../constants/agents.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { UpdateAgentToolBindingParams } from '../models/agentToolBinding.js';

const router = Router();

// ========== GET /api/v1/agents/:name/tools ==========

/**
 * 获取 Agent 可用的 Tool 列表（含绑定状态）
 */
router.get('/agents/:name/tools', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    // 验证 Agent 是否存在
    const agent = AGENT_TEAM.find(a => a.name === name);
    if (!agent) {
      res.status(404).json(error(404, `Agent ${name} not found`));
      return;
    }

    // 获取所有 Tool（含绑定信息）
    const allTools = await toolService.getAllTools(true);
    const bindings = await agentToolBindingService.getBindingsByAgent(name);

    // 构建完整列表：所有 Tool + 该 Agent 的绑定状态
    const bindingMap = new Map(bindings.map(b => [b.toolId, b]));

    const result = allTools.map(tool => {
      const binding = bindingMap.get(tool.id);
      return {
        toolId: tool.id,
        toolName: tool.name,
        toolDisplayName: tool.displayName,
        toolCategory: tool.category,
        toolRiskLevel: tool.riskLevel,
        toolEnabled: tool.enabled,
        toolRequiresApproval: tool.requiresApproval,
        // 该 Agent 的绑定状态（无绑定时继承 Tool 全局设置）
        enabled: binding?.enabled ?? tool.enabled,
        requiresApproval: binding?.requiresApproval ?? tool.requiresApproval,
        hasExplicitBinding: bindingMap.has(tool.id),
      };
    });

    res.json(success(result));
  } catch (err) {
    console.error('[agentToolBinding] Failed to get agent tools:', err);
    res.status(500).json(error(500, 'Failed to get agent tools'));
  }
});

// ========== PUT /api/v1/agents/:name/tools ==========

/**
 * 批量设置 Agent 的 Tool 权限
 */
router.put('/agents/:name/tools', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const { bindings } = req.body as {
      bindings: Array<{ toolId: string; enabled: boolean; requiresApproval?: boolean }>;
    };

    // 验证 Agent 是否存在
    const agent = AGENT_TEAM.find(a => a.name === name);
    if (!agent) {
      res.status(404).json(error(404, `Agent ${name} not found`));
      return;
    }

    if (!Array.isArray(bindings)) {
      res.status(400).json(error(400, 'bindings must be an array'));
      return;
    }

    // 验证每个 binding
    for (const b of bindings) {
      if (!b.toolId) {
        res.status(400).json(error(400, 'Each binding must have toolId'));
        return;
      }
      const tool = await toolService.getToolById(b.toolId);
      if (!tool) {
        res.status(404).json(error(404, `Tool ${b.toolId} not found`));
        return;
      }
    }

    const results = await agentToolBindingService.setAgentToolBindings(name, bindings);
    res.json(success(results));
  } catch (err) {
    console.error('[agentToolBinding] Failed to set agent tools:', err);
    res.status(500).json(error(500, 'Failed to set agent tool bindings'));
  }
});

// ========== GET /api/v1/tools/:id/agents ==========

/**
 * 获取 Tool 被哪些 Agent 使用
 */
router.get('/tools/:id/agents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证 Tool 是否存在
    const tool = await toolService.getToolById(id);
    if (!tool) {
      res.status(404).json(error(404, 'Tool not found'));
      return;
    }

    const bindings = await agentToolBindingService.getBindingsByTool(id);

    // 补充 Agent 显示名称
    const result = bindings.map(binding => {
      const agent = AGENT_TEAM.find(a => a.name === binding.agentName);
      return {
        ...binding,
        agentDisplayName: agent?.role,
      };
    });

    res.json(success(result));
  } catch (err) {
    console.error('[agentToolBinding] Failed to get tool agents:', err);
    res.status(500).json(error(500, 'Failed to get tool agents'));
  }
});

// ========== GET /api/v1/agent-tool-matrix ==========

/**
 * 全局绑定矩阵（Agent × Tool）
 */
router.get('/agent-tool-matrix', async (_req: Request, res: Response) => {
  try {
    const matrix = await agentToolBindingService.getAgentToolMatrix();
    res.json(success(matrix));
  } catch (err) {
    console.error('[agentToolBinding] Failed to get matrix:', err);
    res.status(500).json(error(500, 'Failed to get agent-tool matrix'));
  }
});

// ========== PATCH /api/v1/agent-tool-bindings/:id ==========

/**
 * 更新单个绑定（启用/禁用、审批设置）
 */
router.patch('/agent-tool-bindings/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const params = req.body as UpdateAgentToolBindingParams;

    const binding = await agentToolBindingService.updateBinding(id, params);

    if (!binding) {
      res.status(404).json(error(404, 'Binding not found'));
      return;
    }

    res.json(success(binding));
  } catch (err) {
    console.error('[agentToolBinding] Failed to update binding:', err);
    res.status(500).json(error(500, 'Failed to update binding'));
  }
});

// ========== DELETE /api/v1/agent-tool-bindings/:id ==========

/**
 * 删除绑定
 */
router.delete('/agent-tool-bindings/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await agentToolBindingService.deleteBinding(id);

    if (!deleted) {
      res.status(404).json(error(404, 'Binding not found'));
      return;
    }

    res.json(success({ deleted: true }));
  } catch (err) {
    console.error('[agentToolBinding] Failed to delete binding:', err);
    res.status(500).json(error(500, 'Failed to delete binding'));
  }
});

// ========== GET /api/v1/agent-tool-bindings/stats ==========

/**
 * 获取绑定统计
 */
router.get('/agent-tool-bindings/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await agentToolBindingService.getBindingStats();
    res.json(success(stats));
  } catch (err) {
    console.error('[agentToolBinding] Failed to get stats:', err);
    res.status(500).json(error(500, 'Failed to get binding stats'));
  }
});

// ========== POST /api/v1/agent-tool-bindings/check ==========

/**
 * 权限检查（用于调试/测试）
 */
router.post('/agent-tool-bindings/check', async (req: Request, res: Response) => {
  try {
    const { agentName, toolId } = req.body as { agentName: string; toolId: string };

    if (!agentName || !toolId) {
      res.status(400).json(error(400, 'agentName and toolId are required'));
      return;
    }

    const [canUseResult, needsApprovalResult] = await Promise.all([
      agentToolBindingService.canUse(agentName, toolId),
      agentToolBindingService.needsApproval(agentName, toolId),
    ]);

    res.json(success({
      agentName,
      toolId,
      canUse: canUseResult,
      needsApproval: needsApprovalResult,
    }));
  } catch (err) {
    console.error('[agentToolBinding] Failed to check permission:', err);
    res.status(500).json(error(500, 'Failed to check permission'));
  }
});

export default router;
