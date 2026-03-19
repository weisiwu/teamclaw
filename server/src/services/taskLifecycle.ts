/**
 * Task Lifecycle 服务
 * 任务机制模块 - 任务生命周期状态机
 * 
 * 管理任务状态流转：pending → running → done/failed/suspended/cancelled
 * 提供状态变更钩子（onStatusChange）
 */

import { Task, TaskStatus } from '../models/task.js';

// 允许的状态流转规则
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending:    ['running', 'cancelled'],
  running:     ['done', 'failed', 'suspended', 'cancelled'],
  done:        [],             // 终态
  failed:     ['pending'],    // 可重试回到 pending
  suspended:   ['running', 'cancelled'],
  cancelled:   [],            // 终态
};

export type StatusChangeHook = (task: Task, oldStatus: TaskStatus, newStatus: TaskStatus) => void | Promise<void>;

class TaskLifecycleService {
  private static instance: TaskLifecycleService;

  // 状态变更钩子
  private hooks: StatusChangeHook[] = [];

  // 任务存储
  private tasks: Map<string, Task> = new Map();

  private constructor() {}

  static getInstance(): TaskLifecycleService {
    if (!TaskLifecycleService.instance) {
      TaskLifecycleService.instance = new TaskLifecycleService();
    }
    return TaskLifecycleService.instance;
  }

  /**
   * 注册状态变更钩子
   */
  onStatusChange(hook: StatusChangeHook): void {
    this.hooks.push(hook);
  }

  /**
   * 检查是否允许状态流转
   */
  canTransition(from: TaskStatus, to: TaskStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * 执行状态变更（同步）
   */
  async transition(taskId: string, newStatus: TaskStatus): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const oldStatus = task.status;
    if (!this.canTransition(oldStatus, newStatus)) {
      throw new Error(
        `Invalid transition: ${oldStatus} → ${newStatus}. ` +
        `Allowed: ${ALLOWED_TRANSITIONS[oldStatus]?.join(', ') || 'none'}`
      );
    }

    // 更新状态
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();

    // 更新时间戳
    if (newStatus === 'running' && !task.startedAt) {
      task.startedAt = task.updatedAt;
    }
    if (['done', 'failed', 'cancelled'].includes(newStatus)) {
      task.completedAt = task.updatedAt;
    }

    // 执行钩子
    await this.executeHooks(task, oldStatus, newStatus);

    return task;
  }

  /**
   * 创建任务
   */
  createTask(taskData: Omit<Task, 'taskId' | 'createdAt' | 'updatedAt' | 'status' | 'progress' | 'retryCount'>): Task {
    const now = new Date().toISOString();
    const task: Task = {
      ...taskData,
      taskId: this.generateTaskId(),
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      progress: 0,
      retryCount: 0,
    };
    this.tasks.set(task.taskId, task);
    return task;
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 按 session 获取任务
   */
  getTasksBySession(sessionId: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.sessionId === sessionId);
  }

  /**
   * 删除任务
   */
  deleteTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  /**
   * 重试失败任务
   */
  async retryTask(taskId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    if (task.status !== 'failed') {
      throw new Error(`Can only retry failed tasks, current: ${task.status}`);
    }
    task.retryCount += 1;
    return this.transition(taskId, 'pending');
  }

  /**
   * 更新进度
   */
  updateProgress(taskId: string, progress: number): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    task.progress = Math.max(0, Math.min(100, progress));
    task.updatedAt = new Date().toISOString();
    task.lastHeartbeat = task.updatedAt;
    return task;
  }

  /**
   * 获取任务概览
   */
  getOverview(): { total: number; byStatus: Record<TaskStatus, number> } {
    const tasks = this.getAllTasks();
    const byStatus: Record<TaskStatus, number> = {
      pending: 0, running: 0, done: 0, failed: 0, suspended: 0, cancelled: 0,
    };
    for (const t of tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    }
    return { total: tasks.length, byStatus };
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  private async executeHooks(task: Task, oldStatus: TaskStatus, newStatus: TaskStatus): Promise<void> {
    for (const hook of this.hooks) {
      try {
        await hook(task, oldStatus, newStatus);
      } catch (err) {
        console.error(`[TaskLifecycle] Hook error:`, err);
      }
    }
  }
}

export const taskLifecycle = TaskLifecycleService.getInstance();
