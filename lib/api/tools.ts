/**
 * Tools API - 前端调用封装
 * 所有请求通过 Next.js API Routes 代理到 Express 后端
 */

const API_BASE = '/api/v1';

// ============ 类型定义 ============

export type ToolSource = 'builtin' | 'user' | 'imported';
export type ToolCategory =
  | 'file'
  | 'git'
  | 'shell'
  | 'api'
  | 'browser'
  | 'custom';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ToolParameter {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

export interface Tool {
  id: string;
  name: string;
  identifier: string;
  description: string;
  category: ToolCategory;
  source: ToolSource;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  enabled: boolean;
  applicableAgents?: string[];
  parameters?: ToolParameter[];
  createdAt: string;
  updatedAt: string;
}

export interface ToolsListResponse {
  list: Tool[];
  total: number;
}

export interface CreateToolInput {
  name: string;
  identifier: string;
  description: string;
  category: ToolCategory;
  source?: ToolSource;
  riskLevel?: RiskLevel;
  requiresApproval?: boolean;
  applicableAgents?: string[];
  parameters?: ToolParameter[];
}

export interface UpdateToolInput extends Partial<CreateToolInput> {
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

// ============ Tools API ============
export const toolsApi = {
  /** 获取所有 Tools */
  async getAll(params?: {
    category?: ToolCategory | '';
    source?: ToolSource | '';
    search?: string;
  }): Promise<ToolsListResponse> {
    const sp = new URLSearchParams();
    if (params?.category) sp.set('category', params.category);
    if (params?.source) sp.set('source', params.source);
    if (params?.search) sp.set('search', params.search);
    const qs = sp.toString();
    return request<ToolsListResponse>(`/tools${qs ? `?${qs}` : ''}`);
  },

  /** 获取单个 Tool */
  async getById(id: string): Promise<Tool> {
    return request<Tool>(`/tools/${id}`);
  },

  /** 创建 Tool */
  async create(input: CreateToolInput): Promise<Tool> {
    return request<Tool>('/tools', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /** 更新 Tool */
  async update(id: string, input: UpdateToolInput): Promise<Tool> {
    return request<Tool>(`/tools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  /** 删除 Tool */
  async delete(id: string): Promise<void> {
    await request<void>(`/tools/${id}`, { method: 'DELETE' });
  },

  /** 切换启用状态 */
  async toggle(id: string, enabled: boolean): Promise<Tool> {
    return request<Tool>(`/tools/${id}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  },

  /** 导出 Tools */
  async exportTools(): Promise<Blob> {
    const token = localStorage.getItem('teamclaw_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/tools/export`, { headers });
    if (!res.ok) throw new Error('导出失败');
    return res.blob();
  },

  /** 导入 Tools */
  async importTools(file: File): Promise<{ imported: number; failed: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('teamclaw_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/tools/import`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || '导入失败');
    return json.data;
  },
};

export default toolsApi;
