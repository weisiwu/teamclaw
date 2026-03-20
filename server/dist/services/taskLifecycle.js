/**
 * Task Lifecycle 服务
 * 任务机制模块 - 任务生命周期状态机
 *
 * 管理任务状态流转：pending → running → done/failed/suspended/cancelled
 * 提供状态变更钩子（onStatusChange）
 */
// 允许的状态流转规则
const ALLOWED_TRANSITIONS = {
    pending: ['running', 'cancelled'],
    running: ['done', 'failed', 'suspended', 'cancelled'],
    done: [], // 终态
    failed: ['pending'], // 可重试回到 pending
    suspended: ['running', 'cancelled'],
    cancelled: [], // 终态
};
class TaskLifecycleService {
    static instance;
    // 状态变更钩子
    hooks = [];
    createHooks = [];
    startHooks = [];
    // 任务存储
    tasks = new Map();
    // Alias for backwards compatibility with direct access
    get taskStore() { return this.tasks; }
    constructor() { }
    static getInstance() {
        if (!TaskLifecycleService.instance) {
            TaskLifecycleService.instance = new TaskLifecycleService();
        }
        return TaskLifecycleService.instance;
    }
    /**
     * 注册状态变更钩子
     */
    onStatusChange(hook) {
        this.hooks.push(hook);
    }
    onCreate(hook) {
        this.createHooks.push(hook);
    }
    onStart(hook) {
        this.startHooks.push(hook);
    }
    /**
     * 检查是否允许状态流转
     */
    canTransition(from, to) {
        return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
    }
    /**
     * 执行状态变更（同步）
     */
    async transition(taskId, newStatus) {
        const task = this.tasks.get(taskId);
        if (!task)
            return null;
        const oldStatus = task.status;
        if (!this.canTransition(oldStatus, newStatus)) {
            throw new Error(`Invalid transition: ${oldStatus} → ${newStatus}. ` +
                `Allowed: ${ALLOWED_TRANSITIONS[oldStatus]?.join(', ') || 'none'}`);
        }
        // 更新状态
        task.status = newStatus;
        task.updatedAt = new Date().toISOString();
        // 更新时间戳
        if (newStatus === 'running' && !task.startedAt) {
            task.startedAt = task.updatedAt;
            // 执行开始钩子
            await this.executeStartHooks(task);
        }
        if (['done', 'failed', 'cancelled'].includes(newStatus)) {
            task.completedAt = task.updatedAt;
        }
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
                }
                catch { /* 非关键路径 */ }
            }, 0);
        }
        return task;
    }
    /**
     * 创建任务
     */
    createTask(taskData) {
        const now = new Date().toISOString();
        const task = {
            ...taskData,
            taskId: this.generateTaskId(),
            createdAt: now,
            updatedAt: now,
            status: 'pending',
            progress: 0,
            retryCount: 0,
        };
        this.tasks.set(task.taskId, task);
        // 执行创建钩子
        this.executeCreateHooks(task);
        // 初始化SLA + 触发事件（异步，通过动态import避免循环依赖）
        setTimeout(async () => {
            try {
                const { initSLAForTask } = await import('./taskSLA.js');
                const { emitTaskEvent } = await import('./taskNotification.js');
                initSLAForTask(task.taskId);
                emitTaskEvent('task_created', task.taskId, { priority: task.priority, assignedAgent: task.assignedAgent });
            }
            catch { /* 非关键路径，失败不影响主流程 */ }
        }, 0);
        return task;
    }
    /**
     * 获取任务
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    /**
     * 获取所有任务
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    /**
     * 按 session 获取任务
     */
    getTasksBySession(sessionId) {
        return Array.from(this.tasks.values()).filter(t => t.sessionId === sessionId);
    }
    /**
     * 删除任务
     */
    deleteTask(taskId) {
        return this.tasks.delete(taskId);
    }
    /**
     * 重试失败任务
     */
    async retryTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return null;
        if (task.status !== 'failed') {
            throw new Error(`Can only retry failed tasks, current: ${task.status}`);
        }
        task.retryCount += 1;
        return this.transition(taskId, 'pending');
    }
    /**
     * 更新进度
     */
    updateProgress(taskId, progress) {
        const task = this.tasks.get(taskId);
        if (!task)
            return null;
        task.progress = Math.max(0, Math.min(100, progress));
        task.updatedAt = new Date().toISOString();
        task.lastHeartbeat = task.updatedAt;
        return task;
    }
    updateTaskStatus(taskId, status) {
        const task = this.tasks.get(taskId);
        if (!task)
            return null;
        this.transition(taskId, status);
        return this.tasks.get(taskId) ?? null;
    }
    /**
     * 获取任务概览
     */
    getOverview() {
        const tasks = this.getAllTasks();
        const byStatus = {
            pending: 0, running: 0, done: 0, failed: 0, suspended: 0, cancelled: 0,
        };
        for (const t of tasks) {
            byStatus[t.status] = (byStatus[t.status] || 0) + 1;
        }
        return { total: tasks.length, byStatus };
    }
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    async executeHooks(task, oldStatus, newStatus) {
        for (const hook of this.hooks) {
            try {
                await hook(task, oldStatus, newStatus);
            }
            catch (err) {
                console.error(`[TaskLifecycle] Hook error:`, err);
            }
        }
    }
    async executeCreateHooks(task) {
        for (const hook of this.createHooks) {
            try {
                await hook(task);
            }
            catch (err) {
                console.error(`[TaskLifecycle] Create hook error:`, err);
            }
        }
    }
    async executeStartHooks(task) {
        for (const hook of this.startHooks) {
            try {
                await hook(task);
            }
            catch (err) {
                console.error(`[TaskLifecycle] Start hook error:`, err);
            }
        }
    }
}
export const taskLifecycle = TaskLifecycleService.getInstance();
export const taskStore = taskLifecycle.tasks; // Direct Map reference for services
