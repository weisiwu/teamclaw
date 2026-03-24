/**
 * 权限检查中间件
 * 从 JWT Token 中提取用户身份并验证权限
 */

import { Request, Response, NextFunction } from 'express';
import { checkPermission, PermissionCheckResult } from '../services/permissionService';
import { AgentName, Role } from '../constants/roles';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { error } from '../utils/response.js';

// 扩展 Express Request
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
  };
  permission?: PermissionCheckResult;
}

type AuthRequestHandler = (req: AuthRequest, res: Response, next: NextFunction) => void;

/**
 * 从 Authorization header 中提取并验证 JWT Token
 * Header 格式: Authorization: Bearer <token>
 */
function extractUserFromToken(req: AuthRequest): JwtPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.slice(7);
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * 提取用户身份：仅从 Token 解析
 */
function extractUser(req: AuthRequest): { id: string; role: Role } | null {
  const fromToken = extractUserFromToken(req);
  if (fromToken) return { id: fromToken.userId, role: fromToken.role as Role };
  return null;
}

/**
 * 权限检查中间件
 * 验证用户是否有权限访问指定的 Agent
 */
export function requirePermission(agent: AgentName): AuthRequestHandler {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = extractUser(req);

    // 未携带有效身份信息
    if (!user) {
      res.status(401).json(error(401, '未提供有效身份信息，请通过登录获取 Token', 'UNAUTHORIZED'));
      return;
    }

    // 权限检查
    const result = checkPermission(user.role, agent);
    req.user = { id: user.id, role: user.role };
    req.permission = result;

    if (!result.allowed) {
      res.status(403).json(error(403, result.reason || '没有权限', 'FORBIDDEN'));
      return;
    }

    next();
  };
}

/**
 * 可选身份中间件
 * 不强制要求身份信息，但如果有则附加到 req.user
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const user = extractUser(req);
  if (user) {
    req.user = { id: user.id, role: user.role };
  }
  next();
}

/**
 * 身份认证中间件
 * 要求请求必须携带有效的用户身份信息
 * 不检查特定 Agent 权限，只验证身份有效
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = extractUser(req);

  if (!user) {
    res.status(401).json(error(401, '未提供有效身份信息，请通过登录获取 Token', 'UNAUTHORIZED'));
    return;
  }

  req.user = { id: user.id, role: user.role };
  next();
}

/**
 * 检查管理员权限
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = extractUser(req);

  if (!user) {
    res.status(401).json(error(401, '未提供有效身份信息', 'UNAUTHORIZED'));
    return;
  }

  if (user.role !== 'admin' && user.role !== 'vice_admin') {
    res.status(403).json(error(403, '需要管理员或副管理员权限', 'FORBIDDEN'));
    return;
  }

  req.user = { id: user.id, role: user.role };
  next();
}
