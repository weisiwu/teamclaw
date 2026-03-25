/**
 * Task Lifecycle 服务
 * 任务机制模块 - 任务生命周期状态机
 *
 * 管理任务状态流转：pending → running → done/failed/suspended/cancelled
 * 提供状态变更钩子（onStatusChange）
 * 数据持久化：PostgreSQL（通过 taskRepo）+ 内存 Map 缓存
 */

import { generateId } from '../utils/generateId.js';
import { Task, TaskStatus } from '../models/task.js';
import { taskRepo } from '../db/repositories/taskRepo.js';

// 注册生命周期钩子（延迟导入避免循环依赖）
setTimeout(async () => {
  try {
    const { registerTaskLifecycleHooks } = await import('./taskLifecycleHooks.js');
    registerTaskLifecycleHooks(taskLifecycle);
  } catch (err) {
    console.error('[taskLifecycle] Failed to register hooks:', err);
  }
}, 0);

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
export type TaskCreateHook = (task: Task) => void | Promise<void>;
export type TaskStartHook = (task: Task) => void | Promise<void>;

class TaskLifecycleService {
  private static instance: TaskLifecycleService;

  // 状态变更钩子
  private hooks: StatusChangeHook[] = [];
  private createHooks: TaskCreateHook[] = [];
  private startHooks: TaskStartHook[] = [];

  // 任务存储（内存 Map + DB 持久化）
  public tasks: Map<string, Task> = new Map();
  // Alias for backwards compatibility with direct access
  public get taskStore() { return this.tasks; }

  private constructor() {
    this.loadFromDb().catch(err => {
      console.error('[taskLifecycle] Failed to load tasks from DB on startup:', err);
    });
  }

  static getInstance(): TaskLifecycleService {
    if (!TaskLifecycleService.instance) {
      TaskLifecycleService.instance = new TaskLifecycleService();
    }
    return TaskLifecycleService.instance;
  }

  /**
   * 从 DB 加载任务到内存 Map
   */
  private async loadFromDb(): Promise<void> {
    try {
      const rows = await taskRepo.findAll();
      for (const row of rows) {
        const task: Task = {
          taskId: row.task_id,
          title: row.title,
          description: row.description,
          status: row.status as TaskStatus,
          priority: row.priority as Task['priority'],
          assignedAgent: row.assigned_agent ?? undefined,
          assignedSessionKey: undefined,
          parentTaskId: row.parent_task_id ?? undefined,
          subtaskIds: row.subtask_ids ?? [],
          dependsOn: row.depends_on ?? [],
          blockingTasks: row.blocking_tasks ?? [],
          sessionId: row.session_id,
          contextSnapshot: row.context_snapshot ? JSON.stringify(row.context_snapshot) : undefined,
          progress: row.progress ?? 0,
          lastHeartbeat: row.last_heartbeat ? new Date(row.last_heartbeat).toISOString() : undefined,
          createdBy: row.created_by,
          tags: row.tags ?? [],
          result: row.result ?? undefined,
          retryCount: row.retry_count ?? 0,
          maxRetries: row.max_retries ?? 3,
          versionId: row.version_id ?? undefined,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
          startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
          completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
        };
        this.tasks.set(task.taskId, task);
      }
      console.log(`[taskLifecycle] Loaded ${rows.length} tasks from PostgreSQL`);
    } catch (err) {
      console.warn('[taskLifecycle] Could not load tasks from DB, starting fresh:', err);
    }
  }

  /**
   * 同步任务到 DB（异步，不阻塞主流程）
   */
  private syncToDb(task: Task): void {
    taskRepo.upsert({
      taskId: task.taskId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedAgent: task.assignedAgent,
      parentTaskId: task.parentTaskId,
      sessionId: task.sessionId,
      createdBy: task.createdBy,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      contextSnapshot: task.contextSnapshot ? JSON.parse(task.contextSnapshot) : undefined,
      tags: task.tags,
      maxRetries: task.maxRetries,
      retryCount: task.retryCount,
      progress: task.progress,
      lastHeartbeat: task.lastHeartbeat,
      result: task.result,
      versionId: task.versionId,
      subtaskIds: task.subtaskIds,
      dependsOn: task.dependsOn,
      blockingTasks: task.blockingTasks,
    }).catch(err => console.error('[taskLifecycle] Failed to sync task to DB:', err));
  }

  /**
   * 注册状态变更钩子
   */
  onStatusChange(hook: StatusChangeHook): void {
    this.hooks.push(hook);
  }

  onCreate(hook: TaskCreateHook): void {
    this.createHooks.push(hook);
  }

  onStart(hook: TaskStartHook): void {
    this.startHooks.push(hook);
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
      await this.executeStartHooks(task);
    }
    if (['done', 'failed', 'cancelled'].includes(newStatus)) {
      task.completedAt = task.updatedAt;
    }

    // 同步到 DB
    this.syncToDb(task);

    // 执行钩子
    await this.executeHooks(task, oldStatus, newStatus);

    // 触发通知事件（异步，不阻塞）
    const eventType = newStatus === 'running' ? 'task_started'
      : newStatus === 'done' ? 'task_completed'
      : newStatus === 'failed' ? 'task_failed'
      : newStatus === 'cancelled' ? 'task_cancelled'
      : newStatus === 'suspended' ? 'task_suspended'
      : null;
    if (eventType) {
      setTimeout(async () => {
        try {
          const { emitTaskEvent } = await import('./taskNotification.js');
          emitTaskEvent(eventType, taskId, { oldStatus, newStatus, duration: task.startedAt ? Date.now() - new Date(task.startedAt).getTime() : null });
        } catch { /* 非关键路径 */ }
      }, 0);
    }

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

    // 持久化到 DB
    this.syncToDb(task);

    // 执行创建钩子
    this.executeCreateHooks(task);
    // 初始化SLA + 触发事件（异步，通过动态import避免循环依赖）
    setTimeout(async () => {
      try {
        const { initSLAForTask } = await import('./taskSLA.js');
        const { emitTaskEvent } = await import('./taskNotification.js');
        initSLAForTask(task.taskId);
        emitTaskEvent('task_created', task.taskId, { priority: task.priority, assignedAgent: task.assignedAgent });
      } catch { /* 非关键路径，失败不影响主流程 */ }
    }, 0);
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
  async deleteTask(taskId: string): Promise<boolean> {
    this.tasks.delete(taskId);
    // 从 DB 删除
    await taskRepo.delete(taskId).catch(err => console.error('[taskLifecycle] Failed to delete task from DB:', err));
    return true;
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
    await this.transition(taskId, 'pending');
    return this.tasks.get(taskId) ?? null;
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
    this.syncToDb(task);
    return task;
  }

  updateTaskStatus(taskId: string, status: TaskStatus): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    this.transition(taskId, status);
    return this.tasks.get(taskId) ?? null;
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
    return generateId('task');
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

  private async executeCreateHooks(task: Task): Promise<void> {
    for (const hook of this.createHooks) {
      try {
        await hook(task);
      } catch (err) {
        console.error(`[TaskLifecycle] Create hook error:`, err);
      }
    }
  }

  private async executeStartHooks(task: Task): Promise<void> {
    for (const hook of this.startHooks) {
      try {
        await hook(task);
      } catch (err) {
        console.error(`[TaskLifecycle] Start hook error:`, err);
      }
    }
  }
}

export const taskLifecycle = TaskLifecycleService.getInstance();
export const taskStore = taskLifecycle.tasks; // Direct Map reference for services
