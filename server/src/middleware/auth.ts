/**
 * 权限检查中间件
 * 从请求中提取用户身份并验证权限
 */

import { Request, Response, NextFunction } from "express";
import { checkPermission, PermissionCheckResult } from "../services/permissionService";
import { AgentName, Role } from "../constants/roles";

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
 * 从 header 中提取用户身份
 * Header 格式: X-User-Id: user_001
 *             X-User-Role: admin
 */
function extractUserFromHeaders(req: AuthRequest): { id?: string; role?: Role } {
  const userId = req.headers["x-user-id"] as string | undefined;
  const role = req.headers["x-user-role"] as Role | undefined;

  return { id: userId, role };
}

/**
 * 权限检查中间件
 * 验证用户是否有权限访问指定的 Agent
 */
export function requirePermission(agent: AgentName): AuthRequestHandler {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const { id, role } = extractUserFromHeaders(req);

    // 未携带身份信息
    if (!id || !role) {
      res.status(401).json({
        code: 401,
        data: null,
        message: "未提供身份信息，请检查 X-User-Id 和 X-User-Role 请求头",
      });
      return;
    }

    // 权限检查
    const result = checkPermission(role, agent);
    req.user = { id, role };
    req.permission = result;

    if (!result.allowed) {
      res.status(403).json({
        code: 403,
        data: null,
        message: result.reason || "没有权限",
      });
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
  const { id, role } = extractUserFromHeaders(req);
  if (id && role) {
    req.user = { id, role };
    req.permission = checkPermission(role, "pm"); // 默认检查 pm 权限
  }
  next();
}

/**
 * 身份认证中间件
 * 要求请求必须携带有效的用户身份信息（X-User-Id + X-User-Role）
 * 不检查特定 Agent 权限，只验证身份有效
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const userId = req.headers["x-user-id"] as string | undefined;
  const role = req.headers["x-user-role"] as string | undefined;

  if (!userId || !role) {
    res.status(401).json({
      code: 401,
      data: null,
      message: "未提供身份信息，请检查 X-User-Id 和 X-User-Role 请求头",
    });
    return;
  }

  req.user = { id: userId, role: role as Role };
  next();
}

/**
 * 检查管理员权限
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const { role } = extractUserFromHeaders(req);

  if (!role) {
    res.status(401).json({
      code: 401,
      data: null,
      message: "未提供身份信息",
    });
    return;
  }

  if (role !== "admin" && role !== "vice_admin") {
    res.status(403).json({
      code: 403,
      data: null,
      message: "需要管理员或副管理员权限",
    });
    return;
  }

  req.user = { id: req.headers["x-user-id"] as string, role };
  next();
}
