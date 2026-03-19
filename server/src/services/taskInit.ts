/**
 * Task 模块初始化
 * 注册生命周期钩子，建立各服务间联动
 */

import { taskLifecycle } from './taskLifecycle.js';
import { taskFlow } from './taskFlow.js';
import { Task, TaskStatus } from '../models/task.js';

/**
 * 当任务状态变为 done 时，通知 flow 服务更新父任务进度
 */
async function onTaskDone(task: Task, _oldStatus: TaskStatus, _newStatus: TaskStatus): Promise<void> {
  if (task.status === 'done') {
    await taskFlow.onSubtaskCompleted(task.taskId);
  }
}

// 注册钩子（仅注册一次）
taskLifecycle.onStatusChange(onTaskDone);

console.log('[TaskInit] Task lifecycle hooks registered');
