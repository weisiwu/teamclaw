/**
 * Agent 执行引擎
 * 负责实际触发 Agent 执行任务、管理执行上下文、处理执行结果
 */

import { getAgent, releaseAgent, updateAgentStatus, updateLoadScore } from "./agentService.js";
import { canDispatch } from "../constants/agents.js";

export interface ExecutionContext {
  executionId: string;
  taskId: string;
  dispatcher: string;      // 谁发起的
  targetAgent: string;     // 执行者
  prompt: string;          // 任务描述
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  status: "pending" | "running" | "completed" | "failed" | "timeout";
  result?: string;
  error?: string;
  model?: string;          // 使用的模型
  durationMs?: number;
}

export interface DispatchRequest {
  dispatcher: string;      // 发起者 (main/pm/...)
  targetAgent: string;    // 目标 Agent
  taskId: string;         // 关联任务 ID
  prompt: string;         // 任务描述
  timeoutMs?: number;     // 超时时间，默认 5 分钟
  model?: string;         // 可选指定模型
}

// ============ 内存存储 ============
const executionLogs: Map<string, ExecutionContext> = new Map();
const agentExecStates: Map<string, { executionId: string; startedAt: string }> = new Map();

// ============ 执行引擎核心 ============

/**
 * 派发任务到指定 Agent（生成执行记录）
 * 实际执行由 sessions_send 触发
 */
export function dispatchToAgent(req: DispatchRequest): ExecutionContext | { error: string } {
  const { dispatcher, targetAgent, taskId, prompt, model } = req;

  // 权限校验
  if (!canDispatch(dispatcher, targetAgent)) {
    return { error: `Agent ${dispatcher} 无权指派任务给 ${targetAgent}` };
  }

  // 目标 Agent 存在性校验
  const agent = getAgent(targetAgent);
  if (!agent) {
    return { error: `Agent ${targetAgent} 不存在` };
  }

  // 检查 Agent 是否忙碌
  const currentState = agentExecStates.get(targetAgent);
  if (currentState) {
    const existing = executionLogs.get(currentState.executionId);
    if (existing && existing.status === "running") {
      return { error: `Agent ${targetAgent} 正忙（executionId: ${currentState.executionId}）` };
    }
  }

  const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const context: ExecutionContext = {
    executionId,
    taskId,
    dispatcher,
    targetAgent,
    prompt,
    createdAt: now,
    startedAt: now,
    status: "pending",
    model: model || agent.defaultModel,
  };

  executionLogs.set(executionId, context);
  agentExecStates.set(targetAgent, { executionId, startedAt: now });

  // 更新 Agent 运行时状态
  updateAgentStatus(targetAgent, "running", taskId);
  updateLoadScore(targetAgent, 15);

  return context;
}

/**
 * 更新执行状态（外部回调）
 */
export function updateExecution(
  executionId: string,
  updates: Partial<Pick<ExecutionContext, "status" | "result" | "error">>
): boolean {
  const ctx = executionLogs.get(executionId);
  if (!ctx) return false;

  if (updates.status) ctx.status = updates.status;
  if (updates.result) ctx.result = updates.result;
  if (updates.error) ctx.error = updates.error;

  if (ctx.status === "completed" || ctx.status === "failed" || ctx.status === "timeout") {
    ctx.completedAt = new Date().toISOString();
    if (ctx.startedAt && ctx.completedAt) {
      ctx.durationMs = new Date(ctx.completedAt).getTime() - new Date(ctx.startedAt).getTime();
    }
    // 释放 Agent
    releaseAgent(ctx.targetAgent);
    agentExecStates.delete(ctx.targetAgent);
    updateLoadScore(ctx.targetAgent, -10);
  }

  return true;
}

/**
 * 获取执行记录
 */
export function getExecution(executionId: string): ExecutionContext | undefined {
  return executionLogs.get(executionId);
}

/**
 * 获取 Agent 的当前执行状态
 */
export function getAgentExecutionState(agentName: string): ExecutionContext | undefined {
  const state = agentExecStates.get(agentName);
  if (!state) return undefined;
  return executionLogs.get(state.executionId);
}

/**
 * 获取执行历史（分页）
 */
export function getExecutionHistory(opts: {
  agentName?: string;
  dispatcher?: string;
  taskId?: string;
  status?: ExecutionContext["status"];
  limit?: number;
  offset?: number;
}): { total: number; items: ExecutionContext[] } {
  let items = Array.from(executionLogs.values());

  if (opts.agentName) items = items.filter((e) => e.targetAgent === opts.agentName);
  if (opts.dispatcher) items = items.filter((e) => e.dispatcher === opts.dispatcher);
  if (opts.taskId) items = items.filter((e) => e.taskId === opts.taskId);
  if (opts.status) items = items.filter((e) => e.status === opts.status);

  // 按时间倒序
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = items.length;
  const offset = opts.offset || 0;
  const limit = opts.limit || 20;
  return { total, items: items.slice(offset, offset + limit) };
}

/**
 * 强制终止 Agent 的当前执行
 */
export function abortExecution(agentName: string, reason: string): boolean {
  const state = agentExecStates.get(agentName);
  if (!state) return false;

  const ctx = executionLogs.get(state.executionId);
  if (!ctx) return false;

  ctx.status = "failed";
  ctx.error = `被强制终止: ${reason}`;
  ctx.completedAt = new Date().toISOString();
  ctx.durationMs = new Date(ctx.completedAt).getTime() - new Date(ctx.startedAt!).getTime();

  releaseAgent(agentName);
  agentExecStates.delete(agentName);
  updateLoadScore(agentName, -15);

  return true;
}

/**
 * 获取 Agent 统计信息
 */
export function getAgentExecutionStats(agentName?: string): Record<string, {
  total: number;
  completed: number;
  failed: number;
  timeout: number;
  avgDurationMs: number;
}> {
  const agents = agentName ? [agentName] : ["main", "pm", "reviewer", "coder1", "coder2"];

  const stats: Record<string, {
    total: number;
    completed: number;
    failed: number;
    timeout: number;
    avgDurationMs: number;
  }> = {};

  for (const name of agents) {
    const items = Array.from(executionLogs.values()).filter((e) => e.targetAgent === name);
    const completed = items.filter((e) => e.status === "completed");
    const failed = items.filter((e) => e.status === "failed");
    const timeout = items.filter((e) => e.status === "timeout");
    const durations = completed.map((e) => e.durationMs || 0).filter((d) => d > 0);

    stats[name] = {
      total: items.length,
      completed: completed.length,
      failed: failed.length,
      timeout: timeout.length,
      avgDurationMs: durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
    };
  }

  return stats;
}
