/**
 * Message Channel Aggregator Service
 * 多渠道消息聚合服务
 *
 * 功能：
 * - 统一不同渠道（飞书/微信/Web）的消息格式
 * - 跨渠道消息关联（同一用户的跨渠道会话）
 * - 统一收件箱视图
 */
class MessageChannelAggregatorService {
    static instance;
    // 全局消息映射: globalId -> UnifiedMessage
    globalMessages = new Map();
    // 用户会话: userGlobalId -> ChannelSession
    userSessions = new Map();
    // 全局消息列表（按时间降序）
    unifiedTimeline = []; // globalId 数组
    MAX_TIMELINE = 500;
    // 跨渠道关联规则（可通过配置扩展）
    crossChannelRules = [];
    static getInstance() {
        if (!MessageChannelAggregatorService.instance) {
            MessageChannelAggregatorService.instance = new MessageChannelAggregatorService();
        }
        return MessageChannelAggregatorService.instance;
    }
    constructor() {
        // 默认跨渠道关联规则：同一用户ID跨渠道 + 内容相似度
        this.crossChannelRules.push({
            match: (msg) => !!msg.userGlobalId,
            link: (existing, newMsg) => existing.userGlobalId === newMsg.userGlobalId &&
                existing.sender.role === newMsg.sender?.role,
        });
    }
    /**
     * 接收并统一化消息（来自各渠道适配器的原始消息）
     */
    aggregate(rawMessage) {
        const globalId = this.generateGlobalId(rawMessage.channel, rawMessage.channelMessageId);
        const userGlobalId = this.resolveUserGlobalId(rawMessage.userId, rawMessage.role);
        // 检查是否已有跨渠道消息可合并
        const existingSession = this.userSessions.get(userGlobalId);
        if (existingSession) {
            // 检查是否有同渠道的近期消息（5分钟内）可合并
            for (const ch of rawMessage.channel) {
                const latest = existingSession.latestByChannel[ch];
                if (latest) {
                    const age = Date.now() - new Date(latest.timestamp).getTime();
                    if (age < 5 * 60 * 1000 && latest.content === rawMessage.content) {
                        // 5分钟内同内容，追加到现有消息
                        if (!latest.sourceIds[rawMessage.channel]) {
                            latest.sourceIds[rawMessage.channel] = rawMessage.channelMessageId;
                            latest.channels = [...new Set([...latest.channels, rawMessage.channel])];
                        }
                        return latest;
                    }
                }
            }
        }
        // 创建新的统一消息
        const unified = {
            globalId,
            userGlobalId,
            sourceIds: { [rawMessage.channel]: rawMessage.channelMessageId },
            content: rawMessage.content,
            sender: {
                userId: rawMessage.userId,
                userName: rawMessage.userName,
                role: rawMessage.role,
            },
            timestamp: rawMessage.timestamp || new Date().toISOString(),
            channels: [rawMessage.channel],
            type: rawMessage.type || 'text',
            unread: true,
            priority: rawMessage.priority || 1,
        };
        this.globalMessages.set(globalId, unified);
        this.unifiedTimeline.unshift(globalId);
        if (this.unifiedTimeline.length > this.MAX_TIMELINE) {
            const removed = this.unifiedTimeline.pop();
            if (removed)
                this.globalMessages.delete(removed);
        }
        // 更新用户会话
        this.updateUserSession(unified);
        return unified;
    }
    /**
     * 更新用户会话
     */
    updateUserSession(msg) {
        if (!this.userSessions.has(msg.userGlobalId)) {
            this.userSessions.set(msg.userGlobalId, {
                userGlobalId: msg.userGlobalId,
                latestByChannel: {},
                lastActivity: msg.timestamp,
                totalUnread: 0,
            });
        }
        const session = this.userSessions.get(msg.userGlobalId);
        session.latestByChannel[msg.channels[0]] = msg;
        session.lastActivity = msg.timestamp;
        if (msg.unread)
            session.totalUnread++;
    }
    /**
     * 获取统一收件箱视图
     */
    getUnifiedInbox(params) {
        const { page = 1, pageSize = 20, channel, role, unreadOnly } = params || {};
        let filtered = Array.from(this.globalMessages.values());
        if (channel) {
            filtered = filtered.filter(m => m.channels.includes(channel));
        }
        if (role) {
            filtered = filtered.filter(m => m.sender.role === role);
        }
        if (unreadOnly) {
            filtered = filtered.filter(m => m.unread);
        }
        // 按时间降序
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const total = filtered.length;
        const unreadTotal = filtered.filter(m => m.unread).length;
        const start = (page - 1) * pageSize;
        const list = filtered.slice(start, start + pageSize);
        return { list, total, page, pageSize, unreadTotal };
    }
    /**
     * 获取跨渠道用户会话列表
     */
    getUserSessions(params) {
        const { page = 1, pageSize = 20, hasUnread } = params || {};
        let sessions = Array.from(this.userSessions.values());
        if (hasUnread !== undefined) {
            sessions = sessions.filter(s => hasUnread ? s.totalUnread > 0 : s.totalUnread === 0);
        }
        // 按最近活跃排序
        sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
        const total = sessions.length;
        const start = (page - 1) * pageSize;
        const list = sessions.slice(start, start + pageSize);
        return { list, total };
    }
    /**
     * 获取跨渠道会话详情
     */
    getSessionMessages(userGlobalId) {
        const session = this.userSessions.get(userGlobalId);
        if (!session)
            return [];
        // 收集该用户所有跨渠道消息
        const messages = [];
        for (const msg of this.globalMessages.values()) {
            if (msg.userGlobalId === userGlobalId) {
                messages.push(msg);
            }
        }
        // 按时间排序
        return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    /**
     * 标记消息为已读
     */
    markRead(globalId) {
        const msg = this.globalMessages.get(globalId);
        if (!msg || !msg.unread)
            return false;
        msg.unread = false;
        const session = this.userSessions.get(msg.userGlobalId);
        if (session && session.totalUnread > 0) {
            session.totalUnread--;
        }
        return true;
    }
    /**
     * 标记用户所有消息为已读
     */
    markAllRead(userGlobalId) {
        let count = 0;
        for (const msg of this.globalMessages.values()) {
            if (msg.userGlobalId === userGlobalId && msg.unread) {
                msg.unread = false;
                count++;
            }
        }
        const session = this.userSessions.get(userGlobalId);
        if (session)
            session.totalUnread = 0;
        return count;
    }
    /**
     * 获取跨渠道统计
     */
    getCrossChannelStats() {
        const messages = Array.from(this.globalMessages.values());
        const byChannel = { feishu: 0, wechat: 0, web: 0 };
        const byRole = { boss: 0, pm: 0, architect: 0, coder: 0, employee: 0, system: 0 };
        let totalUnread = 0;
        for (const msg of messages) {
            for (const ch of msg.channels) {
                byChannel[ch] = (byChannel[ch] || 0) + 1;
            }
            byRole[msg.sender.role] = (byRole[msg.sender.role] || 0) + 1;
            if (msg.unread)
                totalUnread++;
        }
        return {
            totalMessages: messages.length,
            totalSessions: this.userSessions.size,
            totalUnread,
            byChannel: byChannel,
            byRole: byRole,
        };
    }
    generateGlobalId(channel, channelMessageId) {
        return `ugl_${channel}_${channelMessageId}`;
    }
    resolveUserGlobalId(userId, role) {
        // 跨渠道用户ID统一映射（可扩展为真实用户系统）
        return `user_${role}_${userId}`;
    }
}
export const messageChannelAggregatorService = MessageChannelAggregatorService.getInstance();
