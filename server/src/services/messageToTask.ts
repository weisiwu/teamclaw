/**
 * messageToTask.ts — Message → Task wiring
 * 监听 message:routed 事件，自动创建任务
 */

import { eventBus, generateId } from './eventBus.js';
import { taskLifecycle } from './taskLifecycle.js';
import { taskMemory } from './taskMemory.js';
import type { TaskPriority } from '../models/task.js';

/**
 * 从消息内容提取标题（取前50字符或第一行）
 */
function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim();
  return firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
}

/**
 * 将数字优先级映射为 TaskPriority
 */
function mapPriority(priority: number): TaskPriority {
  if (priority >= 20) return 'urgent';
  if (priority >= 15) return 'high';
  if (priority >= 8) return 'normal';
  return 'low';
}

/**
 * 监听 message:routed 事件，自动创建任务
 *
 * 两种触发路径：
 * 1. 无 @agent 提及：skipTaskCreation=false → 创建任务 + 触发 task:created
 * 2. 有 @agent 提及：skipTaskCreation=true → handleAgentMention 已创建任务，
 *    这里跳过重复创建，仅做上下文丰富，仍触发 task:created（确保 taskToAgent 流水线启动）
 */
eventBus.on('message:routed', async payload => {
  const { userId, content, mentionedAgent, priority, traceId, skipTaskCreation, channel } =
    payload.data as {
      userId: string;
      content: string;
      mentionedAgent?: string;
      priority?: number;
      traceId: string;
      skipTaskCreation?: boolean;
      channel: string;
    };

  try {
    let taskId: string;
    let taskTitle: string;

    if (skipTaskCreation) {
      // handleAgentMention 已创建任务，通过 messageId 查找
      // 任务刚创建，store 中已有，直接从 taskLifecycle 获取最新的
      const allTasks = Array.from(taskLifecycle.tasks.values());
      const createdTask = allTasks
        .filter(t => t.createdBy === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (!createdTask) {
        console.warn(
          '[messageToTask] skipTaskCreation=true but no recent task found for user',
          userId
        );
        return;
      }
      taskId = createdTask.taskId;
      taskTitle = createdTask.title;
    } else {
      // 1. 创建任务（无 @agent 时的自动创建路径）
      const task = taskLifecycle.createTask({
        title: extractTitle(content),
        description: content,
        priority: mapPriority((priority as number) || 5),
        sessionId: traceId,
        createdBy: userId as string,
        tags: ['auto-created', `from-${(mentionedAgent as string) || 'unknown'}`, channel],
        dependsOn: [],
        subtaskIds: [],
      });
      taskId = task.taskId;
      taskTitle = task.title;
    }

    // 2. 注入历史上下文
    try {
      const task = taskLifecycle.getTask(taskId);
      if (task) {
        const context = await taskMemory.enrichTaskContext(task);
        if (context) {
          task.description += `\n\n---\n### 相关历史任务\n${context}`;
          task.updatedAt = new Date().toISOString();
        }
      }
    } catch (err) {
      console.warn('[messageToTask] Failed to enrich task context:', err);
    }

    // 3. 发射 task:created 事件（无论哪种路径都触发，确保 taskToAgent 流水线启动）
    eventBus.emit('task:created', {
      eventId: generateId('evt'),
      type: 'task:created',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId, title: taskTitle },
    });
  } catch (err) {
    console.error('[messageToTask] Failed to process message:routed:', err);
  }
});
