/**
 * Task Timeout 服务
 * 任务机制模块 - 任务超时管理
 *
 * 功能：
 * - 为运行中任务设置超时
 * - 超时后自动暂停（suspended）任务
 * - 支持自定义超时策略（按优先级/按任务类型）
 * - 超时回调通知
 */
// 默认超时配置（毫秒）
const DEFAULT_TIMEOUT = {
    urgent: 5 * 60 * 1000, // 5 分钟
    high: 15 * 60 * 1000, // 15 分钟
    normal: 30 * 60 * 1000, // 30 分钟
    low: 60 * 60 * 1000, // 60 分钟
};
class TaskTimeoutService {
    static instance;
    timeouts = new Map(); // taskId -> record
    timers = new Map(); // taskId -> timer
    hooks = [];
    taskLifecycle = null;
    heartbeatInterval = null;
    // 心跳超时阈值（毫秒）：超过此时间没收到心跳则触发
    heartbeatTimeoutMs = 5 * 60 * 1000; // 默认 5 分钟
    constructor() { }
    static getInstance() {
        if (!TaskTimeoutService.instance) {
            TaskTimeoutService.instance = new TaskTimeoutService();
        }
        return TaskTimeoutService.instance;
    }
    setTaskLifecycle(lifecycle) {
        this.taskLifecycle = lifecycle;
    }
    /**
     * 注册超时回调
     */
    onTimeout(hook) {
        this.hooks.push(hook);
    }
    /**
     * 设置任务超时
     */
    setTimeout(taskId, timeoutMs, priority) {
        const task = this.taskLifecycle?.getTask(taskId);
        if (!task)
            throw new Error(`Task ${taskId} not found`);
        // 取消已有的超时
        this.clearTimeout(taskId);
        const actualMs = timeoutMs ?? DEFAULT_TIMEOUT[priority ?? task.priority ?? 'normal'];
        const record = {
            taskId,
            timeoutAt: Date.now() + actualMs,
            timeoutMs: actualMs,
            priority: task.priority ?? 'normal',
            triggered: false,
            createdAt: new Date().toISOString(),
        };
        this.timeouts.set(taskId, record);
        // 设置定时器
        const timer = setTimeout(() => {
            this.handleTimeout(taskId, 'max_duration');
        }, actualMs);
        this.timers.set(taskId, timer);
        return record;
    }
    /**
     * 更新心跳时间（防止 heartbeat_missed 超时）
     */
    heartbeat(taskId) {
        const record = this.timeouts.get(taskId);
        if (!record) {
            // 首次心跳，设置超时
            this.setTimeout(taskId);
        }
        else {
            // 更新超时时间
            const remaining = record.timeoutAt - Date.now();
            if (remaining <= 0) {
                // 已经超时，触发处理
                this.handleTimeout(taskId, 'heartbeat_missed');
            }
            // 否则继续等待
        }
    }
    /**
     * 清除任务超时
     */
    clearTimeout(taskId) {
        const timer = this.timers.get(taskId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(taskId);
        }
        return this.timeouts.delete(taskId);
    }
    /**
     * 获取任务超时记录
     */
    getTimeoutRecord(taskId) {
        return this.timeouts.get(taskId);
    }
    /**
     * 获取所有活跃超时记录
     */
    getAllTimeouts() {
        return Array.from(this.timeouts.values()).filter(r => !r.triggered);
    }
    /**
     * 获取即将超时（< 1 分钟）的任务
     */
    getImminentTimeouts() {
        const now = Date.now();
        const threshold = 60 * 1000; // 1 分钟
        return this.getAllTimeouts().filter(r => r.timeoutAt - now < threshold);
    }
    /**
     * 检查任务是否已超时
     */
    isTimedOut(taskId) {
        const record = this.timeouts.get(taskId);
        if (!record)
            return false;
        return Date.now() >= record.timeoutAt;
    }
    /**
     * 手动触发超时
     */
    async triggerTimeout(taskId, reason = 'manual') {
        await this.handleTimeout(taskId, reason);
    }
    // ============ 私有方法 ============
    async handleTimeout(taskId, reason) {
        const record = this.timeouts.get(taskId);
        if (!record || record.triggered)
            return;
        const task = this.taskLifecycle?.getTask(taskId);
        if (!task || task.status !== 'running') {
            this.clearTimeout(taskId);
            return;
        }
        // 标记为已触发
        record.triggered = true;
        // 执行超时回调
        for (const hook of this.hooks) {
            try {
                await hook(task, reason);
            }
            catch (err) {
                console.error(`[TaskTimeout] hook error for ${taskId}:`, err);
            }
        }
        // 将任务挂起
        try {
            this.taskLifecycle?.updateTaskStatus(taskId, 'suspended');
        }
        catch (err) {
            console.error(`[TaskTimeout] failed to suspend task ${taskId}:`, err);
        }
        // 清理
        this.clearTimeout(taskId);
    }
    /**
     * 启动心跳检查（定期扫描超时任务）
     */
    startHeartbeatCheck(intervalMs = 30 * 1000) {
        if (this.heartbeatInterval)
            return;
        this.heartbeatInterval = setInterval(() => {
            this.checkHeartbeats();
        }, intervalMs);
    }
    checkHeartbeats() {
        const now = Date.now();
        for (const [taskId, record] of this.timeouts) {
            if (record.triggered)
                continue;
            const task = this.taskLifecycle?.getTask(taskId);
            if (!task || task.status !== 'running')
                continue;
            // 检查心跳
            if (task.lastHeartbeat) {
                const lastBeat = new Date(task.lastHeartbeat).getTime();
                if (now - lastBeat > this.heartbeatTimeoutMs) {
                    this.handleTimeout(taskId, 'heartbeat_missed');
                }
            }
        }
    }
    destroy() {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.timeouts.clear();
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }
}
export const taskTimeout = TaskTimeoutService.getInstance();
export { TaskTimeoutService };
