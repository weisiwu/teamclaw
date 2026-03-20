/**
 * Task Cancel 服务
 * 任务机制模块 - 任务取消与资源清理
 *
 * 功能：
 * - 安全的任务取消（检查依赖关系）
 * - 取消时清理相关资源（子任务、调度、锁）
 * - 取消通知
 * - 取消审计日志
 */
// 取消原因分类
export const CANCEL_REASONS = [
    'user_requested', // 用户主动取消
    'dependency_failed', // 依赖任务失败
    'timeout', // 超时取消
    'resource_exhausted', // 资源耗尽
    'priority_preemption', // 被高优先级抢占
    'system_shutdown', // 系统关闭
    'manual_override', // 手动干预
    'unknown', // 未知原因
];
class TaskCancelService {
    static instance;
    taskLifecycle = null;
    taskFlow = null;
    taskScheduler = null;
    taskTimeout = null;
    hooks = [];
    auditLog = [];
    constructor() { }
    static getInstance() {
        if (!TaskCancelService.instance) {
            TaskCancelService.instance = new TaskCancelService();
        }
        return TaskCancelService.instance;
    }
    setTaskLifecycle(lifecycle) { this.taskLifecycle = lifecycle; }
    setTaskFlow(flow) { this.taskFlow = flow; }
    setTaskScheduler(scheduler) { this.taskScheduler = scheduler; }
    setTaskTimeout(timeout) { this.taskTimeout = timeout; }
    /**
     * 注册取消回调
     */
    onCancel(hook) {
        this.hooks.push(hook);
    }
    /**
     * 取消单个任务
     */
    async cancel(taskId, options = {}, cancelledBy = 'system') {
        const start = Date.now();
        const result = {
            success: false,
            cancelledTasks: [],
            skippedTasks: [],
            errors: [],
            durationMs: 0,
        };
        try {
            const task = this.taskLifecycle?.getTask(taskId);
            if (!task) {
                result.errors.push({ taskId, error: 'Task not found' });
                result.durationMs = Date.now() - start;
                return result;
            }
            // 执行取消
            const cancelResult = await this.cancelTask(task, options, cancelledBy);
            result.cancelledTasks.push(...cancelResult.cancelled);
            result.skippedTasks.push(...cancelResult.skipped);
            result.errors.push(...cancelResult.errors);
            result.success = result.cancelledTasks.length > 0 && result.errors.length === 0;
        }
        catch (err) {
            result.errors.push({ taskId, error: String(err) });
        }
        result.durationMs = Date.now() - start;
        return result;
    }
    /**
     * 批量取消任务
     */
    async cancelMany(taskIds, options = {}, cancelledBy = 'system') {
        const start = Date.now();
        const result = {
            success: true,
            cancelledTasks: [],
            skippedTasks: [],
            errors: [],
            durationMs: 0,
        };
        for (const taskId of taskIds) {
            const r = await this.cancel(taskId, options, cancelledBy);
            result.cancelledTasks.push(...r.cancelledTasks);
            result.skippedTasks.push(...r.skippedTasks);
            result.errors.push(...r.errors);
            if (!r.success)
                result.success = false;
        }
        result.durationMs = Date.now() - start;
        return result;
    }
    /**
     * 取消任务及其所有子任务
     */
    async cancelWithSubtasks(taskId, options = {}, cancelledBy = 'system') {
        const start = Date.now();
        const result = {
            success: false,
            cancelledTasks: [],
            skippedTasks: [],
            errors: [],
            durationMs: 0,
        };
        const reason = options.reason ?? 'user_requested';
        // 收集所有后代任务
        const allTaskIds = await this.collectAllSubtasks(taskId);
        allTaskIds.push(taskId); // 包括自身
        // 批量取消
        for (const tid of allTaskIds) {
            const r = await this.cancel(tid, { ...options, cleanup: true }, cancelledBy);
            result.cancelledTasks.push(...r.cancelledTasks);
            result.skippedTasks.push(...r.skippedTasks);
            result.errors.push(...r.errors);
        }
        result.success = result.cancelledTasks.length > 0;
        // 记录审计日志
        this.auditLog.push({
            id: `cancel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            taskId,
            cancelledAt: new Date().toISOString(),
            reason,
            cancelledBy,
            options,
            affectedTasks: result.cancelledTasks,
        });
        result.durationMs = Date.now() - start;
        return result;
    }
    /**
     * 取消被依赖任务阻塞的任务
     */
    async cancelBlockedBy(failedTaskId, cancelledBy = 'system') {
        const start = Date.now();
        const result = {
            success: false,
            cancelledTasks: [],
            skippedTasks: [],
            errors: [],
            durationMs: 0,
        };
        const allTasks = this.taskLifecycle?.getAllTasks() ?? [];
        const blockedTasks = allTasks.filter(t => t.dependsOn?.includes(failedTaskId) && t.status === 'pending');
        for (const task of blockedTasks) {
            const r = await this.cancel(task.taskId, {
                reason: 'dependency_failed',
                notify: true,
                cleanup: true,
            }, cancelledBy);
            result.cancelledTasks.push(...r.cancelledTasks);
            result.skippedTasks.push(...r.skippedTasks);
            result.errors.push(...r.errors);
        }
        result.success = result.cancelledTasks.length > 0;
        result.durationMs = Date.now() - start;
        return result;
    }
    /**
     * 获取取消审计日志
     */
    getAuditLog(limit = 50) {
        return this.auditLog.slice(-limit);
    }
    // ============ 私有方法 ============
    async cancelTask(task, options, _cancelledBy) {
        const cancelled = [];
        const skipped = [];
        const errors = [];
        void _cancelledBy;
        const reason = options.reason ?? 'user_requested';
        // 终态任务无法取消
        if (task.status === 'done' || task.status === 'cancelled') {
            skipped.push(task.taskId);
            return { cancelled, skipped, errors };
        }
        // 检查是否有活跃子任务
        if (!options.force && task.subtaskIds && task.subtaskIds.length > 0) {
            const activeSubtasks = task.subtaskIds
                .map(id => this.taskLifecycle?.getTask(id))
                .filter((t) => t && (t.status === 'running' || t.status === 'pending'));
            if (activeSubtasks.length > 0) {
                skipped.push(task.taskId);
                errors.push({ taskId: task.taskId, error: 'Has active subtasks, use force=true to override' });
                return { cancelled, skipped, errors };
            }
        }
        try {
            // 执行钩子
            for (const hook of this.hooks) {
                try {
                    await hook(task, reason, options);
                }
                catch (err) {
                    console.error(`[TaskCancel] hook error for ${task.taskId}:`, err);
                }
            }
            // 清理相关资源
            if (options.cleanup !== false) {
                await this.cleanupTaskResources(task.taskId);
            }
            // 更新状态
            this.taskLifecycle?.updateTaskStatus(task.taskId, 'cancelled');
            cancelled.push(task.taskId);
        }
        catch (err) {
            errors.push({ taskId: task.taskId, error: String(err) });
        }
        return { cancelled, skipped, errors };
    }
    async cleanupTaskResources(taskId) {
        // 清理调度
        try {
            const schedules = this.taskScheduler?.getSchedulesByTask(taskId) ?? [];
            for (const sched of schedules) {
                this.taskScheduler?.cancelSchedule(sched.scheduleId);
            }
        }
        catch (err) {
            console.error(`[TaskCancel] failed to cancel schedules for ${taskId}:`, err);
        }
        // 清理超时
        try {
            this.taskTimeout?.clearTimeout(taskId);
        }
        catch (err) {
            console.error(`[TaskCancel] failed to clear timeout for ${taskId}:`, err);
        }
        // 解除阻塞任务
        try {
            const allTasks = this.taskLifecycle?.getAllTasks() ?? [];
            const blockingTasks = allTasks.filter(t => t.dependsOn?.includes(taskId));
            for (const bt of blockingTasks) {
                // 被阻塞的任务标记为可重试
                if (bt.status === 'suspended') {
                    this.taskLifecycle?.updateTaskStatus(bt.taskId, 'pending');
                }
            }
        }
        catch (err) {
            console.error(`[TaskCancel] failed to unblock tasks for ${taskId}:`, err);
        }
    }
    async collectAllSubtasks(taskId) {
        const subtasks = [];
        const task = this.taskLifecycle?.getTask(taskId);
        if (!task?.subtaskIds)
            return subtasks;
        for (const subId of task.subtaskIds) {
            subtasks.push(subId);
            const grandSubtasks = await this.collectAllSubtasks(subId);
            subtasks.push(...grandSubtasks);
        }
        return subtasks;
    }
}
export const taskCancel = TaskCancelService.getInstance();
