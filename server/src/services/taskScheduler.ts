/**
 * Task Scheduler 服务
 * 任务机制模块 - 定时/延时任务调度器
 * 
 * 支持：
 * - 延时任务（delay）：指定毫秒后执行
 * - 定时任务（cron）：Cron 表达式调度
 * - 周期性任务（interval）：固定间隔重复执行
 */

import { Task } from '../models/task.js';

export type ScheduleType = 'delay' | 'cron' | 'interval';

export interface ScheduledTask {
  scheduleId: string;         // 唯一调度ID
  taskId: string;             // 关联任务ID
  scheduleType: ScheduleType;
  // delay: 毫秒
  delayMs?: number;
  // cron: cron 表达式
  cronExpr?: string;
  // interval: 固定间隔毫秒
  intervalMs?: number;
  // 下次执行时间
  nextRunAt: number;          // Unix timestamp ms
  // 执行次数限制
  maxRuns?: number;           // null = 无限
  runCount: number;           // 已执行次数
  // 状态
  active: boolean;
  createdAt: string;
  // 元数据
  description?: string;
}

type ScheduleHook = (schedule: ScheduledTask) => void | Promise<void>;

class TaskSchedulerService {
  private static instance: TaskSchedulerService;

  private schedules: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private hooks: ScheduleHook[] = [];
  private taskLifecycle: {
    getTask(taskId: string): { taskId: string; status: string; dependsOn?: string[] } | undefined;
    updateTaskStatus(taskId: string, status: string): void;
    getAllTasks(): { taskId: string; status: string; dependsOn?: string[] }[];
  } | null = null;  // 引用 taskLifecycle 服务
  private pollInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): TaskSchedulerService {
    if (!TaskSchedulerService.instance) {
      TaskSchedulerService.instance = new TaskSchedulerService();
    }
    return TaskSchedulerService.instance;
  }

  /**
   * 设置 taskLifecycle 引用（避免循环依赖）
   */
  setTaskLifecycle(lifecycle: TaskSchedulerService['taskLifecycle']): void {
    this.taskLifecycle = lifecycle;
  }

  /**
   * 注册调度钩子
   */
  onSchedule(hook: ScheduleHook): void {
    this.hooks.push(hook);
  }

  /**
   * 调度延时任务
   */
  scheduleDelay(
    taskId: string,
    delayMs: number,
    options?: { maxRuns?: number; description?: string }
  ): ScheduledTask {
    const scheduleId = generateId('sched');
    const now = Date.now();
    const schedule: ScheduledTask = {
      scheduleId,
      taskId,
      scheduleType: 'delay',
      delayMs,
      nextRunAt: now + delayMs,
      maxRuns: options?.maxRuns ?? 1,
      runCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
      description: options?.description,
    };
    this.schedules.set(scheduleId, schedule);
    this.setTimer(schedule);
    return schedule;
  }

  /**
   * 调度周期性任务
   */
  scheduleInterval(
    taskId: string,
    intervalMs: number,
    options?: { maxRuns?: number; description?: string }
  ): ScheduledTask {
    const scheduleId = generateId('sched');
    const now = Date.now();
    const schedule: ScheduledTask = {
      scheduleId,
      taskId,
      scheduleType: 'interval',
      intervalMs,
      nextRunAt: now + intervalMs,
      maxRuns: options?.maxRuns ?? null,
      runCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
      description: options?.description,
    };
    this.schedules.set(scheduleId, schedule);
    this.setTimer(schedule);
    return schedule;
  }

  /**
   * 调度 Cron 任务（简化版：每秒检查）
   */
  scheduleCron(
    taskId: string,
    cronExpr: string,
    options?: { maxRuns?: number; description?: string }
  ): ScheduledTask {
    const scheduleId = generateId('sched');
    const now = Date.now();
    const schedule: ScheduledTask = {
      scheduleId,
      taskId,
      scheduleType: 'cron',
      cronExpr,
      nextRunAt: now + 60000, // 简化：1分钟后首次执行
      maxRuns: options?.maxRuns ?? null,
      runCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
      description: options?.description,
    };
    this.schedules.set(scheduleId, schedule);
    return schedule;
  }

  /**
   * 触发任务执行
   */
  async triggerTask(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || !schedule.active) return;

    const task = this.taskLifecycle?.getTask(schedule.taskId);
    if (!task) return;

    // 检查依赖是否满足
    if (!this.checkDependencies(task)) {
      // 依赖未满足，重新调度（1分钟后重试）
      schedule.nextRunAt = Date.now() + 60000;
      this.setTimer(schedule);
      return;
    }

    // 执行钩子
    for (const hook of this.hooks) {
      await hook(schedule);
    }

    // 将任务状态改为 pending（重新入队）
    if (task.status === 'suspended' || task.status === 'cancelled') {
      this.taskLifecycle?.updateTaskStatus(schedule.taskId, 'pending');
    }

    schedule.runCount++;
    schedule.nextRunAt = this.calculateNextRun(schedule);

    // 检查是否达到执行次数限制
    if (schedule.maxRuns !== null && schedule.runCount >= schedule.maxRuns) {
      this.cancelSchedule(scheduleId);
      return;
    }

    // 重新设置计时器（interval 类型）
    if (schedule.scheduleType === 'interval') {
      this.setTimer(schedule);
    }
  }

  /**
   * 取消调度
   */
  cancelSchedule(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;

    schedule.active = false;
    const timer = this.timers.get(scheduleId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(scheduleId);
    }
    this.schedules.delete(scheduleId);
    return true;
  }

  /**
   * 暂停调度
   */
  pauseSchedule(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;
    schedule.active = false;
    const timer = this.timers.get(scheduleId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(scheduleId);
    }
    return true;
  }

  /**
   * 恢复调度
   */
  resumeSchedule(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || schedule.active) return false;
    schedule.active = true;
    schedule.nextRunAt = Date.now() + (schedule.delayMs ?? schedule.intervalMs ?? 60000);
    this.setTimer(schedule);
    return true;
  }

  /**
   * 获取所有调度
   */
  getAllSchedules(): ScheduledTask[] {
    return Array.from(this.schedules.values());
  }

  /**
   * 获取任务的调度列表
   */
  getSchedulesByTask(taskId: string): ScheduledTask[] {
    return this.getAllSchedules().filter(s => s.taskId === taskId);
  }

  /**
   * 获取单个调度
   */
  getSchedule(scheduleId: string): ScheduledTask | undefined {
    return this.schedules.get(scheduleId);
  }

  // ============ 私有方法 ============

  private setTimer(schedule: ScheduledTask): void {
    const existing = this.timers.get(schedule.scheduleId);
    if (existing) clearTimeout(existing);

    const delay = Math.max(0, schedule.nextRunAt - Date.now());
    const timer = setTimeout(() => {
      this.triggerTask(schedule.scheduleId);
    }, delay);
    this.timers.set(schedule.scheduleId, timer);
  }

  private calculateNextRun(schedule: ScheduledTask): number {
    const now = Date.now();
    switch (schedule.scheduleType) {
      case 'delay':
        return now + (schedule.delayMs ?? 0);
      case 'interval':
        return now + (schedule.intervalMs ?? 0);
      case 'cron':
        // 简化版：每分钟检查一次
        return now + 60000;
      default:
        return now + 60000;
    }
  }

  private checkDependencies(task: Task): boolean {
    if (!task.dependsOn || task.dependsOn.length === 0) return true;
    for (const depId of task.dependsOn) {
      const depTask = this.taskLifecycle?.getTask(depId);
      if (!depTask || (depTask.status !== 'done' && depTask.status !== 'cancelled')) {
        return false;
      }
    }
    return true;
  }

  /**
   * 清理所有计时器
   */
  destroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.schedules.clear();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}

export const taskScheduler = TaskSchedulerService.getInstance();
