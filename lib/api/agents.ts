/**
 * Agent API - 调用真实后端
 */

const API_BASE = '/api/v1';

// ============ 类型定义 ============
export type AgentStatus = 'idle' | 'busy' | 'error' | 'offline';
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
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  deadline?: string;
  dependencies?: string[];
  description?: string;
}

// ============ API 请求工具 ============
function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('teamclaw_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  if (!json.success) throw new Error(json.message || 'API 请求失败');
  return json.data as T;
}

// ============ Pipeline 类型 ============
export type PipelineStageName = 'confirm' | 'clarify' | 'code' | 'review' | 'notify' | 'complete';
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

export interface PipelineStage {
  name: PipelineStageName;
  agent: string;
  status: PipelineStatus;
  input?: string;
  output?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface Pipeline {
  pipelineId: string;
  taskId: string;
  originalRequirement: string;
  stages: PipelineStage[];
  currentStageIndex: number;
  status: PipelineStatus;
  pmSessionId?: string;
  codeResult?: string;
  reviewResult?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClarificationQuestion {
  index: number;
  question: string;
  answered: boolean;
  answer?: string;
}

export interface PMSession {
  sessionId: string;
  taskId: string;
  originalRequirement: string;
  questions: ClarificationQuestion[];
  totalQuestions: number;
  status: 'active' | 'waiting' | 'completed';
  requirementDoc?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Agent API ============
export const agentApi = {
  /** 获取所有 Agent 列表 */
  async getAll(): Promise<Agent[]> {
    const data = await request<{ list: Agent[]; total: number }>('/agents');
    return data.list;
  },

  /** 获取单个 Agent 详情 */
  async getByName(name: string): Promise<Agent> {
    return request<Agent>(`/agents/${name}`);
  },

  /** 获取团队编排概览 */
  async getTeamOverview(): Promise<TeamOverview> {
    return request<TeamOverview>('/agents/team');
  },

  /** 更新 Agent 配置 */
  async updateConfig(
    name: string,
    updates: { defaultModel?: string; capabilities?: string[] }
  ): Promise<Agent> {
    return request<Agent>(`/agents/${name}/config`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /** 获取 Agent 历史会话 */
  async getSessions(
    name: string
  ): Promise<{ sessionId: string; updatedAt: string; label: string }[]> {
    const data = await request<{
      list: { sessionId: string; updatedAt: string; label: string }[];
      total: number;
    }>(`/agents/${name}/sessions`);
    return data.list;
  },

  /** 向指定 Agent 分发任务 */
  async dispatch(req: DispatchRequest): Promise<{ taskId: string; message: string }> {
    return request<{ taskId: string; message: string }>(`/agents/${req.toAgent}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /** 启动协作流水线 */
  async startPipeline(
    taskId: string,
    requirement: string
  ): Promise<{ pipelineId: string; status: PipelineStatus }> {
    return request<{ pipelineId: string; status: PipelineStatus }>(
      '/agents/pipeline/start',
      {
        method: 'POST',
        body: JSON.stringify({ taskId, requirement }),
      }
    );
  },

  /** 获取流水线状态 */
  async getPipeline(pipelineId: string): Promise<Pipeline> {
    return request<Pipeline>(`/agents/pipeline/${pipelineId}`);
  },

  /** 提交 PM 澄清问题回答 */
  async submitPMAnswer(
    pipelineId: string,
    questionIndex: number,
    answer: string
  ): Promise<{ remaining: number; isComplete: boolean }> {
    return request<{ remaining: number; isComplete: boolean }>(
      `/agents/pipeline/${pipelineId}/answer`,
      {
        method: 'POST',
        body: JSON.stringify({ questionIndex, answer }),
      }
    );
  },

  /** 获取 PM 会话状态 */
  async getPMSession(pipelineId: string): Promise<PMSession | null> {
    return request<PMSession | null>(`/agents/pipeline/${pipelineId}/pm-session`);
  },
};

export default agentApi;
