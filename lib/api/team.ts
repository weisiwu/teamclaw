/**
 * 团队管理 API
 * TeamClaw 人员与权限模块 - 团队成员 CRUD
 */

import { Role } from '../auth/roles';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9700';

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: Role;
  avatar?: string;
  wechatId?: string;
  feishuId?: string;
  joinedAt: string;
  lastActiveAt: string;
  status: 'active' | 'inactive' | 'pending';
  notes?: string;
  tags?: string[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

export interface AddMemberRequest {
  name: string;
  email?: string;
  role: Role;
  wechatId?: string;
  feishuId?: string;
}

export interface UpdateMemberRoleRequest {
  memberId: string;
  role: Role;
}

// 响应类型
interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
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
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const json: ApiResponse<T> = await res.json();
  if (json.code !== 0) {
    throw new Error(json.message || 'API error');
  }
  return json.data;
}

// --- Team API ---

export async function getTeam(): Promise<Team> {
  return request<Team>('/api/v1/team');
}

export async function updateTeam(data: Partial<Pick<Team, 'name' | 'description'>>): Promise<Team> {
  return request<Team>('/api/v1/team', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// --- Members API ---

export async function listTeamMembers(params?: {
  page?: number;
  pageSize?: number;
  role?: Role;
  search?: string;
}): Promise<{ data: TeamMember[]; total: number }> {
  return request<{ data: TeamMember[]; total: number }>('/api/v1/team/members', {
    params: params as Record<string, string>,
  });
}

export async function getMember(memberId: string): Promise<TeamMember> {
  return request<TeamMember>(`/api/v1/team/members/${memberId}`);
}

export async function addMember(data: AddMemberRequest): Promise<TeamMember> {
  return request<TeamMember>('/api/v1/team/members', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMember(memberId: string, data: Partial<TeamMember>): Promise<TeamMember> {
  return request<TeamMember>(`/api/v1/team/members/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateMemberRole(memberId: string, role: Role): Promise<TeamMember> {
  return request<TeamMember>(`/api/v1/team/members/${memberId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(memberId: string): Promise<void> {
  await request<void>(`/api/v1/team/members/${memberId}`, {
    method: 'DELETE',
  });
}

export async function inviteMember(email: string, role: Role): Promise<{ inviteId: string }> {
  return request<{ inviteId: string }>('/api/v1/team/members/invite', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}
