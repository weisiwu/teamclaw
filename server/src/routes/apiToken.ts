/**
 * API Token 路由
 * /api/v1/admin/api-tokens
 */

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { auditService } from '../services/auditService.js';
import { apiTokenService } from '../services/apiTokenService.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { CreateApiTokenParams, UpdateApiTokenParams } from '../models/apiToken.js';

const router = Router();

/**
 * GET /api/v1/admin/api-tokens
 * 获取所有 Token 列表（脱敏）
 */
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const includeDisabled = req.query.includeDisabled === 'true';
    const tokens = await apiTokenService.getAllTokens(includeDisabled);
    res.json(success(tokens));
  } catch (err) {
    console.error('[apiToken] Failed to list tokens:', err);
    res.status(500).json(error(500, 'Failed to list tokens'));
  }
});

/**
 * GET /api/v1/admin/api-tokens/:id
 * 获取单个 Token 详情
 */
router.get('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const token = await apiTokenService.getTokenById(id);
    
    if (!token) {
      res.status(404).json(error(404, 'Token not found'));
      return;
    }
    
    res.json(success(token));
  } catch (err) {
    console.error('[apiToken] Failed to get token:', err);
    res.status(500).json(error(500, 'Failed to get token'));
  }
});

/**
 * POST /api/v1/admin/api-tokens
 * 创建新 Token
 */
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const params = req.body as CreateApiTokenParams;
    const createdBy = req.user?.id || 'unknown';
    
    // 验证必填字段
    if (!params.alias || !params.provider || !params.apiKey) {
      res.status(400).json(error(400, 'Missing required fields: alias, provider, apiKey'));
      return;
    }
    
    // 验证 provider
    const supportedProviders = apiTokenService.getSupportedProviders();
    if (!supportedProviders.includes(params.provider)) {
      res.status(400).json(error(400, `Invalid provider. Supported: ${supportedProviders.join(', ')}`));
      return;
    }
    
    const token = await apiTokenService.createToken(params, createdBy);
    
    // 记录审计日志
    auditService.log({
      action: 'api_token_create',
      actor: createdBy,
      target: token.id,
      details: {
        alias: token.alias,
        provider: token.provider,
        maskedKey: token.apiKey,
      },
      ipAddress: (req.ip || req.socket.remoteAddress) as string | undefined,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
    
    res.status(201).json(success(token));
  } catch (err) {
    console.error('[apiToken] Failed to create token:', err);
    res.status(500).json(error(500, 'Failed to create token'));
  }
});

/**
 * PUT /api/v1/admin/api-tokens/:id
 * 更新 Token 配置
 */
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const params = req.body as UpdateApiTokenParams;
    const updatedBy = req.user?.id || 'unknown';
    
    // 验证 provider（如果提供）
    if (params.status && !['active', 'disabled', 'expired'].includes(params.status)) {
      res.status(400).json(error(400, 'Invalid status. Must be: active, disabled, or expired'));
      return;
    }
    
    const token = await apiTokenService.updateToken(id, params);
    
    if (!token) {
      res.status(404).json(error(404, 'Token not found'));
      return;
    }
    
    // 记录审计日志
    auditService.log({
      action: 'api_token_update',
      actor: updatedBy,
      target: id,
      details: {
        updatedFields: Object.keys(params),
        alias: token.alias,
        provider: token.provider,
      },
      ipAddress: (req.ip || req.socket.remoteAddress) as string | undefined,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
    
    res.json(success(token));
  } catch (err) {
    console.error('[apiToken] Failed to update token:', err);
    res.status(500).json(error(500, 'Failed to update token'));
  }
});

/**
 * DELETE /api/v1/admin/api-tokens/:id
 * 删除 Token
 */
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.id || 'unknown';
    
    // 获取 Token 信息用于审计日志
    const token = await apiTokenService.getTokenById(id);
    if (!token) {
      res.status(404).json(error(404, 'Token not found'));
      return;
    }
    
    const deleted = await apiTokenService.deleteToken(id);
    
    if (!deleted) {
      res.status(500).json(error(500, 'Failed to delete token'));
      return;
    }
    
    // 记录审计日志
    auditService.log({
      action: 'api_token_delete',
      actor: deletedBy,
      target: id,
      details: {
        alias: token.alias,
        provider: token.provider,
        maskedKey: token.apiKey,
      },
      ipAddress: (req.ip || req.socket.remoteAddress) as string | undefined,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
    
    res.json(success({ deleted: true }));
  } catch (err) {
    console.error('[apiToken] Failed to delete token:', err);
    res.status(500).json(error(500, 'Failed to delete token'));
  }
});

/**
 * POST /api/v1/admin/api-tokens/:id/verify
 * 验证 Token 有效性
 */
router.post('/:id/verify', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await apiTokenService.verifyToken(id);
    res.json(success(result));
  } catch (err) {
    console.error('[apiToken] Failed to verify token:', err);
    res.status(500).json(error(500, 'Failed to verify token'));
  }
});

/**
 * GET /api/v1/admin/api-tokens/providers/supported
 * 获取支持的 Provider 列表
 */
router.get('/providers/supported', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const providers = apiTokenService.getSupportedProviders();
    res.json(success({ providers }));
  } catch (err) {
    console.error('[apiToken] Failed to get providers:', err);
    res.status(500).json(error(500, 'Failed to get supported providers'));
  }
});

export default router;
