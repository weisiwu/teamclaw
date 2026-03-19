/**
 * 成员管理 API（调用真实后端）
 * 替换 mock 实现，连接 http://localhost:9700
 */

import {
  Member,
  CreateMemberRequest,
  UpdateMemberRequest,
  MemberListResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9700";

// 后端返回的 User 类型
interface BackendUser {
  id: string;
  userId: string;
  name: string;
  role: string;
  weight: number;
  wechatId?: string;
  feishuId?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

async function request<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  let url = `${API_BASE}${path}`;

  if (options?.params) {
    const qs = new URLSearchParams(options.params).toString();
    url += `?${qs}`;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const json = await res.json();

  if (json.code !== 0) {
    throw new Error(json.message || "API 请求失败");
  }

  return json.data as T;
}

// 映射后端 role 到前端 role
type FrontendRole = "admin" | "sub_admin" | "member";

function mapRole(role: string): FrontendRole {
  if (role === "vice_admin") return "sub_admin";
  return role as FrontendRole;
}

// 将后端 User 映射到前端 Member
function mapUser(u: BackendUser): Member {
  return {
    id: u.id,
    name: u.name,
    role: mapRole(u.role),
    weight: u.weight,
    status: "active",
    createdAt: u.createdAt
      ? new Date(u.createdAt).toLocaleString("zh-CN")
      : "",
  };
}

// 创建成员的请求 payload
interface CreateUserPayload {
  name: string;
  role: string;
  wechatId?: string;
  feishuId?: string;
  remark?: string;
}

// 更新成员的请求 payload
type UpdateUserPayload = Partial<CreateUserPayload>;

export const memberApi = {
  // 获取成员列表（支持分页、角色筛选）
  async getList(params?: {
    page?: number;
    pageSize?: number;
    role?: string;
  }): Promise<MemberListResponse> {
    const data = await request<{ list: BackendUser[]; total: number }>(
      "/api/v1/users",
      { params: params as Record<string, string> }
    );

    return {
      data: data.list.map(mapUser),
      total: data.total,
    };
  },

  // 获取成员详情
  async getById(id: string): Promise<Member | null> {
    try {
      const u = await request<BackendUser>(`/api/v1/users/${id}`);
      return mapUser(u);
    } catch {
      return null;
    }
  },

  // 创建成员
  async create(data: CreateMemberRequest & { changedBy?: string; reason?: string }): Promise<Member> {
    const payload: CreateUserPayload & Record<string, string> = {
      name: data.name,
      role: data.role === "sub_admin" ? "vice_admin" : data.role,
    };
    if ((data as unknown as Record<string, string>).wechatId) payload.wechatId = (data as unknown as Record<string, string>).wechatId;
    if ((data as unknown as Record<string, string>).feishuId) payload.feishuId = (data as unknown as Record<string, string>).feishuId;
    if ((data as unknown as Record<string, string>).remark) payload.remark = (data as unknown as Record<string, string>).remark;
    if (data.changedBy) payload.changedBy = data.changedBy;
    if (data.reason) payload.reason = data.reason;

    const u = await request<BackendUser>("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return mapUser(u);
  },

  // 更新成员
  async update(id: string, data: UpdateMemberRequest & { changedBy?: string; reason?: string }): Promise<Member> {
    const payload: UpdateUserPayload & Record<string, string> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.role !== undefined) {
      payload.role = data.role === "sub_admin" ? "vice_admin" : data.role;
    }
    const remark = (data as unknown as Record<string, string>).remark;
    if (remark !== undefined) payload.remark = remark;
    if (data.changedBy) payload.changedBy = data.changedBy;
    if (data.reason) payload.reason = data.reason;

    const u = await request<BackendUser>(`/api/v1/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return mapUser(u);
  },

  // 删除成员
  async delete(id: string): Promise<void> {
    await request<{ deleted: boolean }>(`/api/v1/users/${id}`, {
      method: "DELETE",
    });
  },

  // 获取成员的角色变更历史
  async getRoleHistory(userId: string, limit = 20) {
    return request<{ list: RoleChangeRecord[]; total: number }>(
      `/api/v1/users/${userId}/role-history`,
      { params: { limit: String(limit) } }
    );
  },

  // 获取最近所有角色变更记录
  async getRecentRoleChanges(limit = 50) {
    return request<{ list: RoleChangeRecord[]; total: number }>(
      "/api/v1/users/role-changes",
      { params: { limit: String(limit) } }
    );
  },

  // 获取角色变更统计
  async getRoleChangeStats(days = 7) {
    return request<Record<string, number>>(
      "/api/v1/users/role-stats",
      { params: { days: String(days) } }
    );
  },

  // 授予权限委托
  async grantDelegation(delegatorId: string, delegateId: string, permissions: string[], expiresAt?: string) {
    const body: Record<string, string | string[]> = { delegatorId, delegateId, permissions };
    if (expiresAt) body.expiresAt = expiresAt;
    return request<DelegationRecord>("/api/v1/users/delegations", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // 撤销权限委托
  async revokeDelegation(delegatorId: string, delegateId: string) {
    return request<{ revoked: boolean }>("/api/v1/users/delegations", {
      method: "DELETE",
      body: JSON.stringify({ delegatorId, delegateId }),
    });
  },

  // 获取用户收到的权限委托
  async getDelegationsForUser(userId: string) {
    return request<{ list: DelegationRecord[]; total: number }>(
      `/api/v1/users/${userId}/delegations`
    );
  },

  // 获取用户发出的权限委托
  async getDelegationsByUser(userId: string) {
    return request<{ list: DelegationRecord[]; total: number }>(
      `/api/v1/users/${userId}/delegations-by`
    );
  },

  // 获取用户的细粒度资源权限映射
  async getPermissionMap(userId: string) {
    return request<ResourcePermission[]>(`/api/v1/users/${userId}/permissions`);
  },
};

// ============ 扩展类型 ============
interface RoleChangeRecord {
  id: string;
  userId: string;
  fromRole: string | null;
  toRole: string;
  changedBy: string;
  reason?: string;
  timestamp: string;
}

interface DelegationRecord {
  id: string;
  delegatorId: string;
  delegateId: string;
  permissions: string[];
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface ResourcePermission {
  resource: string;
  actions: string[];
}

export default memberApi;
