/**
 * 用户管理 API 路由
 * 6 个端点：列表、详情、创建、更新、删除、权限校验
 */

import { Router, Request, Response } from "express";
import {
  listUsers,
  getUserById,
  getUserByExternalId,
  createUser,
  updateUser,
  deleteUser,
} from "../services/userService";
import { checkPermission } from "../services/permissionService";
import { AgentName, Role } from "../constants/roles";

const router = Router();

// ============ 辅助函数 ============

function ok<T>(data: T) {
  return { code: 0, data, message: "ok" };
}

function paginated<T>(list: T[], total: number, page: number, pageSize: number) {
  return {
    code: 0,
    data: { list, total, page, pageSize },
    message: "ok",
  };
}

function error(code: number, message: string) {
  return { code, data: null, message };
}

// ============ GET /api/v1/users ============
// 获取用户列表（支持分页、角色筛选）
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const role = req.query.role as Role | undefined;

    const result = await listUsers({ page, pageSize, role });
    res.json(paginated(result.list, result.total, page, pageSize));
  } catch (e) {
    console.error("[GET /api/v1/users] error:", e);
    res.status(500).json(error(500, "获取用户列表失败"));
  }
});

// ============ GET /api/v1/users/me ============
// 获取当前登录用户信息
router.get("/me", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const role = req.headers["x-user-role"] as Role;

    if (!userId || !role) {
      res.status(401).json(error(401, "未登录"));
      return;
    }

    // 尝试通过外部ID查找用户
    const feishuId = req.headers["x-feishu-id"] as string | undefined;
    const wechatId = req.headers["x-wechat-id"] as string | undefined;
    const user = await getUserByExternalId(wechatId, feishuId);

    if (!user) {
      // 如果找不到，返回基本信息
      res.json(ok({ userId, role, isRegistered: false }));
      return;
    }

    res.json(ok({ ...user, isRegistered: true }));
  } catch (e) {
    console.error("[GET /api/v1/users/me] error:", e);
    res.status(500).json(error(500, "获取用户信息失败"));
  }
});

// ============ GET /api/v1/users/:userId ============
// 获取用户详情
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.userId);
    if (!user) {
      res.status(404).json(error(404, "用户不存在"));
      return;
    }
    res.json(ok(user));
  } catch (e) {
    console.error("[GET /api/v1/users/:userId] error:", e);
    res.status(500).json(error(500, "获取用户详情失败"));
  }
});

// ============ POST /api/v1/users ============
// 创建用户
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, role, wechatId, feishuId, remark } = req.body;

    if (!name || !role) {
      res.status(400).json(error(400, "姓名和角色不能为空"));
      return;
    }

    if (!["admin", "vice_admin", "member"].includes(role)) {
      res.status(400).json(error(400, "无效的角色值"));
      return;
    }

    const user = await createUser({ name, role, wechatId, feishuId, remark });
    res.status(201).json(ok(user));
  } catch (e) {
    console.error("[POST /api/v1/users] error:", e);
    res.status(500).json(error(500, "创建用户失败"));
  }
});

// ============ PUT /api/v1/users/:userId ============
// 更新用户信息
router.put("/:userId", async (req: Request, res: Response) => {
  try {
    const { name, role, wechatId, feishuId, remark } = req.body;

    if (role && !["admin", "vice_admin", "member"].includes(role)) {
      res.status(400).json(error(400, "无效的角色值"));
      return;
    }

    const user = await updateUser(req.params.userId, {
      name,
      role,
      wechatId,
      feishuId,
      remark,
    });

    if (!user) {
      res.status(404).json(error(404, "用户不存在"));
      return;
    }

    res.json(ok(user));
  } catch (e) {
    console.error("[PUT /api/v1/users/:userId] error:", e);
    res.status(500).json(error(500, "更新用户失败"));
  }
});

// ============ DELETE /api/v1/users/:userId ============
// 删除用户
router.delete("/:userId", async (req: Request, res: Response) => {
  try {
    const deleted = await deleteUser(req.params.userId);
    if (!deleted) {
      res.status(404).json(error(404, "用户不存在"));
      return;
    }
    res.json(ok({ deleted: true }));
  } catch (e) {
    console.error("[DELETE /api/v1/users/:userId] error:", e);
    res.status(500).json(error(500, "删除用户失败"));
  }
});

// ============ POST /api/v1/auth/check ============
// 权限校验（独立端点，不受中间件保护）
router.post("/check", async (req: Request, res: Response) => {
  try {
    const { userId, agent } = req.body as {
      userId?: string;
      agent?: AgentName;
    };

    if (!userId || !agent) {
      res.status(400).json(error(400, "userId 和 agent 不能为空"));
      return;
    }

    // 获取用户角色
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json(error(404, "用户不存在"));
      return;
    }

    const result = checkPermission(user.role, agent);
    res.json(
      ok({
        allowed: result.allowed,
        role: result.role,
        capability: result.capability,
        reason: result.reason,
      })
    );
  } catch (e) {
    console.error("[POST /api/v1/auth/check] error:", e);
    res.status(500).json(error(500, "权限校验失败"));
  }
});

export default router;
