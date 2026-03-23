/**
 * Task Lifecycle Hooks
 * 任务机制模块 - 任务生命周期钩子
 *
 * 在任务状态变更时自动触发：
 * 1. 任务完成 → autoBump 版本升级
 * 2. 任务完成 → 群聊通知
 * 3. 任务完成 → LLM 摘要生成 + 向量化存储
 * 4. 状态变更 → 任务文件持久化
 * 5. 任务创建 → 上下文快照记录
 * 6. 消息完成 → 向量库存储
 */

import { Task, TaskStatus } from '../models/task.js';
import { executeAutoBump } from './autoBump.js';
import { taskMemory } from './taskMemory.js';
import { taskPersistence } from './taskPersistence.js';
import { contextSnapshot } from './contextSnapshot.js';
import { addDocuments } from './vectorStore.js';

interface TaskLifecycleWithCreate {
  onStatusChange: (hook: (task: Task, oldStatus: TaskStatus, newStatus: TaskStatus) => void | Promise<void>) => void;
  onCreate?: (hook: (task: Task) => void | Promise<void>) => void;
}

/**
 * 注册任务生命周期钩子
 * 在 taskLifecycle 初始化时调用一次
 */
export function registerTaskLifecycleHooks(lifecycle: TaskLifecycleWithCreate): void {
  // 任务完成 → 自动版本升级
  lifecycle.onStatusChange(onTaskDoneAutoBump);

  // 任务完成/失败/取消 → 群聊通知
  lifecycle.onStatusChange(onTaskDoneNotify);

  // 任务被暂停 → 通知
  lifecycle.onStatusChange(onTaskSuspendedNotify);

  // 任务完成 → LLM 摘要生成 + 向量化
  lifecycle.onStatusChange(onTaskDoneSummary);

  // 状态变更 → 任务文件持久化
  lifecycle.onStatusChange(onTaskStatusChangePersist);

  // 任务创建 → 上下文快照记录 + 注入历史上下文
  if (lifecycle.onCreate) {
    lifecycle.onCreate(onTaskCreated);
  }

  console.log('[taskLifecycleHooks] All hooks registered');
}

// ============ 钩子实现 ============

/**
 * 任务完成 → 自动版本升级
 */
async function onTaskDoneAutoBump(
  task: Task,
  oldStatus: TaskStatus,
  newStatus: TaskStatus
): Promise<void> {
  if (newStatus !== 'done') return;

  try {
    console.log(`[taskLifecycleHooks] Task ${task.taskId} done, triggering autoBump`);

    const versionId = task.versionId || 'default';

    await executeAutoBump({
      versionId,
      currentVersion: '0.0.0',
      triggerType: 'task_done',
      taskId: task.taskId,
      taskTitle: task.title,
      taskType: task.tags?.[0],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[taskLifecycleHooks] autoBump failed for task ${task.taskId}:`, msg);
  }
}

/**
 * 任务完成 → 群聊通知
 */
async function onTaskDoneNotify(
  task: Task,
  oldStatus: TaskStatus,
  newStatus: TaskStatus
): Promise<void> {
  if (!['done', 'failed', 'cancelled'].includes(newStatus)) return;

  const statusText: Record<string, string> = {
    done: '✅ 已完成',
    failed: '❌ 已失败',
    cancelled: '🚫 已取消',
  };

  const content = [
    `📋 **任务状态变更**`,
    `任务：${task.title}`,
    `状态：${statusText[newStatus] || newStatus}`,
    `执行者：${task.assignedAgent || '未知'}`,
    task.result ? `结果：${task.result}` : '',
  ].filter(Boolean).join('\n');

  try {
    console.log(`[taskLifecycleHooks] Notifying for task ${task.taskId}: ${content}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[taskLifecycleHooks] Notification failed for task ${task.taskId}:`, msg);
  }
}

/**
 * 任务被暂停 → 通知
 */
async function onTaskSuspendedNotify(
  task: Task,
  oldStatus: TaskStatus,
  newStatus: TaskStatus
): Promise<void> {
  if (newStatus !== 'suspended') return;

  try {
    console.log(`[taskLifecycleHooks] Task suspended: ${task.taskId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[taskLifecycleHooks] Suspend notification failed:`, msg);
  }
}

/**
 * 任务完成 → LLM 摘要生成 + 向量化存储
 */
async function onTaskDoneSummary(
  task: Task,
  oldStatus: TaskStatus,
  newStatus: TaskStatus
): Promise<void> {
  if (newStatus !== 'done') return;

  try {
    // 调用 taskMemory 的 LLM 摘要生成（包含向量化存储）
    const summary = await taskMemory.onTaskCompleted(task);
    if (summary) {
      console.log(`[taskLifecycleHooks] Task summary generated for ${task.taskId}: ${summary.summary.slice(0, 80)}...`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[taskLifecycleHooks] Failed to generate task summary for ${task.taskId}:`, msg);
  }
}

/**
 * 状态变更 → 任务文件持久化
 */
async function onTaskStatusChangePersist(
  task: Task,
  oldStatus: TaskStatus,
  newStatus: TaskStatus
): Promise<void> {
  if (oldStatus === newStatus) return;

  try {
    // 持久化任务文件到新目录
    await taskPersistence.persist(task);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[taskLifecycleHooks] Failed to persist task file for ${task.taskId}:`, msg);
  }
}

/**
 * 任务创建 → 上下文快照 + 注入历史任务上下文
 */
async function onTaskCreated(task: Task): Promise<void> {
  try {
    // 1. 记录上下文快照
    const snapshot = await contextSnapshot.capture(task.sessionId);
    task.contextSnapshot = snapshot;

    // 2. 语义检索相关历史任务并注入到描述
    const historicalContext = await taskMemory.enrichTaskContext(task);
    if (historicalContext) {
      task.description += `\n\n---\n### 相关历史任务\n${historicalContext}`;
    }

    console.log(`[taskLifecycleHooks] Task created with context snapshot for ${task.taskId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[taskLifecycleHooks] Failed to enrich task context for ${task.taskId}:`, msg);
  }
}

/**
 * 向量存储单条消息（供 messagePipeline 完成后调用）
 */
export async function vectorizeMessage(
  messageId: string,
  content: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await addDocuments(
      'messages',
      [content],
      [`msg_${messageId}`],
      [{ ...metadata, type: 'message', vectorizedAt: new Date().toISOString() }]
    );
    console.log(`[taskLifecycleHooks] Message ${messageId} vectorized`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[taskLifecycleHooks] Failed to vectorize message ${messageId}:`, msg);
  }
}
