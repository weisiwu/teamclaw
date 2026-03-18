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
  async create(data: CreateMemberRequest): Promise<Member> {
    const payload: CreateUserPayload = {
      name: data.name,
      role: data.role === "sub_admin" ? "vice_admin" : data.role,
      wechatId: (data as unknown as Record<string, string>).wechatId,
      feishuId: (data as unknown as Record<string, string>).feishuId,
      remark: (data as unknown as Record<string, string>).remark,
    };

    const u = await request<BackendUser>("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return mapUser(u);
  },

  // 更新成员
  async update(id: string, data: UpdateMemberRequest): Promise<Member> {
    const payload: UpdateUserPayload = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.role !== undefined) {
      payload.role = data.role === "sub_admin" ? "vice_admin" : data.role;
    }
    const remark = (data as unknown as Record<string, string>).remark;
    if (remark !== undefined) payload.remark = remark;

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
};

export default memberApi;
