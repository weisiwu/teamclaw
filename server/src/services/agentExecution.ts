/**
 * Agent 执行引擎
 * 负责实际触发 Agent 执行任务、管理执行上下文、处理执行结果
 */

import { getAgent, releaseAgent, updateAgentStatus, updateLoadScore } from "./agentService.js";
import { canDispatch } from "../constants/agents.js";
import { buildSystemPrompt, getUserPromptPrefix } from "../prompts/agentPrompts.js";
import { taskMemory } from "./taskMemory.js";
import { llmCostTracker } from "./llmCostTracker.js";
import {
  LLMMessages,
  llmAutoRoute,
  estimateComplexity,
  selectTierByComplexity,
  type LLMResponse,
} from "./agentExecution.js";

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
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd?: number;
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
 * 派发任务到指定 Agent（异步执行真实 LLM 调用）
 * 立即返回 executionId，后台异步执行 LLM
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

  // 异步执行 LLM（不阻塞 HTTP 响应）
  const timeoutMs = req.timeoutMs ?? 5 * 60 * 1000; // 默认 5 分钟
  executeAgentTask(context, timeoutMs).catch((err) => {
    console.error(`[agentExecution] Async execution error for ${executionId}:`, err.message);
  });

  return context;
}

/**
 * 异步执行 Agent 任务的实际 LLM 调用
 */
async function executeAgentTask(context: ExecutionContext, timeoutMs: number): Promise<void> {
  const { executionId, targetAgent, taskId, prompt } = context;

  // 标记为 running
  updateExecution(executionId, { status: "running" });

  // 构建 system + user messages
  const messages = buildAgentMessages(targetAgent, taskId, prompt);

  // 设置超时
  const timeoutHandle = setTimeout(() => {
    const ctx = executionLogs.get(executionId);
    if (ctx && ctx.status === "running") {
      updateExecution(executionId, {
        status: "timeout",
        error: `执行超时（${Math.round(timeoutMs / 1000)}s）`,
      });
    }
  }, timeoutMs);

  const startMs = Date.now();

  try {
    // 调用 LLM（自动路由选择模型层级）
    const response = await llmAutoRoute(messages);

    clearTimeout(timeoutHandle);

    const durationMs = Date.now() - startMs;

    // 记录 token 用量
    context.usage = response.usage;
    context.costUsd = estimateCost(response.provider, response.usage.inputTokens, response.usage.outputTokens);
    context.model = response.model;

    // 记录到成本追踪器
    const complexity = estimateComplexity(prompt);
    const tier = selectTierByComplexity(complexity);
    llmCostTracker.record(response, durationMs, tier);

    // 记录到任务记忆
    taskMemory.addMessage(taskId, targetAgent, "user", prompt);
    taskMemory.addMessage(taskId, targetAgent, "assistant", response.content);

    // 更新执行结果
    updateExecution(executionId, {
      status: "completed",
      result: response.content,
    });

    // main Agent 完成后自动派发子任务给 coder（如果需要）
    if (targetAgent === "main") {
      maybeDispatchSubtasks(context, response.content);
    }
  } catch (err) {
    clearTimeout(timeoutHandle);
    const message = err instanceof Error ? err.message : String(err);
    updateExecution(executionId, {
      status: "failed",
      error: message,
    });
  }
}

/**
 * 为 Agent 构建 LLM 消息列表
 */
function buildAgentMessages(agentName: string, taskId: string, prompt: string): LLMMessages[] {
  // 构建任务上下文
  const sessionId = `exec_${taskId}`;
  const taskContext = taskMemory.buildContextPrompt(taskId, sessionId);

  // 构建 system prompt
  const systemPrompt = buildSystemPrompt(agentName, {
    taskContext: taskContext || undefined,
  });

  const userPrompt = getUserPromptPrefix(agentName) + prompt;

  const messages: LLMMessages[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return messages;
}

/**
 * main Agent 响应后，解析结果并自动派发子任务
 * 从 LLM 输出中提取子任务派发指令
 */
async function maybeDispatchSubtasks(context: ExecutionContext, llmResponse: string): Promise<void> {
  // 简单解析：检测 LLM 输出中是否有 [DISPATCH: agentName: taskDescription] 格式
  const dispatchPattern = /\[DISPATCH:\s*(\w+):\s*([^\]]+)\]/g;
  let match;

  while ((match = dispatchPattern.exec(llmResponse)) !== null) {
    const [, agentName, taskDescription] = match;
    const allowedAgents = ["pm", "coder1", "coder2", "reviewer"];
    if (allowedAgents.includes(agentName)) {
      console.log(`[agentExecution] Auto-dispatching to ${agentName}: ${taskDescription.trim()}`);
      // 派发子任务（异步，不阻塞）
      dispatchToAgent({
        dispatcher: "main",
        targetAgent: agentName,
        taskId: `sub_${context.taskId}_${Date.now()}`,
        prompt: taskDescription.trim(),
        timeoutMs: 5 * 60 * 1000,
      });
    }
  }
}


/**
 * 更新执行状态（外部回调）
 */
export function updateExecution(
  executionId: string,
  updates: Partial<Pick<ExecutionContext, "status" | "result" | "error" | "usage" | "costUsd">>
): boolean {
  const ctx = executionLogs.get(executionId);
  if (!ctx) return false;

  if (updates.status) ctx.status = updates.status;
  if (updates.result) ctx.result = updates.result;
  if (updates.error) ctx.error = updates.error;
  if (updates.usage) ctx.usage = updates.usage;
  if (updates.costUsd !== undefined) ctx.costUsd = updates.costUsd;

  if (ctx.status === "completed" || ctx.status === "failed" || ctx.status === "timeout") {
    ctx.completedAt = new Date().toISOString();
    if (ctx.startedAt && ctx.completedAt) {
      ctx.durationMs = new Date(ctx.completedAt).getTime() - new Date(ctx.startedAt).getTime();
    }
    // 释放 Agent
    releaseAgent(ctx.targetAgent);
    agentExecStates.delete(ctx.targetAgent);
    updateLoadScore(ctx.targetAgent, -10);

    // 执行完成回调：触发消息回复
    onExecutionComplete(ctx).catch((err) => {
      console.error('[agentExecution] onExecutionComplete error:', err.message);
    });
  }

  return true;
}

/**
 * Agent 执行完成回调：向消息通道回复结果
 */
async function onExecutionComplete(ctx: ExecutionContext): Promise<void> {
  try {
    const { sendReply } = await import('./messageReply.js');
    const { taskLifecycle } = await import('./taskLifecycle.js');

    // 获取任务信息
    const task = ctx.taskId ? taskLifecycle.getTask(ctx.taskId) : null;

    // 构建回复内容
    const replyContent = ctx.status === 'completed'
      ? `✅ 任务已完成\n\n${ctx.result || '（无结果）'}`
      : ctx.status === 'failed'
      ? `❌ 任务执行失败\n\n${ctx.error || '（未知错误）'}`
      : `⏱️ 任务执行超时\n\n${ctx.error || '（超时）'}`;

    // 从任务上下文中获取 channel 和 userId（如果有）
    if (task?.contextSnapshot) {
      try {
        const snapshot = JSON.parse(task.contextSnapshot);
        if (snapshot.channel && snapshot.userId) {
          await sendReply({
            channel: snapshot.channel,
            userId: snapshot.userId,
            content: replyContent,
          });
        }
      } catch {
        // contextSnapshot 格式不符合，跳过
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[agentExecution] Reply on completion failed:', msg);
  }
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
