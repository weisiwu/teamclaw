/**
 * 项目权限检查中间件
 * 检查用户是否有权限操作指定版本（基于版本创建者或项目归属）
 */

import { Request, Response, NextFunction } from "express";
import { getDb } from "../db/sqlite.js";
import { AuthRequest } from "./auth.js";

/**
 * 检查用户是否有权限访问指定版本
 * 规则：
 * 1. 版本的 created_by 等于当前用户
 * 2. 或者用户是 admin
 * 3. （未来）检查用户是否属于该版本所属项目的成员
 */
export function requireProjectAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const userId = req.headers["x-user-id"] as string | undefined;
  const userRole = req.headers["x-user-role"] as string | undefined;
  const versionId = req.params.id;

  if (!userId) {
    res.status(401).json({
      code: 401,
      data: null,
      message: "未提供用户身份信息"
    });
    return;
  }

  // admin 可以直接操作
  if (userRole === "admin") {
    req.user = { id: userId, role: userRole };
    next();
    return;
  }

  // 检查版本是否存在并验证权限
  try {
    const db = getDb();
    const row = db.prepare('SELECT id, created_by, project_id FROM versions WHERE id = ?').get(versionId) as 
      { id: string; created_by: string; project_id: string | null } | undefined;

    if (!row) {
      res.status(404).json({
        code: 404,
        data: null,
        message: "版本不存在"
      });
      return;
    }

    // 检查是否是版本创建者
    if (row.created_by === userId) {
      req.user = { id: userId, role: userRole || "user" };
      next();
      return;
    }

    // （未来扩展）检查项目成员关系
    if (row.project_id) {
      // 可以在这里检查 project_members 表
      // const isMember = checkProjectMember(row.project_id, userId);
    }

    // 没有权限
    res.status(403).json({
      code: 403,
      data: null,
      message: "没有权限操作此版本，仅版本创建者或管理员可以操作"
    });
  } catch (err) {
    console.error('[requireProjectAccess] Error:', err);
    res.status(500).json({
      code: 500,
      data: null,
      message: "权限检查失败"
    });
  }
}
