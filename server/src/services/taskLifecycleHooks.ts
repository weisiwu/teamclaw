/**
 * Task Lifecycle Hooks
 * 任务机制模块 - 任务生命周期钩子
 * 
 * 在任务状态变更时自动触发：
 * 1. 任务完成 → autoBump 版本升级
 * 2. 任务完成 → 群聊通知
 * 3. 任务完成 → taskMemory 摘要写入向量库
 * 4. 消息完成 → 向量库存储
 */

import { Task, TaskStatus } from '../models/task.js';
import { executeAutoBump } from './autoBump.js';
import { sendReply } from './messageReply.js';
import { taskMemory } from './taskMemory.js';
import { addDocuments } from './vectorStore.js';

/**
 * 注册任务生命周期钩子
 * 在 taskLifecycle 初始化时调用一次
 */
export function registerTaskLifecycleHooks(taskLifecycle: {
  onStatusChange: (hook: (task: Task, oldStatus: TaskStatus, newStatus: TaskStatus) => void | Promise<void>) => void;
}): void {
  // 任务完成 → 自动版本升级
  taskLifecycle.onStatusChange(onTaskDoneAutoBump);

  // 任务完成/失败/取消 → 群聊通知
  taskLifecycle.onStatusChange(onTaskDoneNotify);

  // 任务被暂停 → 通知
  taskLifecycle.onStatusChange(onTaskSuspendedNotify);

  // 任务完成 → taskMemory 摘要写入向量库
  taskLifecycle.onStatusChange(onTaskDoneVectorize);

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

    // 获取当前版本设置（从全局配置中获取）
    const versionId = task.versionId || 'default';

    // 触发自动版本升级
    await executeAutoBump({
      versionId,
      currentVersion: '0.0.0', // 实际从 versionBump 获取
      triggerType: 'task_done',
      taskId: task.taskId,
      taskTitle: task.title,
      taskType: task.tags?.[0],
    });
  } catch (err) {
    // 非关键路径，失败不阻塞主流程
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
    // 向任务的创建者发送通知（通过 channel）
    // 实际生产中需要从 task.contextSnapshot 获取 channel 信息
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

  const content = `⏸️ 任务已被暂停：${task.title}`;

  try {
    console.log(`[taskLifecycleHooks] Task suspended: ${task.taskId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[taskLifecycleHooks] Suspend notification failed:`, msg);
  }
}

/**
 * 任务完成 → taskMemory 摘要写入向量库
 */
async function onTaskDoneVectorize(
  task: Task,
  oldStatus: TaskStatus,
  newStatus: TaskStatus
): Promise<void> {
  if (newStatus !== 'done') return;

  try {
    // 获取任务记忆摘要
    const summary = taskMemory.getTaskMemorySummary(task.taskId);
    if (!summary) {
      console.log(`[taskLifecycleHooks] No task memory found for ${task.taskId}, skipping vectorize`);
      return;
    }

    // 构建要存储的文本
    const sessionId = task.sessionId || task.taskId;
    const ctx = taskMemory.getContext(task.taskId, sessionId);
    const memoryText = [
      `任务：${task.title}`,
      `描述：${task.description || '无'}`,
      `状态：${newStatus}`,
      `执行者：${task.assignedAgent || '未知'}`,
      summary.summary ? `摘要：${summary.summary}` : '',
      `记忆消息数：${summary.messages}`,
      `检查点数：${summary.checkpoints}`,
      ctx ? `最新进度：${ctx.checkpoints.length > 0 ? ctx.checkpoints[ctx.checkpoints.length - 1].summary : '无'}` : '',
    ].filter(Boolean).join('\n');

    // 写入向量库
    await addDocuments(
      'task_memory',
      [memoryText],
      [`task_${task.taskId}`],
      [{
        taskId: task.taskId,
        title: task.title,
        status: newStatus,
        assignedAgent: task.assignedAgent || '',
        createdBy: task.createdBy || '',
        completedAt: task.completedAt || new Date().toISOString(),
        type: 'task_memory',
      }]
    );

    console.log(`[taskLifecycleHooks] Task memory vectorized for ${task.taskId}`);
  } catch (err) {
    // 非关键路径，失败不阻塞主流程
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[taskLifecycleHooks] Failed to vectorize task memory for ${task.taskId}:`, msg);
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
