/**
 * Skills API - 前端调用封装
 * 所有请求通过 Next.js API Routes 代理到 Express 后端
 */

const API_BASE = '/api/v1';

// ============ 类型定义 ============

export type SkillSource = 'auto' | 'user' | 'imported';
export type SkillCategory =
  | 'build'
  | 'deploy'
  | 'test'
  | 'structure'
  | 'code'
  | 'review'
  | 'custom';

export interface Skill {
  id: string;
  name: string;
  identifier: string;
  description: string;
  category: SkillCategory;
  source: SkillSource;
  enabled: boolean;
  applicableAgents?: string[];
  tags?: string[];
  content?: string;
  generatedAt?: string;
  linkedProject?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillsListResponse {
  list: Skill[];
  total: number;
}

export interface CreateSkillInput {
  name: string;
  identifier: string;
  description: string;
  category: SkillCategory;
  source?: SkillSource;
  applicableAgents?: string[];
  tags?: string[];
  content?: string;
}

export interface UpdateSkillInput extends Partial<CreateSkillInput> {
  enabled?: boolean;
}

// ============ Auth Headers ============
function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('teamclaw_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ============ API 请求工具 ============
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!json.success && json.code !== 0) {
    throw new Error(json.message || 'API 请求失败');
  }
  return (json.data ?? json) as T;
}

// ============ Skills API ============
export const skillsApi = {
  /** 获取所有 Skills */
  async getAll(params?: {
    category?: SkillCategory | '';
    source?: SkillSource | '';
    search?: string;
  }): Promise<SkillsListResponse> {
    const sp = new URLSearchParams();
    if (params?.category) sp.set('category', params.category);
    if (params?.source) sp.set('source', params.source);
    if (params?.search) sp.set('search', params.search);
    const qs = sp.toString();
    return request<SkillsListResponse>(`/skills${qs ? `?${qs}` : ''}`);
  },

  /** 获取单个 Skill */
  async getById(id: string): Promise<Skill> {
    return request<Skill>(`/skills/${id}`);
  },

  /** 创建 Skill */
  async create(input: CreateSkillInput): Promise<Skill> {
    return request<Skill>('/skills', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /** 更新 Skill */
  async update(id: string, input: UpdateSkillInput): Promise<Skill> {
    return request<Skill>(`/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  /** 删除 Skill */
  async delete(id: string): Promise<void> {
    await request<void>(`/skills/${id}`, { method: 'DELETE' });
  },

  /** 切换启用状态 */
  async toggle(id: string, enabled: boolean): Promise<Skill> {
    return request<Skill>(`/skills/${id}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  },

  /** 触发磁盘同步 */
  async sync(): Promise<{ synced: number; failed: number }> {
    return request<{ synced: number; failed: number }>('/skills/sync', {
      method: 'POST',
    });
  },

  /** 导出 Skills */
  async exportSkills(): Promise<Blob> {
    const token = localStorage.getItem('teamclaw_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/skills/export`, { headers });
    if (!res.ok) throw new Error('导出失败');
    return res.blob();
  },

  /** 导入 Skills */
  async importSkills(file: File): Promise<{ imported: number; failed: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('teamclaw_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/skills/import`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || '导入失败');
    return json.data;
  },
};

export default skillsApi;
