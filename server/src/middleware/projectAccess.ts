/**
 * 项目权限检查中间件
 * 检查用户是否有权限操作指定版本（基于版本创建者或项目归属）
 *
 * 安全修复：不再从 HTTP Header (x-user-id/x-user-role) 读取身份信息，
 * 改为从 JWT Token 验证后的 req.user 获取，彻底杜绝身份伪造漏洞。
 */

import { Response, NextFunction } from 'express';
import { queryOne } from '../db/pg.js';
import { AuthRequest } from './auth.js';

/**
 * 检查用户是否有权限访问指定版本
 * 规则：
 * 1. 版本的 created_by 等于当前用户
 * 2. 或者用户是 admin/vice_admin
 * 3. （未来）检查用户是否属于该版本所属项目的成员
 *
 * 注意：此中间件应配合 requireAuth 使用，或在调用前确保 req.user 已填充
 */
export async function requireProjectAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // FIX: 从 JWT 验证后的 req.user 获取身份，不再信任 HTTP Header
  // 需要调用方先执行 requireAuth 中间件
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    res.status(401).json({
      code: 401,
      data: null,
      message: '未提供有效身份信息，请通过登录获取 Token',
    });
    return;
  }

  // admin/vice_admin 可以直接操作
  if (userRole === 'admin' || userRole === 'vice_admin') {
    next();
    return;
  }

  // 检查版本是否存在并验证权限
  try {
    const versionId = req.params.id;
    const row = await queryOne<{ id: string; created_by: string; project_id: string | null }>(
      'SELECT id, created_by, project_id FROM versions WHERE id = $1',
      [versionId]
    );

    if (!row) {
      res.status(404).json({
        code: 404,
        data: null,
        message: '版本不存在',
      });
      return;
    }

    // 检查是否是版本创建者
    if (row.created_by === userId) {
      next();
      return;
    }

    // 没有权限
    res.status(403).json({
      code: 403,
      data: null,
      message: '没有权限操作此版本，仅版本创建者或管理员可以操作',
    });
  } catch (err) {
    console.error('[requireProjectAccess] Error:', err);
    res.status(500).json({
      code: 500,
      data: null,
      message: '权限检查失败',
    });
  }
}
