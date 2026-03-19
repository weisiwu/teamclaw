/**
 * Agent API - 调用真实后端
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9700";

// ============ 类型定义 ============
export type AgentStatus = "idle" | "busy" | "error" | "offline";
export type AgentLevel = 1 | 2 | 3;

export interface Agent {
  name: string;
  role: string;
  level: AgentLevel;
  description: string;
  inGroup: boolean;
  defaultModel: string;
  capabilities: string[];
  workspace: string;
  status: AgentStatus;
  currentTask: string | null;
  currentTaskStartedAt: string | null;
  lastHeartbeat: string | null;
  loadScore: number;
}

export interface TeamOverview {
  levels: {
    level: AgentLevel;
    label: string;
    agents: Agent[];
  }[];
  dispatchMatrix: Record<string, string[]>;
}

export interface DispatchRequest {
  fromAgent: string;
  toAgent: string;
  taskId: string;
  taskTitle: string;
  priority?: "low" | "normal" | "high" | "urgent";
  deadline?: string;
  dependencies?: string[];
  description?: string;
}

// ============ API 请求工具 ============
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || "API 请求失败");
  return json.data as T;
}

// ============ Agent API ============
export const agentApi = {
  /** 获取所有 Agent 列表 */
  async getAll(): Promise<Agent[]> {
    const data = await request<{ list: Agent[]; total: number }>("/api/v1/agents");
    return data.list;
  },

  /** 获取单个 Agent 详情 */
  async getByName(name: string): Promise<Agent> {
    return request<Agent>(`/api/v1/agents/${name}`);
  },

  /** 获取团队编排概览 */
  async getTeamOverview(): Promise<TeamOverview> {
    return request<TeamOverview>("/api/v1/agents/team");
  },

  /** 更新 Agent 配置 */
  async updateConfig(name: string, updates: { defaultModel?: string; capabilities?: string[] }): Promise<Agent> {
    return request<Agent>(`/api/v1/agents/${name}/config`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  /** 获取 Agent 历史会话 */
  async getSessions(name: string): Promise<{ sessionId: string; updatedAt: string; label: string }[]> {
    const data = await request<{ list: { sessionId: string; updatedAt: string; label: string }[]; total: number }>(
      `/api/v1/agents/${name}/sessions`
    );
    return data.list;
  },

  /** 向指定 Agent 分发任务 */
  async dispatch(req: DispatchRequest): Promise<{ taskId: string; message: string }> {
    return request<{ taskId: string; message: string }>(`/api/v1/agents/${req.toAgent}/dispatch`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  },
};

export default agentApi;
