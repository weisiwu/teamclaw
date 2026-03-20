/**
 * Message Statistics Service
 * 消息机制模块 - 消息统计与监控
 *
 * 提供消息处理的实时统计，支持：
 * - 总量统计（入队/完成/失败/合并/抢占）
 * - 按角色统计
 * - 按渠道统计
 * - 实时队列深度
 * - 时间窗口统计（1h/24h/7d）
 */
class MessageStatsService {
    static instance;
    // 计数器
    counters = {
        totalEnqueued: 0,
        totalCompleted: 0,
        totalFailed: 0,
        totalMerged: 0,
        totalPreempted: 0,
        totalDLQ: 0,
    };
    // 按角色统计
    byRole = {
        admin: { enqueued: 0, completed: 0, failed: 0 },
        vice_admin: { enqueued: 0, completed: 0, failed: 0 },
        employee: { enqueued: 0, completed: 0, failed: 0 },
    };
    // 按渠道统计
    byChannel = {
        feishu: 0,
        wechat: 0,
        slack: 0,
        web: 0,
    };
    // 时间序列（用于滑动窗口统计）
    recentMessages = [];
    MAX_RECENT = 10000;
    // 累计的 top 用户（滚动窗口）
    topUsersMap = new Map();
    static getInstance() {
        if (!MessageStatsService.instance) {
            MessageStatsService.instance = new MessageStatsService();
        }
        return MessageStatsService.instance;
    }
    /**
     * 记录消息入队
     */
    onEnqueued(msg) {
        this.counters.totalEnqueued++;
        if (msg.role in this.byRole) {
            this.byRole[msg.role].enqueued++;
        }
        if (msg.channel in this.byChannel) {
            this.byChannel[msg.channel]++;
        }
        // 更新 top users
        const existing = this.topUsersMap.get(msg.userId);
        if (existing) {
            existing.count++;
        }
        else {
            this.topUsersMap.set(msg.userId, { userName: msg.userName, count: 1 });
        }
        // 添加到最近消息
        this.addRecent(msg, 'enqueued');
    }
    /**
     * 记录消息完成
     */
    onCompleted(msg) {
        this.counters.totalCompleted++;
        if (msg.role in this.byRole) {
            this.byRole[msg.role].completed++;
        }
        this.addRecent(msg, 'completed');
    }
    /**
     * 记录消息失败
     */
    onFailed(msg) {
        this.counters.totalFailed++;
        if (msg.role in this.byRole) {
            this.byRole[msg.role].failed++;
        }
        this.addRecent(msg, 'failed');
    }
    /**
     * 记录消息合并
     */
    onMerged() {
        this.counters.totalMerged++;
    }
    /**
     * 记录抢占事件
     */
    onPreempted() {
        this.counters.totalPreempted++;
    }
    /**
     * 记录消息进入 DLQ
     */
    onDLQ() {
        this.counters.totalDLQ++;
    }
    /**
     * 添加到最近消息序列
     */
    addRecent(msg, event) {
        this.recentMessages.push({ msg, event });
        if (this.recentMessages.length > this.MAX_RECENT) {
            this.recentMessages.shift();
        }
    }
    /**
     * 计算时间窗口统计
     */
    calcTimeWindow(windowMs) {
        const cutoff = Date.now() - windowMs;
        const recent = this.recentMessages.filter(r => new Date(r.msg.timestamp).getTime() >= cutoff);
        const enqueued = recent.filter(r => r.event === 'enqueued').length;
        const completed = recent.filter(r => r.event === 'completed').length;
        const failed = recent.filter(r => r.event === 'failed').length;
        const preemptCount = recent.filter(r => r.event === 'enqueued' && r.msg.preemptedBy).length;
        const priorities = recent
            .filter(r => r.event === 'enqueued')
            .map(r => r.msg.priority);
        const avgPriority = priorities.length > 0
            ? priorities.reduce((a, b) => a + b, 0) / priorities.length
            : 0;
        return { enqueued, completed, failed, avgPriority: Math.round(avgPriority * 100) / 100, preemptCount };
    }
    /**
     * 获取 top N 用户
     */
    getTopUsers(n = 10) {
        return Array.from(this.topUsersMap.entries())
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, n);
    }
    /**
     * 获取完整统计
     */
    getStats(queueDepth, currentProcessing) {
        return {
            counters: { ...this.counters },
            byRole: {
                admin: { ...this.byRole.admin },
                vice_admin: { ...this.byRole.vice_admin },
                employee: { ...this.byRole.employee },
            },
            byChannel: { ...this.byChannel },
            queueDepth,
            currentProcessing,
            timeWindows: {
                '1h': this.calcTimeWindow(60 * 60 * 1000),
                '24h': this.calcTimeWindow(24 * 60 * 60 * 1000),
                '7d': this.calcTimeWindow(7 * 24 * 60 * 60 * 1000),
            },
            topUsers: this.getTopUsers(10),
            updatedAt: new Date().toISOString(),
        };
    }
    /**
     * 重置统计（用于测试）
     */
    reset() {
        this.counters = { totalEnqueued: 0, totalCompleted: 0, totalFailed: 0, totalMerged: 0, totalPreempted: 0, totalDLQ: 0 };
        this.byRole = { admin: { enqueued: 0, completed: 0, failed: 0 }, vice_admin: { enqueued: 0, completed: 0, failed: 0 }, employee: { enqueued: 0, completed: 0, failed: 0 } };
        this.byChannel = { feishu: 0, wechat: 0, slack: 0, web: 0 };
        this.recentMessages = [];
        this.topUsersMap.clear();
    }
}
export const messageStatsService = MessageStatsService.getInstance();
export { MessageStatsService };
