// Tool API 路由

import { Router } from 'express';
import { toolService } from '../services/toolService.js';
import { success, error } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// 获取所有工具
router.get('/', (req, res) => {
  const { category, source, q } = req.query;
  let list = toolService.getTools();

  if (category) {
    list = toolService.getToolsByCategory(category as string);
  }
  if (source) {
    list = toolService.getToolsBySource(source as string);
  }
  if (q) {
    list = toolService.searchTools(q as string);
  }

  res.json(success({ list }));
});

// 获取单个工具
router.get('/:id', (req, res) => {
  const tool = toolService.getTool(req.params.id);
  if (!tool) {
    return res.status(404).json(error(404, '工具不存在', 'TOOL_NOT_FOUND'));
  }
  res.json(success(tool));
});

// 创建工具（仅管理员）
router.post('/', requireAuth, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'admin' && userRole !== 'vice_admin') {
    return res.status(403).json(error(403, '只有管理员可以创建工具', 'FORBIDDEN'));
  }

  const { name, displayName, description, category, source, parameters, outputSchema, riskLevel, requiresApproval } = req.body;

  if (!name || !displayName || !description || !category) {
    return res.status(400).json(error(400, '缺少必填字段', 'INVALID_PARAMS'));
  }

  const tool = toolService.createTool({
    name,
    displayName,
    description,
    category,
    source: 'user',
    enabled: true,
    parameters: parameters || [],
    outputSchema,
    riskLevel: riskLevel || 'medium',
    requiresApproval: requiresApproval ?? false,
    version: '1.0.0',
  });

  res.json(success(tool));
});

// 更新工具（仅管理员）
router.put('/:id', requireAuth, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'admin' && userRole !== 'vice_admin') {
    return res.status(403).json(error(403, '只有管理员可以更新工具', 'FORBIDDEN'));
  }

  const tool = toolService.updateTool(req.params.id, req.body);
  if (!tool) {
    return res.status(404).json(error(404, '工具不存在', 'TOOL_NOT_FOUND'));
  }
  res.json(success(tool));
});

// 删除工具（仅管理员）
router.delete('/:id', requireAuth, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'admin' && userRole !== 'vice_admin') {
    return res.status(403).json(error(403, '只有管理员可以删除工具', 'FORBIDDEN'));
  }

  const deleted = toolService.deleteTool(req.params.id);
  if (!deleted) {
    return res.status(400).json(error(400, '工具不存在或内置工具不可删除', 'TOOL_DELETE_FAILED'));
  }
  res.json(success({ message: '工具已删除' }));
});

// 切换工具启用状态（仅管理员）
router.put('/:id/toggle', requireAuth, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'admin' && userRole !== 'vice_admin') {
    return res.status(403).json(error(403, '只有管理员可以操作工具', 'FORBIDDEN'));
  }

  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json(error(400, 'enabled 参数必须为 boolean', 'INVALID_PARAMS'));
  }

  const tool = toolService.toggleTool(req.params.id, enabled);
  if (!tool) {
    return res.status(404).json(error(404, '工具不存在', 'TOOL_NOT_FOUND'));
  }
  res.json(success(tool));
});

export default router;
