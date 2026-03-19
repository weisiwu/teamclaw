/**
 * Agent 执行引擎 API 封装
 * 封装 execution 和 health 相关 API
 */

// ============ 执行引擎 API ============

export interface ExecutionContext {
  executionId: string;
  taskId: string;
  dispatcher: string;
  targetAgent: string;
  prompt: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  status: "pending" | "running" | "completed" | "failed" | "timeout";
  result?: string;
  error?: string;
  model?: string;
  durationMs?: number;
}

export interface ExecutionStats {
  total: number;
  completed: number;
  failed: number;
  timeout: number;
  avgDurationMs: number;
}

export interface DispatchRequest {
  dispatcher: string;
  targetAgent: string;
  taskId: string;
  prompt: string;
  timeoutMs?: number;
  model?: string;
}

const BASE = "/api/v1/agents";

export const agentExecutionApi = {
  /** 派发执行任务 */
  execute: (req: DispatchRequest) =>
    fetch(`${BASE}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }).then((r) => r.json()),

  /** 获取执行历史 */
  getHistory: (params?: {
    agentName?: string;
    dispatcher?: string;
    taskId?: string;
    status?: ExecutionContext["status"];
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.agentName) qs.set("agentName", params.agentName);
    if (params?.dispatcher) qs.set("dispatcher", params.dispatcher);
    if (params?.taskId) qs.set("taskId", params.taskId);
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    return fetch(`${BASE}/executions?${qs}`).then((r) => r.json());
  },

  /** 获取单个执行记录 */
  getExecution: (executionId: string) =>
    fetch(`${BASE}/executions/${executionId}`).then((r) => r.json()),

  /** 获取 Agent 当前执行状态 */
  getExecutionState: (agentName: string) =>
    fetch(`${BASE}/${agentName}/execution-state`).then((r) => r.json()),

  /** 获取 Agent 执行统计 */
  getStats: (agentName: string) =>
    fetch(`${BASE}/${agentName}/stats`).then((r) => r.json()),

  /** 获取所有 Agent 执行统计 */
  getAllStats: () =>
    fetch(`${BASE}/executions/stats`).then((r) => r.json()),

  /** 强制终止 Agent 执行 */
  abort: (agentName: string, reason?: string) =>
    fetch(`${BASE}/${agentName}/abort`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }).then((r) => r.json()),
};

// ============ 健康监控 API ============

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "offline";

export interface AgentHealth {
  name: string;
  status: HealthStatus;
  lastHeartbeat: string | null;
  consecutiveMissedHeartbeats: number;
  uptime: string;
  totalExecutions: number;
  failureRate: number;
  avgResponseTime: number;
  issues: string[];
  recommendations: string[];
}

export interface HealthReport {
  overall: HealthStatus;
  checkedAt: string;
  agents: AgentHealth[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    offline: number;
  };
}

export interface HealthCheckResult {
  checkedAt: string;
  recovered: string[];
  stillStuck: string[];
  offline: string[];
}

export const agentHealthApi = {
  /** 获取团队健康报告 */
  getReport: () =>
    fetch(`${BASE}/health`).then((r) => r.json()),

  /** 触发健康检查+自动恢复 */
  runCheck: () =>
    fetch(`${BASE}/health/check`, { method: "POST" }).then((r) => r.json()),

  /** 记录心跳 */
  recordHeartbeat: (agentName: string) =>
    fetch(`${BASE}/health/heartbeat/${agentName}`, { method: "POST" }).then((r) => r.json()),

  /** 获取心跳历史 */
  getHeartbeatHistory: (agentName: string, limit = 20) =>
    fetch(`${BASE}/health/heartbeat/${agentName}?limit=${limit}`).then((r) => r.json()),
};
