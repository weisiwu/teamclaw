/**
 * Task 模块初始化
 * 注册生命周期钩子，建立各服务间联动
 */

import { taskLifecycle } from './taskLifecycle.js';
import { taskFlow } from './taskFlow.js';
import { taskScheduler } from './taskScheduler.js';
import { taskTimeout } from './taskTimeout.js';
import { taskStats } from './taskStats.js';
import { taskCancel } from './taskCancel.js';
import { Task, TaskStatus } from '../models/task.js';

// 建立服务间引用（避免循环依赖）
taskScheduler.setTaskLifecycle(taskLifecycle);
taskTimeout.setTaskLifecycle(taskLifecycle);
taskStats.setTaskLifecycle(taskLifecycle);
taskCancel.setTaskLifecycle(taskLifecycle);
taskCancel.setTaskFlow(taskFlow);
taskCancel.setTaskScheduler(taskScheduler);
taskCancel.setTaskTimeout(taskTimeout);

// 启动超时检查
taskTimeout.startHeartbeatCheck(30 * 1000); // 每 30 秒检查一次

/**
 * 当任务状态变为 done 时，通知 flow 服务更新父任务进度
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
async function onTaskDone(task: Task, _oldStatus: TaskStatus, _newStatus: TaskStatus): Promise<void> {
  if (task.status === 'done') {
    await taskFlow.onSubtaskCompleted(task.taskId);
    taskStats.recordCompletion(task, true);
  }
}

/**
 * 当任务状态变为 failed 时，记录统计
 */
async function onTaskFailed(task: Task, _oldStatus: TaskStatus, _newStatus: TaskStatus): Promise<void> {
  if (task.status === 'failed') {
    taskStats.recordCompletion(task, false);
    // 依赖失败时取消被阻塞的任务
    await taskCancel.cancelBlockedBy(task.taskId, 'system');
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * 任务创建时记录统计
 */
async function onTaskCreated(_task: Task): Promise<void> {
  // 记录创建（统计用）
  void _task;
}

/**
 * 任务开始执行时记录
 */
async function onTaskStarted(task: Task): Promise<void> {
  taskStats.recordStart(task);
  // 自动设置超时
  taskTimeout.setTimeout(task.taskId);
}

// 注册钩子
taskLifecycle.onStatusChange(onTaskDone);
taskLifecycle.onStatusChange(onTaskFailed);
taskLifecycle.onCreate(onTaskCreated);
taskLifecycle.onStart(onTaskStarted);

console.log('[TaskInit] Task services initialized: lifecycle, flow, scheduler, timeout, stats, cancel');
