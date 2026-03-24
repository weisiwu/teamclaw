/**
 * Agent-Tool Bindings API - 前端调用封装
 * 所有请求通过 Next.js API Routes 代理到 Express 后端
 */

const API_BASE = '/api/v1';

// ============ 类型定义 ============

export interface AgentToolBinding {
  id: string;
  agentName: string;
  toolId: string;
  enabled: boolean;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentToolBindingDetail extends AgentToolBinding {
  toolName: string;
  toolDisplayName: string;
  toolCategory: string;
  toolRiskLevel: string;
  toolRequiresApproval: boolean;
  toolEnabled: boolean;
}

export interface AgentToolMatrixRow {
  agentName: string;
  agentDisplayName?: string;
  bindings: Array<{
    toolId: string;
    toolName: string;
    toolDisplayName: string;
    toolCategory: string;
    toolRiskLevel: string;
    enabled: boolean;
    requiresApproval: boolean;
  }>;
}

export interface AgentToolPermissionRow {
  toolId: string;
  toolName: string;
  toolDisplayName: string;
  toolCategory: string;
  toolRiskLevel: string;
  toolEnabled: boolean;
  toolRequiresApproval: boolean;
  enabled: boolean;
  requiresApproval: boolean;
  hasExplicitBinding: boolean;
}

export interface BindingStats {
  totalBindings: number;
  enabledBindings: number;
  agentsWithBindings: number;
  toolsBound: number;
}

export interface SetBindingsRequest {
  bindings: Array<{
    toolId: string;
    enabled: boolean;
    requiresApproval?: boolean;
  }>;
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

// ============ Agent-Tool Bindings API ============
export const agentToolBindingsApi = {
  /**
   * 获取 Agent 可用的 Tool 列表（含绑定状态）
   * GET /api/v1/agents/:name/tools
   */
  async getAgentTools(agentName: string): Promise<AgentToolPermissionRow[]> {
    return request<AgentToolPermissionRow[]>(`/agents/${agentName}/tools`);
  },

  /**
   * 批量设置 Agent 的 Tool 权限
   * PUT /api/v1/agents/:name/tools
   */
  async setAgentTools(agentName: string, bindings: SetBindingsRequest['bindings']): Promise<AgentToolBindingDetail[]> {
    return request<AgentToolBindingDetail[]>(`/agents/${agentName}/tools`, {
      method: 'PUT',
      body: JSON.stringify({ bindings }),
    });
  },

  /**
   * 获取 Tool 被哪些 Agent 使用
   * GET /api/v1/tools/:id/agents
   */
  async getToolAgents(toolId: string): Promise<Array<AgentToolBinding & { agentDisplayName?: string }>> {
    return request<Array<AgentToolBinding & { agentDisplayName?: string }>>(`/tools/${toolId}/agents`);
  },

  /**
   * 全局绑定矩阵
   * GET /api/v1/agent-tool-matrix
   */
  async getAgentToolMatrix(): Promise<AgentToolMatrixRow[]> {
    return request<AgentToolMatrixRow[]>('/agent-tool-matrix');
  },

  /**
   * 获取绑定统计
   * GET /api/v1/agent-tool-bindings/stats
   */
  async getStats(): Promise<BindingStats> {
    return request<BindingStats>('/agent-tool-bindings/stats');
  },

  /**
   * 更新单个绑定
   * PATCH /api/v1/agent-tool-bindings/:id
   */
  async updateBinding(
    id: string,
    params: { enabled?: boolean; requiresApproval?: boolean }
  ): Promise<AgentToolBindingDetail> {
    return request<AgentToolBindingDetail>(`/agent-tool-bindings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },

  /**
   * 删除绑定
   * DELETE /api/v1/agent-tool-bindings/:id
   */
  async deleteBinding(id: string): Promise<void> {
    await request<void>(`/agent-tool-bindings/${id}`, { method: 'DELETE' });
  },

  /**
   * 权限检查（调试用）
   * POST /api/v1/agent-tool-bindings/check
   */
  async checkPermission(agentName: string, toolId: string): Promise<{
    agentName: string;
    toolId: string;
    canUse: boolean;
    needsApproval: boolean;
  }> {
    return request<{ agentName: string; toolId: string; canUse: boolean; needsApproval: boolean }>(
      '/agent-tool-bindings/check',
      {
        method: 'POST',
        body: JSON.stringify({ agentName, toolId }),
      }
    );
  },
};

export default agentToolBindingsApi;
