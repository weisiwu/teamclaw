/**
 * Agent 执行引擎
 * 负责实际触发 Agent 执行任务、管理执行上下文、处理执行结果
 *
 * 避免循环依赖原则：
 * - 同步静态 import 仅来自无环依赖的上游模块（constants/models）
 * - 可能产生循环的下游模块（taskLifecycle、messageReply）通过动态 import 延迟加载
 * - 子任务派发（maybeDispatchSubtasks）有最大深度限制，防止自引用循环
 *
 * 持久化：PostgreSQL agent_executions 表 + 内存 Map 缓存
 */

import { getAgent, releaseAgent, updateAgentStatus, updateLoadScore } from './agentService.js';
import { canDispatch } from '../constants/agents.js';
import { buildSystemPrompt, getUserPromptPrefix } from '../prompts/agentPrompts.js';
import { taskMemory } from './taskMemory.js';
import { llmCostTracker } from './llmCostTracker.js';
import { agentExecutionRepo } from '../db/repositories/agentExecutionRepo.js';
import {
  LLMMessages,
  llmAutoRoute,
  estimateComplexity,
  selectTierByComplexity,
} from './llmService.js';
import { agentToolBindingService } from './agentToolBindingService.js';
import { toolService } from './toolService.js';

export interface ExecutionContext {
  executionId: string;
  taskId: string;
  dispatcher: string; // 谁发起的
  targetAgent: string; // 执行者
  prompt: string; // 任务描述
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  result?: string;
  error?: string;
  model?: string; // 使用的模型
  durationMs?: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  costUsd?: number;
}

export interface DispatchRequest {
  dispatcher: string; // 发起者 (main/pm/...)
  targetAgent: string; // 目标 Agent
  taskId: string; // 关联任务 ID
  prompt: string; // 任务描述
  timeoutMs?: number; // 超时时间，默认 5 分钟
  model?: string; // 可选指定模型
}

// ============ 内存存储（DB-backed cache） ============
const executionLogs: Map<string, ExecutionContext> = new Map();
const agentExecStates: Map<string, { executionId: string; startedAt: string }> = new Map();

// Load from DB on module init
(async () => {
  try {
    const { rows } = await agentExecutionRepo.findByFilters({ limit: 1000 });
    for (const row of rows) {
      const ctx: ExecutionContext = {
        executionId: row.execution_id,
        taskId: row.task_id ?? '',
        dispatcher: row.dispatcher,
        targetAgent: row.target_agent,
        prompt: row.prompt,
        createdAt: row.created_at.toISOString(),
        startedAt: row.started_at?.toISOString(),
        completedAt: row.completed_at?.toISOString(),
        status: row.status as ExecutionContext['status'],
        result: row.result ?? undefined,
        error: row.error ?? undefined,
        model: row.model ?? undefined,
        durationMs: row.duration_ms ? Number(row.duration_ms) : undefined,
        usage: (row.usage_total_tokens || row.usage_input_tokens || row.usage_output_tokens)
          ? {
              inputTokens: Number(row.usage_input_tokens ?? 0),
              outputTokens: Number(row.usage_output_tokens ?? 0),
              totalTokens: Number(row.usage_total_tokens ?? 0),
            }
          : undefined,
        costUsd: row.cost_usd ? Number(row.cost_usd) : undefined,
      };
      executionLogs.set(ctx.executionId, ctx);
      // Restore running agent states
      if (ctx.status === 'running' && ctx.startedAt) {
        agentExecStates.set(ctx.targetAgent, { executionId: ctx.executionId, startedAt: ctx.startedAt });
      }
    }
    console.log(`[agentExecution] Loaded ${rows.length} execution records from PostgreSQL`);
  } catch (err) {
    console.warn('[agentExecution] Failed to load from DB:', err);
  }
})();

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
    if (existing && existing.status === 'running') {
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
    status: 'pending',
    model: model || agent.defaultModel,
  };

  executionLogs.set(executionId, context);
  agentExecStates.set(targetAgent, { executionId, startedAt: now });

  // Persist to DB (non-blocking)
  agentExecutionRepo.upsert({
    executionId: context.executionId,
    taskId: context.taskId,
    dispatcher: context.dispatcher,
    targetAgent: context.targetAgent,
    prompt: context.prompt,
    createdAt: context.createdAt,
    startedAt: context.startedAt,
    status: context.status,
    model: context.model,
  }).catch(err => console.error('[agentExecution] Failed to persist new execution:', err));

  // 更新 Agent 运行时状态
  updateAgentStatus(targetAgent, 'running', taskId);
  updateLoadScore(targetAgent, 15);

  // 异步执行 LLM（不阻塞 HTTP 响应）
  const timeoutMs = req.timeoutMs ?? 5 * 60 * 1000; // 默认 5 分钟
  executeAgentTask(context, timeoutMs).catch(err => {
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
  updateExecution(executionId, { status: 'running' });

  // 构建 system + user messages（含工具权限上下文）
  const messages = await buildAgentMessages(targetAgent, taskId, prompt);

  // 设置超时
  const timeoutHandle = setTimeout(() => {
    const ctx = executionLogs.get(executionId);
    if (ctx && ctx.status === 'running') {
      updateExecution(executionId, {
        status: 'timeout',
        error: `执行超时（${Math.round(timeoutMs / 1000)}s）`,
      });
    }
  }, timeoutMs);

  const startMs = Date.now();

  try {
    // 调用 LLM（自动路由选择模型层级，传入 agentName 以支持动态 Token 解析）
    const response = await llmAutoRoute(messages, undefined, targetAgent);

    clearTimeout(timeoutHandle);

    const durationMs = Date.now() - startMs;

    // 记录 token 用量
    context.usage = response.usage;
    context.costUsd = estimateCost(
      response.provider,
      response.usage.inputTokens,
      response.usage.outputTokens
    );
    context.model = response.model;

    // 记录到成本追踪器
    const complexity = estimateComplexity(prompt);
    const tier = selectTierByComplexity(complexity);
    llmCostTracker.record(response, durationMs, tier);

    // 记录到任务记忆
    await taskMemory.addMessage(taskId, targetAgent, 'user', prompt);
    await taskMemory.addMessage(taskId, targetAgent, 'assistant', response.content);

    // 更新执行结果
    updateExecution(executionId, {
      status: 'completed',
      result: response.content,
    });

    // main Agent 完成后自动派发子任务给 coder（如果需要）
    if (targetAgent === 'main') {
      maybeDispatchSubtasks(context, response.content, 0);
    }
  } catch (err) {
    clearTimeout(timeoutHandle);
    const message = err instanceof Error ? err.message : String(err);
    updateExecution(executionId, {
      status: 'failed',
      error: message,
    });
  }
}

/**
 * 为 Agent 构建 LLM 消息列表
 * 集成 Agent-Tool 权限上下文，使 LLM 知道该 Agent 可用/不可用哪些工具
 */
async function buildAgentMessages(agentName: string, taskId: string, prompt: string): Promise<LLMMessages[]> {
  // 构建任务上下文
  const sessionId = `exec_${taskId}`;
  const taskContext = taskMemory.buildContextPrompt(taskId, sessionId);

  // 获取权限上下文：告知 LLM 该 Agent 可用哪些工具
  const permissionContext = await buildPermissionContext(agentName);

  // 构建 system prompt
  const systemPrompt = buildSystemPrompt(agentName, {
    taskContext: taskContext ? `${taskContext}\n\n${permissionContext}` : permissionContext,
  });

  const userPrompt = getUserPromptPrefix(agentName) + prompt;

  const messages: LLMMessages[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  return messages;
}

/**
 * 为指定 Agent 构建工具权限上下文，注入 system prompt
 * 根据显式绑定 + 默认策略决定可用工具列表
 */
async function buildPermissionContext(agentName: string): Promise<string> {
  try {
    const allTools = await toolService.getAllTools(true);

    const allowed: string[] = [];
    const denied: string[] = [];
    const needsApproval: string[] = [];

    for (const tool of allTools) {
      if (!tool.enabled) continue; // 全局禁用的 Tool 跳过

      const canUse = await agentToolBindingService.canUse(agentName, tool.id);
      const needsApprove = await agentToolBindingService.needsApproval(agentName, tool.id);

      if (canUse) {
        if (needsApprove) {
          needsApproval.push(tool.displayName);
        } else {
          allowed.push(tool.displayName);
        }
      } else {
        denied.push(tool.displayName);
      }
    }

    const lines: string[] = ['\n\n## 🔐 你的工具权限'];
    if (allowed.length > 0) {
      lines.push(`**可用工具**：${allowed.join('、')}`);
    }
    if (needsApproval.length > 0) {
      lines.push(`**需审批工具**（执行前需等待人工审批）：${needsApproval.join('、')}`);
    }
    if (denied.length > 0) {
      lines.push(`**禁止使用**：${denied.join('、')}`);
      lines.push('（如有疑问请联系管理员）');
    }

    return lines.join('\n');
  } catch (err) {
    // 权限获取失败时不影响主流程，仅记录日志
    console.warn(`[agentExecution] Failed to build permission context for ${agentName}:`, err);
    return '';
  }
}

/** 最大子任务派发深度，防止自引用循环 */
const MAX_SUBDISPATCH_DEPTH = 3;

/**
 * main Agent 响应后，解析结果并自动派发子任务
 * 从 LLM 输出中提取子任务派发指令
 */
async function maybeDispatchSubtasks(
  context: ExecutionContext,
  llmResponse: string,
  depth = 0
): Promise<void> {
  // 防止自引用循环：超过最大深度则停止
  if (depth >= MAX_SUBDISPATCH_DEPTH) {
    console.warn(
      `[agentExecution] Max sub-dispatch depth (${MAX_SUBDISPATCH_DEPTH}) reached, stopping.`
    );
    return;
  }

  // 简单解析：检测 LLM 输出中是否有 [DISPATCH: agentName: taskDescription] 格式
  const dispatchPattern = /\[DISPATCH:\s*(\w+):\s*([^\]]+)\]/g;
  let match;

  while ((match = dispatchPattern.exec(llmResponse)) !== null) {
    const [, agentName, taskDescription] = match;
    const allowedAgents = ['pm', 'coder1', 'coder2', 'reviewer'];
    if (allowedAgents.includes(agentName)) {
      console.log(
        `[agentExecution] Auto-dispatching to ${agentName} (depth=${depth + 1}): ${taskDescription.trim().slice(0, 60)}`
      );
      // 派发子任务（异步，不阻塞）
      // 注意：这里不再递归调用 dispatchToAgent 的同步链，
      // 而是创建新的 ExecutionContext，打破自引用循环
      const subReq: DispatchRequest = {
        dispatcher: 'main',
        targetAgent: agentName,
        taskId: `sub_${context.taskId}_${Date.now()}`,
        prompt: taskDescription.trim(),
        timeoutMs: 5 * 60 * 1000,
      };
      const subContext = dispatchToAgent(subReq);
      if ('error' in subContext) {
        console.warn(`[agentExecution] Sub-dispatch failed: ${subContext.error}`);
      }
    }
  }
}

/**
 * 更新执行状态（外部回调）
 */
export function updateExecution(
  executionId: string,
  updates: Partial<Pick<ExecutionContext, 'status' | 'result' | 'error' | 'usage' | 'costUsd'>>
): boolean {
  const ctx = executionLogs.get(executionId);
  if (!ctx) return false;

  if (updates.status) ctx.status = updates.status;
  if (updates.result) ctx.result = updates.result;
  if (updates.error) ctx.error = updates.error;
  if (updates.usage) ctx.usage = updates.usage;
  if (updates.costUsd !== undefined) ctx.costUsd = updates.costUsd;

  if (ctx.status === 'completed' || ctx.status === 'failed' || ctx.status === 'timeout') {
    ctx.completedAt = new Date().toISOString();
    if (ctx.startedAt && ctx.completedAt) {
      ctx.durationMs = new Date(ctx.completedAt).getTime() - new Date(ctx.startedAt).getTime();
    }
    // 释放 Agent
    releaseAgent(ctx.targetAgent);
    agentExecStates.delete(ctx.targetAgent);
    updateLoadScore(ctx.targetAgent, -10);

    // Persist completion to DB (non-blocking)
    agentExecutionRepo.upsert({
      executionId: ctx.executionId,
      status: ctx.status,
      result: ctx.result,
      error: ctx.error,
      completedAt: ctx.completedAt,
      durationMs: ctx.durationMs,
      usageInputTokens: ctx.usage?.inputTokens,
      usageOutputTokens: ctx.usage?.outputTokens,
      usageTotalTokens: ctx.usage?.totalTokens,
      costUsd: ctx.costUsd,
    }).catch(err => console.error('[agentExecution] Failed to persist completion:', err));

    // 执行完成回调：触发消息回复
    onExecutionComplete(ctx).catch(err => {
      console.error('[agentExecution] onExecutionComplete error:', err.message);
    });
  } else {
    // Persist status update to DB (non-blocking)
    agentExecutionRepo.upsert({
      executionId: ctx.executionId,
      status: ctx.status,
      result: ctx.result,
      error: ctx.error,
      usageInputTokens: ctx.usage?.inputTokens,
      usageOutputTokens: ctx.usage?.outputTokens,
      usageTotalTokens: ctx.usage?.totalTokens,
      costUsd: ctx.costUsd,
    }).catch(err => console.error('[agentExecution] Failed to persist status update:', err));
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
    const replyContent =
      ctx.status === 'completed'
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
  status?: ExecutionContext['status'];
  limit?: number;
  offset?: number;
}): { total: number; items: ExecutionContext[] } {
  let items = Array.from(executionLogs.values());

  if (opts.agentName) items = items.filter(e => e.targetAgent === opts.agentName);
  if (opts.dispatcher) items = items.filter(e => e.dispatcher === opts.dispatcher);
  if (opts.taskId) items = items.filter(e => e.taskId === opts.taskId);
  if (opts.status) items = items.filter(e => e.status === opts.status);

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

  ctx.status = 'failed';
  ctx.error = `被强制终止: ${reason}`;
  ctx.completedAt = new Date().toISOString();
  ctx.durationMs = new Date(ctx.completedAt).getTime() - new Date(ctx.startedAt!).getTime();

  releaseAgent(agentName);
  agentExecStates.delete(agentName);
  updateLoadScore(agentName, -15);

  // Persist abort to DB (non-blocking)
  agentExecutionRepo.upsert({
    executionId: ctx.executionId,
    status: 'failed',
    error: ctx.error,
    completedAt: ctx.completedAt,
    durationMs: ctx.durationMs,
  }).catch(err => console.error('[agentExecution] Failed to persist abort:', err));

  return true;
}

/**
 * 获取 Agent 统计信息
 */
export function getAgentExecutionStats(agentName?: string): Record<
  string,
  {
    total: number;
    completed: number;
    failed: number;
    timeout: number;
    avgDurationMs: number;
  }
> {
  const agents = agentName ? [agentName] : ['main', 'pm', 'reviewer', 'coder1', 'coder2'];

  const stats: Record<
    string,
    {
      total: number;
      completed: number;
      failed: number;
      timeout: number;
      avgDurationMs: number;
    }
  > = {};

  for (const name of agents) {
    const items = Array.from(executionLogs.values()).filter(e => e.targetAgent === name);
    const completed = items.filter(e => e.status === 'completed');
    const failed = items.filter(e => e.status === 'failed');
    const timeout = items.filter(e => e.status === 'timeout');
    const durations = completed.map(e => e.durationMs || 0).filter(d => d > 0);

    stats[name] = {
      total: items.length,
      completed: completed.length,
      failed: failed.length,
      timeout: timeout.length,
      avgDurationMs:
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0,
    };
  }

  return stats;
}
