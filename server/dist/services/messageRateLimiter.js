/**
 * Message Rate Limiter Service
 * 消息流控 - 速率限制服务
 *
 * 支持：
 * - 按用户/角色/渠道的滑动窗口限流
 * - 全局限流（防止系统过载）
 * - 自适应限流（根据队列积压情况动态调整）
 */
class MessageRateLimiterService {
    static instance;
    // 全局限流滑动窗口
    globalWindow = [];
    // 按用户的限流记录: userId -> SlidingWindowEntry[]
    userWindows = new Map();
    // 按角色的限流记录: role -> SlidingWindowEntry[]
    roleWindows = new Map();
    // 按渠道的限流记录: channel -> SlidingWindowEntry[]
    channelWindows = new Map();
    // 全局限流配置（默认：每秒100条）
    globalLimit = {
        maxMessages: 100,
        windowMs: 1000,
        type: 'global',
    };
    // 各维度限流配置
    limitConfigs = new Map([
        ['user:default', { maxMessages: 10, windowMs: 1000, type: 'user' }],
        ['role:boss', { maxMessages: 50, windowMs: 1000, type: 'role' }],
        ['role:pm', { maxMessages: 30, windowMs: 1000, type: 'role' }],
        ['role:architect', { maxMessages: 30, windowMs: 1000, type: 'role' }],
        ['role:coder', { maxMessages: 20, windowMs: 1000, type: 'role' }],
        ['role:employee', { maxMessages: 10, windowMs: 1000, type: 'role' }],
        ['channel:feishu', { maxMessages: 60, windowMs: 1000, type: 'channel' }],
        ['channel:web', { maxMessages: 40, windowMs: 1000, type: 'channel' }],
        ['channel:wechat', { maxMessages: 40, windowMs: 1000, type: 'channel' }],
    ]);
    static getInstance() {
        if (!MessageRateLimiterService.instance) {
            MessageRateLimiterService.instance = new MessageRateLimiterService();
        }
        return MessageRateLimiterService.instance;
    }
    /**
     * 检查是否允许消息通过限流
     */
    check(userId, role, channel, queueSize) {
        const now = Date.now();
        // 1. 检查全局限流
        const globalResult = this.checkSlidingWindow(this.globalWindow, now, this.globalLimit.maxMessages, this.globalLimit.windowMs);
        if (!globalResult.allowed)
            return globalResult;
        // 2. 检查用户限流
        const userKey = `user:${userId}`;
        const userConfig = this.limitConfigs.get(userKey) || this.limitConfigs.get('user:default');
        const userResult = this.checkSlidingWindow(this.getOrCreateWindow(this.userWindows, userId), now, userConfig.maxMessages, userConfig.windowMs);
        if (!userResult.allowed)
            return userResult;
        // 3. 检查角色限流
        const roleKey = `role:${role}`;
        const roleConfig = this.limitConfigs.get(roleKey) || this.limitConfigs.get('user:default');
        const roleResult = this.checkSlidingWindow(this.getOrCreateWindow(this.roleWindows, role), now, roleConfig.maxMessages, roleConfig.windowMs);
        if (!roleResult.allowed)
            return roleResult;
        // 4. 检查渠道限流
        const channelKey = `channel:${channel}`;
        const channelConfig = this.limitConfigs.get(channelKey);
        let channelResult = null;
        if (channelConfig) {
            channelResult = this.checkSlidingWindow(this.getOrCreateWindow(this.channelWindows, channel), now, channelConfig.maxMessages, channelConfig.windowMs);
            if (!channelResult.allowed)
                return channelResult;
        }
        // 5. 自适应限流（队列积压超过阈值时）
        if (queueSize !== undefined) {
            const adaptiveResult = this.checkAdaptiveLimit(queueSize, now);
            if (!adaptiveResult.allowed)
                return adaptiveResult;
        }
        // 所有检查通过
        return {
            allowed: true,
            currentCount: this.globalWindow.reduce((s, e) => s + e.count, 0),
            limit: this.globalLimit.maxMessages,
            remaining: Math.max(0, this.globalLimit.maxMessages - this.getWindowCount(this.globalWindow, now, this.globalLimit.windowMs)),
            resetAt: now + this.globalLimit.windowMs,
        };
    }
    /**
     * 滑动窗口检查
     */
    checkSlidingWindow(window, now, limit, windowMs) {
        // 清理过期窗口
        const cutoff = now - windowMs;
        const validEntries = window.filter(e => e.timestamp > cutoff);
        const currentCount = validEntries.reduce((s, e) => s + e.count, 0);
        if (currentCount >= limit) {
            // 找到最旧的条目的过期时间
            const oldestEntry = validEntries[0];
            const resetAt = oldestEntry ? oldestEntry.timestamp + windowMs : now + windowMs;
            return {
                allowed: false,
                currentCount,
                limit,
                remaining: 0,
                resetAt,
                retryAfterMs: oldestEntry ? Math.max(0, resetAt - now) : windowMs,
            };
        }
        return {
            allowed: true,
            currentCount,
            limit,
            remaining: limit - currentCount,
            resetAt: now + windowMs,
        };
    }
    /**
     * 记录一次消息通过
     */
    record(userId, role, channel) {
        const now = Date.now();
        // 全局
        this.addToWindow(this.globalWindow, now);
        // 用户
        const userWindow = this.userWindows.get(userId) || [];
        this.addToWindow(userWindow, now);
        this.userWindows.set(userId, userWindow);
        // 角色
        const roleWindow = this.roleWindows.get(role) || [];
        this.addToWindow(roleWindow, now);
        this.roleWindows.set(role, roleWindow);
        // 渠道
        const channelWindow = this.channelWindows.get(channel) || [];
        this.addToWindow(channelWindow, now);
        this.channelWindows.set(channel, channelWindow);
    }
    /**
     * 添加到滑动窗口
     */
    addToWindow(window, timestamp) {
        // 合并到同一毫秒的条目
        const last = window[window.length - 1];
        if (last && last.timestamp === timestamp) {
            last.count++;
        }
        else {
            window.push({ timestamp, count: 1 });
        }
        // 清理过期条目（保留多一个窗口大小的历史）
        const cutoff = timestamp - 60000; // 保留最近60秒
        while (window.length > 0 && window[0].timestamp < cutoff) {
            window.shift();
        }
    }
    getOrCreateWindow(map, key) {
        if (!map.has(key)) {
            map.set(key, []);
        }
        return map.get(key);
    }
    getWindowCount(window, now, windowMs) {
        const cutoff = now - windowMs;
        return window
            .filter(e => e.timestamp > cutoff)
            .reduce((s, e) => s + e.count, 0);
    }
    /**
     * 自适应限流检查
     */
    checkAdaptiveLimit(queueSize, now) {
        // 队列积压超过100条时，限流50%；超过200条时，限流80%
        let factor = 1.0;
        if (queueSize > 200)
            factor = 0.2; // 限流80%
        else if (queueSize > 100)
            factor = 0.5; // 限流50%
        if (factor >= 1.0) {
            return { allowed: true, currentCount: 0, limit: -1, remaining: -1, resetAt: now };
        }
        const effectiveLimit = Math.floor(this.globalLimit.maxMessages * factor);
        const currentCount = this.getWindowCount(this.globalWindow, now, this.globalLimit.windowMs);
        if (currentCount >= effectiveLimit) {
            return {
                allowed: false,
                currentCount,
                limit: effectiveLimit,
                remaining: 0,
                resetAt: now + this.globalLimit.windowMs,
                retryAfterMs: this.globalLimit.windowMs,
            };
        }
        return { allowed: true, currentCount, limit: effectiveLimit, remaining: effectiveLimit - currentCount, resetAt: now + this.globalLimit.windowMs };
    }
    /**
     * 获取限流统计
     */
    getStats(queueSize) {
        const now = Date.now();
        const globalCurrent = this.getWindowCount(this.globalWindow, now, this.globalLimit.windowMs);
        let adaptive = null;
        if (queueSize !== undefined && queueSize > 100) {
            let factor = 1.0;
            if (queueSize > 200)
                factor = 0.2;
            else if (queueSize > 100)
                factor = 0.5;
            adaptive = {
                factor,
                effectiveLimit: Math.floor(this.globalLimit.maxMessages * factor),
                queueSize,
            };
        }
        return {
            global: { current: globalCurrent, limit: this.globalLimit.maxMessages, windowMs: this.globalLimit.windowMs },
            adaptive,
            users: this.userWindows.size,
            roles: this.roleWindows.size,
            channels: this.channelWindows.size,
        };
    }
    /**
     * 更新限流配置
     */
    updateConfig(key, config) {
        const existing = this.limitConfigs.get(key) || { type: 'user', maxMessages: 10, windowMs: 1000 };
        this.limitConfigs.set(key, { ...existing, ...config });
    }
}
export const messageRateLimiterService = MessageRateLimiterService.getInstance();
