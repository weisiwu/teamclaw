/**
 * Tool Routes
 * /api/v1/tools
 */

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { toolService } from '../services/toolService.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { CreateToolParams, UpdateToolParams, ToolCategory } from '../models/tool.js';

const router = Router();

/**
 * GET /api/v1/tools
 * 获取所有 Tools
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const includeDisabled = req.query.includeDisabled === 'true';
    const category = req.query.category as ToolCategory | undefined;

    let tools;
    if (category) {
      tools = await toolService.getToolsByCategory(category);
      if (!includeDisabled) {
        tools = tools.filter(t => t.enabled);
      }
    } else {
      tools = await toolService.getAllTools(includeDisabled);
    }

    res.json(success(tools));
  } catch (err) {
    console.error('[tool] Failed to list tools:', err);
    res.status(500).json(error(500, 'Failed to list tools'));
  }
});

/**
 * GET /api/v1/tools/categories
 * 获取所有 Tool 类别
 */
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = ['file', 'git', 'shell', 'api', 'browser', 'custom'];
    res.json(success(categories));
  } catch (err) {
    console.error('[tool] Failed to get categories:', err);
    res.status(500).json(error(500, 'Failed to get categories'));
  }
});

/**
 * GET /api/v1/tools/risk-stats
 * 获取 Tool 风险级别统计
 */
router.get('/risk-stats', async (_req: Request, res: Response) => {
  try {
    const stats = await toolService.getToolRiskStats();
    res.json(success(stats));
  } catch (err) {
    console.error('[tool] Failed to get risk stats:', err);
    res.status(500).json(error(500, 'Failed to get risk stats'));
  }
});

/**
 * GET /api/v1/tools/:id
 * 获取单个 Tool 详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tool = await toolService.getToolById(id);

    if (!tool) {
      res.status(404).json(error(404, 'Tool not found'));
      return;
    }

    res.json(success(tool));
  } catch (err) {
    console.error('[tool] Failed to get tool:', err);
    res.status(500).json(error(500, 'Failed to get tool'));
  }
});

/**
 * POST /api/v1/tools
 * 创建新 Tool（仅管理员）
 */
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const params = req.body as CreateToolParams;
    const createdBy = req.user?.id || 'unknown';

    // 验证必填字段
    if (!params.name || !params.displayName || !params.description || !params.category) {
      res.status(400).json(error(400, 'Missing required fields: name, displayName, description, category'));
      return;
    }

    // 验证名称格式（只允许字母、数字、下划线、连字符）
    if (!/^[a-zA-Z0-9_-]+$/.test(params.name)) {
      res.status(400).json(error(400, 'Invalid name format. Only alphanumeric, underscore, and hyphen allowed'));
      return;
    }

    // 验证 category
    const validCategories = ['file', 'git', 'shell', 'api', 'browser', 'custom'];
    if (!validCategories.includes(params.category)) {
      res.status(400).json(error(400, `Invalid category. Must be one of: ${validCategories.join(', ')}`));
      return;
    }

    const tool = await toolService.createTool(params, createdBy);
    res.status(201).json(success(tool));
  } catch (err) {
    console.error('[tool] Failed to create tool:', err);
    if (err instanceof Error && err.message.includes('already exists')) {
      res.status(409).json(error(409, err.message));
      return;
    }
    res.status(500).json(error(500, 'Failed to create tool'));
  }
});

/**
 * PUT /api/v1/tools/:id
 * 更新 Tool（仅管理员）
 */
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const params = req.body as UpdateToolParams;

    // 验证 riskLevel
    if (params.riskLevel && !['low', 'medium', 'high'].includes(params.riskLevel)) {
      res.status(400).json(error(400, 'Invalid riskLevel. Must be: low, medium, or high'));
      return;
    }

    const tool = await toolService.updateTool(id, params);

    if (!tool) {
      res.status(404).json(error(404, 'Tool not found'));
      return;
    }

    res.json(success(tool));
  } catch (err) {
    console.error('[tool] Failed to update tool:', err);
    if (err instanceof Error && err.message.includes('builtin')) {
      res.status(403).json(error(403, err.message));
      return;
    }
    res.status(500).json(error(500, 'Failed to update tool'));
  }
});

/**
 * DELETE /api/v1/tools/:id
 * 删除 Tool（仅管理员）
 */
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await toolService.deleteTool(id);

    if (!deleted) {
      res.status(404).json(error(404, 'Tool not found'));
      return;
    }

    res.json(success({ deleted: true }));
  } catch (err) {
    console.error('[tool] Failed to delete tool:', err);
    if (err instanceof Error && err.message.includes('builtin')) {
      res.status(403).json(error(403, err.message));
      return;
    }
    res.status(500).json(error(500, 'Failed to delete tool'));
  }
});

/**
 * PATCH /api/v1/tools/:id/enable
 * 启用/禁用 Tool（仅管理员）
 */
router.patch('/:id/enable', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body as { enabled: boolean };

    if (typeof enabled !== 'boolean') {
      res.status(400).json(error(400, 'enabled must be a boolean'));
      return;
    }

    const tool = await toolService.toggleToolEnabled(id, enabled);

    if (!tool) {
      res.status(404).json(error(404, 'Tool not found'));
      return;
    }

    res.json(success(tool));
  } catch (err) {
    console.error('[tool] Failed to toggle tool:', err);
    res.status(500).json(error(500, 'Failed to toggle tool'));
  }
});

export default router;
