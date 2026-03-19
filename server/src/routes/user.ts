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
import {
  recordRoleChange,
  getRoleHistory,
  getRecentRoleChanges,
  getRoleChangeStats,
  grantDelegation,
  revokeDelegation,
  getDelegationsForUser,
  getDelegationsByUser,
} from "../services/roleMemory";
import {
  getUserPermissionMap,
} from "../services/permissionFineGrained";
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
// 创建用户（增强：记录角色变更历史）
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, role, wechatId, feishuId, remark, changedBy, reason } = req.body;

    if (!name || !role) {
      res.status(400).json(error(400, "姓名和角色不能为空"));
      return;
    }

    if (!["admin", "vice_admin", "member"].includes(role)) {
      res.status(400).json(error(400, "无效的角色值"));
      return;
    }

    const user = await createUser({ name, role, wechatId, feishuId, remark });

    // 记录角色变更历史
    await recordRoleChange(user.id, null, role, changedBy || "system", reason || "新建用户");

    res.status(201).json(ok(user));
  } catch (e) {
    console.error("[POST /api/v1/users] error:", e);
    res.status(500).json(error(500, "创建用户失败"));
  }
});

// ============ PUT /api/v1/users/:userId ============
// 更新用户信息（增强：记录角色变更历史）
router.put("/:userId", async (req: Request, res: Response) => {
  try {
    const { name, role, wechatId, feishuId, remark, changedBy, reason } = req.body;

    if (role && !["admin", "vice_admin", "member"].includes(role)) {
      res.status(400).json(error(400, "无效的角色值"));
      return;
    }

    // 获取旧用户信息用于记录变更
    const oldUser = await getUserById(req.params.userId);

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

    // 如果角色发生变化，记录历史
    if (role && oldUser && oldUser.role !== role) {
      await recordRoleChange(user.id, oldUser.role, role, changedBy || "system", reason || "角色变更");
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

// ============ GET /api/v1/users/:userId/role-history ============
// 获取用户的角色变更历史
router.get("/:userId/role-history", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await getRoleHistory(req.params.userId, limit);
    res.json(ok({ list: history, total: history.length }));
  } catch (e) {
    console.error("[GET /:userId/role-history] error:", e);
    res.status(500).json(error(500, "获取角色历史失败"));
  }
});

// ============ GET /api/v1/users/role-changes ============
// 获取最近所有角色变更记录
router.get("/role-changes", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const changes = await getRecentRoleChanges(limit);
    res.json(ok({ list: changes, total: changes.length }));
  } catch (e) {
    console.error("[GET /role-changes] error:", e);
    res.status(500).json(error(500, "获取角色变更记录失败"));
  }
});

// ============ GET /api/v1/users/role-stats ============
// 获取角色变更统计
router.get("/role-stats", async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const stats = await getRoleChangeStats(days);
    res.json(ok(stats));
  } catch (e) {
    console.error("[GET /role-stats] error:", e);
    res.status(500).json(error(500, "获取角色变更统计失败"));
  }
});

// ============ POST /api/v1/users/delegations ============
// 授予权限委托
router.post("/delegations", async (req: Request, res: Response) => {
  try {
    const { delegatorId, delegateId, permissions, expiresAt } = req.body;

    if (!delegatorId || !delegateId || !permissions?.length) {
      res.status(400).json(error(400, "delegatorId、delegateId 和 permissions 不能为空"));
      return;
    }

    const delegation = await grantDelegation(delegatorId, delegateId, permissions, expiresAt || null);
    res.status(201).json(ok(delegation));
  } catch (e) {
    console.error("[POST /delegations] error:", e);
    res.status(500).json(error(500, "授予委托失败"));
  }
});

// ============ DELETE /api/v1/users/delegations ============
// 撤销权限委托
router.delete("/delegations", async (req: Request, res: Response) => {
  try {
    const { delegatorId, delegateId } = req.body;

    if (!delegatorId || !delegateId) {
      res.status(400).json(error(400, "delegatorId 和 delegateId 不能为空"));
      return;
    }

    const revoked = await revokeDelegation(delegatorId, delegateId);
    res.json(ok({ revoked }));
  } catch (e) {
    console.error("[DELETE /delegations] error:", e);
    res.status(500).json(error(500, "撤销委托失败"));
  }
});

// ============ GET /api/v1/users/:userId/delegations ============
// 获取用户收到的权限委托
router.get("/:userId/delegations", async (req: Request, res: Response) => {
  try {
    const delegations = await getDelegationsForUser(req.params.userId);
    res.json(ok({ list: delegations, total: delegations.length }));
  } catch (e) {
    console.error("[GET /:userId/delegations] error:", e);
    res.status(500).json(error(500, "获取委托列表失败"));
  }
});

// ============ GET /api/v1/users/:userId/delegations-by ============
// 获取用户发出的权限委托
router.get("/:userId/delegations-by", async (req: Request, res: Response) => {
  try {
    const delegations = await getDelegationsByUser(req.params.userId);
    res.json(ok({ list: delegations, total: delegations.length }));
  } catch (e) {
    console.error("[GET /:userId/delegations-by] error:", e);
    res.status(500).json(error(500, "获取发出的委托列表失败"));
  }
});

// ============ GET /api/v1/users/:userId/permissions ============
// 获取用户的细粒度资源权限映射
router.get("/:userId/permissions", async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.userId);
    if (!user) {
      res.status(404).json(error(404, "用户不存在"));
      return;
    }

    const permissionMap = getUserPermissionMap(user.role);
    res.json(ok(permissionMap));
  } catch (e) {
    console.error("[GET /:userId/permissions] error:", e);
    res.status(500).json(error(500, "获取权限映射失败"));
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
