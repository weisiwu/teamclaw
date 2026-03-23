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
 */
eventBus.on('message:routed', async payload => {
  const { userId, content, mentionedAgent, priority, traceId } = payload.data as {
    userId: string;
    content: string;
    mentionedAgent?: string;
    priority?: number;
    traceId: string;
  };

  try {
    // 1. 创建任务
    const task = taskLifecycle.createTask({
      title: extractTitle(content),
      description: content,
      priority: mapPriority((priority as number) || 5),
      sessionId: traceId,
      createdBy: userId as string,
      tags: ['auto-created', `from-${(mentionedAgent as string) || 'unknown'}`],
      dependsOn: [],
      subtaskIds: [],
    });

    // 2. 注入历史上下文
    try {
      const context = await taskMemory.enrichTaskContext(task);
      if (context) {
        const existingTask = taskLifecycle.getTask(task.taskId);
        if (existingTask) {
          existingTask.description += `\n\n---\n### 相关历史任务\n${context}`;
          existingTask.updatedAt = new Date().toISOString();
        }
      }
    } catch (err) {
      console.warn('[messageToTask] Failed to enrich task context:', err);
    }

    // 3. 发射 task:created 事件
    eventBus.emit('task:created', {
      eventId: generateId('evt'),
      type: 'task:created',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId: task.taskId, title: task.title },
    });
  } catch (err) {
    console.error('[messageToTask] Failed to create task:', err);
  }
});
