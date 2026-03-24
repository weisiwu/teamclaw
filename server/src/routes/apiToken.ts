/**
 * API Token 路由
 * 所有接口均需 requireAdmin 保护
 */

import { Router } from 'express';
import { apiTokenService } from '../services/apiTokenService.js';
import { success, error } from '../utils/response.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// 所有路由需要管理员权限
router.use(requireAdmin as never);

// GET /api/v1/admin/api-tokens — 获取所有 Token 列表
router.get('/', async (req: AuthRequest, res) => {
  try {
    const list = await apiTokenService.list();
    res.json(success({ list }));
  } catch (err) {
    console.error('[apiToken] list error:', err);
    res.status(500).json(error(500, '获取 Token 列表失败', 'INTERNAL_ERROR'));
  }
});

// GET /api/v1/admin/api-tokens/:id — 获取单个 Token 详情
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const token = await apiTokenService.getById(req.params.id);
    if (!token) {
      return res.status(404).json(error(404, 'Token 不存在', 'NOT_FOUND'));
    }
    res.json(success(token));
  } catch (err) {
    console.error('[apiToken] get error:', err);
    res.status(500).json(error(500, '获取 Token 失败', 'INTERNAL_ERROR'));
  }
});

// POST /api/v1/admin/api-tokens — 创建新 Token
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { alias, provider, apiKey, baseUrl, models, status, monthlyBudgetUsd, note } = req.body;

    if (!alias || typeof alias !== 'string') {
      return res.status(400).json(error(400, 'alias 为必填项', 'INVALID_PARAMS'));
    }
    if (!provider || typeof provider !== 'string') {
      return res.status(400).json(error(400, 'provider 为必填项', 'INVALID_PARAMS'));
    }
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json(error(400, 'apiKey 为必填项', 'INVALID_PARAMS'));
    }

    const actor = req.user?.id ?? 'unknown';
    const ipAddress = req.ip ?? req.socket?.remoteAddress;

    const created = await apiTokenService.create(
      { alias, provider, apiKey, baseUrl, models, status, monthlyBudgetUsd, note },
      actor,
      ipAddress
    );
    res.status(201).json(success(created));
  } catch (err) {
    console.error('[apiToken] create error:', err);
    res.status(500).json(error(500, '创建 Token 失败', 'INTERNAL_ERROR'));
  }
});

// PUT /api/v1/admin/api-tokens/:id — 更新 Token 配置
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { alias, provider, apiKey, baseUrl, models, status, monthlyBudgetUsd, note } = req.body;
    const actor = req.user?.id ?? 'unknown';
    const ipAddress = req.ip ?? req.socket?.remoteAddress;

    const updated = await apiTokenService.update(
      req.params.id,
      { alias, provider, apiKey, baseUrl, models, status, monthlyBudgetUsd, note },
      actor,
      ipAddress
    );
    if (!updated) {
      return res.status(404).json(error(404, 'Token 不存在', 'NOT_FOUND'));
    }
    res.json(success(updated));
  } catch (err) {
    console.error('[apiToken] update error:', err);
    res.status(500).json(error(500, '更新 Token 失败', 'INTERNAL_ERROR'));
  }
});

// DELETE /api/v1/admin/api-tokens/:id — 删除 Token
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const actor = req.user?.id ?? 'unknown';
    const ipAddress = req.ip ?? req.socket?.remoteAddress;

    const deleted = await apiTokenService.delete(req.params.id, actor, ipAddress);
    if (!deleted) {
      return res.status(404).json(error(404, 'Token 不存在', 'NOT_FOUND'));
    }
    res.json(success({ message: 'Token 已删除' }));
  } catch (err) {
    console.error('[apiToken] delete error:', err);
    res.status(500).json(error(500, '删除 Token 失败', 'INTERNAL_ERROR'));
  }
});

// POST /api/v1/admin/api-tokens/:id/verify — 验证 Token 有效性
router.post('/:id/verify', async (req: AuthRequest, res) => {
  try {
    const result = await apiTokenService.verify(req.params.id);
    res.json(success(result));
  } catch (err) {
    console.error('[apiToken] verify error:', err);
    res.status(500).json(error(500, '验证 Token 失败', 'INTERNAL_ERROR'));
  }
});

export default router;
