/**
 * Task Stats 服务
 * 任务机制模块 - 任务统计服务
 *
 * 功能：
 * - 任务计数统计（按状态/优先级/Agent）
 * - 执行时长统计
 * - 成功率/失败率
 * - 趋势分析（按时间窗口）
 */
class TaskStatsService {
    static instance;
    taskLifecycle = null;
    dailyStats = new Map(); // date -> stats
    failureReasons = new Map(); // reason -> count
    constructor() { }
    static getInstance() {
        if (!TaskStatsService.instance) {
            TaskStatsService.instance = new TaskStatsService();
        }
        return TaskStatsService.instance;
    }
    setTaskLifecycle(lifecycle) {
        this.taskLifecycle = lifecycle;
    }
    /**
     * 记录任务完成
     */
    recordCompletion(task, success) {
        const now = new Date();
        const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
        let stats = this.dailyStats.get(dateKey);
        if (!stats) {
            stats = { date: dateKey, completed: 0, failed: 0, pending: 0, running: 0, avgDurationMs: 0, totalDurationMs: 0 };
            this.dailyStats.set(dateKey, stats);
        }
        if (success) {
            stats.completed++;
        }
        else {
            stats.failed++;
            if (task.result) {
                const reason = this.extractReason(task.result);
                this.failureReasons.set(reason, (this.failureReasons.get(reason) ?? 0) + 1);
            }
        }
        // 计算执行时长
        if (task.startedAt && task.completedAt) {
            const duration = new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime();
            stats.totalDurationMs += duration;
            stats.avgDurationMs = Math.round(stats.totalDurationMs / (stats.completed + stats.failed));
        }
    }
    /**
     * 记录任务创建
     */
    recordCreation() {
        const now = new Date();
        const dateKey = now.toISOString().slice(0, 10);
        let dailyStats = this.dailyStats.get(dateKey);
        if (!dailyStats) {
            dailyStats = { date: dateKey, completed: 0, failed: 0, pending: 0, running: 0, avgDurationMs: 0, totalDurationMs: 0 };
            this.dailyStats.set(dateKey, dailyStats);
        }
        dailyStats.pending++;
    }
    /**
     * 记录任务开始执行
     */
    recordStart() {
        const now = new Date();
        const dateKey = now.toISOString().slice(0, 10);
        let dailyStats = this.dailyStats.get(dateKey);
        if (!dailyStats) {
            dailyStats = { date: dateKey, completed: 0, failed: 0, pending: 0, running: 0, avgDurationMs: 0, totalDurationMs: 0 };
            this.dailyStats.set(dateKey, dailyStats);
        }
        dailyStats.pending = Math.max(0, dailyStats.pending - 1);
        dailyStats.running++;
    }
    /**
     * 获取综合统计
     */
    getStats(period = '24h') {
        const tasks = this.taskLifecycle?.getAllTasks() ?? [];
        const now = new Date();
        const cutoff = this.getCutoff(period, now);
        // 过滤时间窗口内的任务
        const filtered = tasks.filter(t => new Date(t.createdAt) >= cutoff);
        const completed = filtered.filter(t => t.status === 'done');
        const failed = filtered.filter(t => t.status === 'failed');
        // 按状态统计
        const byStatus = { pending: 0, running: 0, done: 0, failed: 0, suspended: 0, cancelled: 0 };
        for (const t of filtered)
            byStatus[t.status]++;
        // 按优先级统计
        const byPriority = { urgent: 0, high: 0, normal: 0, low: 0 };
        for (const t of filtered)
            byPriority[t.priority]++;
        // 按 Agent 统计
        const byAgent = {};
        for (const t of filtered) {
            if (t.assignedAgent) {
                byAgent[t.assignedAgent] = (byAgent[t.assignedAgent] ?? 0) + 1;
            }
        }
        // 计算时长
        let totalDuration = 0;
        let durationCount = 0;
        let totalPendingTime = 0;
        let pendingCount = 0;
        let totalRunningTime = 0;
        let runningCount = 0;
        for (const t of filtered) {
            let startMs;
            if (t.startedAt) {
                startMs = new Date(t.startedAt).getTime();
                if (t.completedAt) {
                    const endMs = new Date(t.completedAt).getTime();
                    const duration = endMs - startMs;
                    totalDuration += duration;
                    durationCount++;
                }
                else if (t.status === 'running') {
                    totalRunningTime += now.getTime() - startMs;
                    runningCount++;
                }
            }
            if (t.createdAt && t.startedAt && startMs !== undefined) {
                totalPendingTime += startMs - new Date(t.createdAt).getTime();
                pendingCount++;
            }
        }
        // Top 失败原因
        const topFailureReasons = Array.from(this.failureReasons.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return {
            total: filtered.length,
            byStatus,
            byPriority,
            byAgent,
            completed: completed.length,
            successRate: completed.length + failed.length > 0
                ? Math.round((completed.length / (completed.length + failed.length)) * 100)
                : 0,
            avgDurationMs: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
            totalDurationMs: totalDuration,
            failed: failed.length,
            failureRate: completed.length + failed.length > 0
                ? Math.round((failed.length / (completed.length + failed.length)) * 100)
                : 0,
            topFailureReasons,
            avgPendingTimeMs: pendingCount > 0 ? Math.round(totalPendingTime / pendingCount) : 0,
            avgRunningTimeMs: runningCount > 0 ? Math.round(totalRunningTime / runningCount) : 0,
            timeWindow: {
                start: cutoff.toISOString(),
                end: now.toISOString(),
                period,
            },
        };
    }
    /**
     * 获取任务趋势
     */
    getTrend(period = '24h', intervalMinutes = 60) {
        const now = new Date();
        const cutoff = this.getCutoff(period, now);
        const tasks = this.taskLifecycle?.getAllTasks() ?? [];
        const filtered = tasks.filter(t => new Date(t.createdAt) >= cutoff);
        const points = [];
        const intervalMs = intervalMinutes * 60 * 1000;
        const numPoints = period === '1h' ? 12 : period === '24h' ? 24 : period === '7d' ? 28 : 30;
        for (let i = numPoints - 1; i >= 0; i--) {
            const pointEnd = new Date(now.getTime() - i * intervalMs);
            const pointStart = new Date(pointEnd.getTime() - intervalMs);
            const pointTasks = filtered.filter(t => {
                const created = new Date(t.createdAt);
                return created >= pointStart && created < pointEnd;
            });
            const completed = pointTasks.filter(t => t.status === 'done' && t.completedAt && new Date(t.completedAt) < pointEnd);
            const failed = pointTasks.filter(t => t.status === 'failed');
            const running = pointTasks.filter(t => t.status === 'running');
            const pending = pointTasks.filter(t => t.status === 'pending' || t.status === 'suspended');
            let totalDur = 0, durCount = 0;
            for (const t of completed) {
                if (t.startedAt && t.completedAt) {
                    totalDur += new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime();
                    durCount++;
                }
            }
            points.push({
                timestamp: pointStart.toISOString(),
                completed: completed.length,
                failed: failed.length,
                pending: pending.length,
                running: running.length,
                avgDurationMs: durCount > 0 ? Math.round(totalDur / durCount) : 0,
            });
        }
        return points;
    }
    /**
     * 获取各 Agent 统计
     */
    getAgentStats() {
        const tasks = this.taskLifecycle?.getAllTasks() ?? [];
        const agentMap = new Map();
        for (const t of tasks) {
            if (t.assignedAgent) {
                if (!agentMap.has(t.assignedAgent))
                    agentMap.set(t.assignedAgent, []);
                agentMap.get(t.assignedAgent).push(t);
            }
        }
        const result = [];
        for (const [agentId, agentTasks] of agentMap) {
            const completed = agentTasks.filter(t => t.status === 'done');
            const failed = agentTasks.filter(t => t.status === 'failed');
            const running = agentTasks.filter(t => t.status === 'running');
            let totalDur = 0, durCount = 0;
            for (const t of completed) {
                if (t.startedAt && t.completedAt) {
                    totalDur += new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime();
                    durCount++;
                }
            }
            result.push({
                agentId,
                totalTasks: agentTasks.length,
                completed: completed.length,
                failed: failed.length,
                avgDurationMs: durCount > 0 ? Math.round(totalDur / durCount) : 0,
                successRate: completed.length + failed.length > 0
                    ? Math.round((completed.length / (completed.length + failed.length)) * 100)
                    : 0,
                currentLoad: running.length,
            });
        }
        return result.sort((a, b) => b.currentLoad - a.currentLoad);
    }
    // ============ 私有方法 ============
    getCutoff(period, now) {
        switch (period) {
            case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
            case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case 'all': return new Date(0);
        }
    }
    extractReason(result) {
        // 简化：从结果中提取关键词作为原因
        const lower = result.toLowerCase();
        if (lower.includes('timeout'))
            return 'Timeout';
        if (lower.includes('memory') || lower.includes('oom'))
            return 'Out of Memory';
        if (lower.includes('connection') || lower.includes('network'))
            return 'Network Error';
        if (lower.includes('permission') || lower.includes('unauthorized'))
            return 'Permission Denied';
        if (lower.includes('not found') || lower.includes('404'))
            return 'Not Found';
        if (lower.includes('error'))
            return 'Generic Error';
        return result.slice(0, 50);
    }
    /**
     * 清理旧数据（保留 30 天）
     */
    pruneOldData() {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        for (const dateKey of this.dailyStats.keys()) {
            if (new Date(dateKey) < cutoff) {
                this.dailyStats.delete(dateKey);
            }
        }
        // 保留所有失败原因用于统计
    }
}
export const taskStats = TaskStatsService.getInstance();
