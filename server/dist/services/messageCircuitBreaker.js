/**
 * Message Circuit Breaker Service
 * 消息流控 - 断路器服务
 *
 * 三状态断路器：
 * - CLOSED: 正常，允许消息通过；失败率超标时切换到 OPEN
 * - OPEN: 拒绝所有消息；超时后切换到 HALF_OPEN
 * - HALF_OPEN: 允许部分消息通过；成功则回到 CLOSED，失败则回到 OPEN
 */
class MessageCircuitBreakerService {
    static instance;
    // 按通道命名的断路器记录
    circuits = new Map();
    // 断路器状态
    states = new Map();
    // OPEN 状态开始时间（用于计算下次尝试时间）
    openSince = new Map();
    // HALF_OPEN 已允许的试探请求数
    halfOpenAllowed = new Map();
    // 各通道断路器配置
    configs = new Map([
        ['default', {
                failureRateThreshold: 50, // 50% 失败率
                minimumRequests: 10,
                openDurationMs: 30000, // 30秒
                halfOpenRequests: 3,
                halfOpenSuccesses: 2,
            }],
        ['feishu', {
                failureRateThreshold: 60,
                minimumRequests: 20,
                openDurationMs: 15000,
                halfOpenRequests: 5,
                halfOpenSuccesses: 3,
            }],
        ['wechat', {
                failureRateThreshold: 60,
                minimumRequests: 15,
                openDurationMs: 20000,
                halfOpenRequests: 4,
                halfOpenSuccesses: 2,
            }],
    ]);
    static getInstance() {
        if (!MessageCircuitBreakerService.instance) {
            MessageCircuitBreakerService.instance = new MessageCircuitBreakerService();
        }
        return MessageCircuitBreakerService.instance;
    }
    /**
     * 检查断路器状态，决定是否允许请求
     */
    canExecute(channel) {
        const state = this.getState(channel);
        const config = this.getConfig(channel);
        if (state === 'closed') {
            return { allowed: true, state: 'closed' };
        }
        if (state === 'open') {
            const openTime = this.openSince.get(channel) || Date.now();
            const elapsed = Date.now() - openTime;
            if (elapsed >= config.openDurationMs) {
                // 时间到，切换到 HALF_OPEN
                this.setState(channel, 'half_open');
                this.halfOpenAllowed.set(channel, 0);
                const record = this.getOrCreateRecord(channel);
                record.requests = 0;
                record.failures = 0;
                record.successes = 0;
                record.windowStart = Date.now();
                return { allowed: true, reason: 'half_open_retry', state: 'half_open' };
            }
            return {
                allowed: false,
                reason: `Circuit open. Retry after ${config.openDurationMs - elapsed}ms`,
                state: 'open',
            };
        }
        if (state === 'half_open') {
            const allowed = (this.halfOpenAllowed.get(channel) || 0) < config.halfOpenRequests;
            if (allowed) {
                this.halfOpenAllowed.set(channel, (this.halfOpenAllowed.get(channel) || 0) + 1);
                return { allowed: true, reason: 'half_open_trial', state: 'half_open' };
            }
            return { allowed: false, reason: 'Half-open trial limit reached', state: 'half_open' };
        }
        return { allowed: true, state: 'closed' };
    }
    /**
     * 记录成功
     */
    recordSuccess(channel) {
        const state = this.getState(channel);
        const record = this.getOrCreateRecord(channel);
        const config = this.getConfig(channel);
        if (state === 'half_open') {
            record.successes++;
            if (record.successes >= config.halfOpenSuccesses) {
                // 恢复 CLOSED
                this.setState(channel, 'closed');
                record.requests = 0;
                record.failures = 0;
                record.successes = 0;
                record.windowStart = Date.now();
            }
        }
        else if (state === 'closed') {
            record.failures = Math.max(0, record.failures - 1); // 成功减少失败计数
        }
    }
    /**
     * 记录失败
     */
    recordFailure(channel) {
        const state = this.getState(channel);
        const record = this.getOrCreateRecord(channel);
        const config = this.getConfig(channel);
        if (state === 'half_open') {
            // HALF_OPEN 下失败，立即回到 OPEN
            this.setState(channel, 'open');
            this.openSince.set(channel, Date.now());
            record.successes = 0;
            return;
        }
        record.failures++;
        record.requests++;
        const windowMs = 60000; // 60秒滑动窗口
        if (Date.now() - record.windowStart > windowMs) {
            // 窗口过期，重置
            record.requests = record.failures;
            record.windowStart = Date.now();
        }
        // 计算失败率
        const failureRate = record.requests > 0 ? (record.failures / record.requests) * 100 : 0;
        if (record.requests >= config.minimumRequests &&
            failureRate >= config.failureRateThreshold) {
            // 触发断路
            this.setState(channel, 'open');
            this.openSince.set(channel, Date.now());
        }
    }
    /**
     * 获取断路器状态
     */
    getState(channel) {
        return this.states.get(channel) || 'closed';
    }
    /**
     * 设置断路器状态
     */
    setState(channel, state) {
        this.states.set(channel, state);
    }
    getOrCreateRecord(channel) {
        if (!this.circuits.has(channel)) {
            this.circuits.set(channel, {
                requests: 0,
                failures: 0,
                windowStart: Date.now(),
                successes: 0,
            });
        }
        return this.circuits.get(channel);
    }
    getConfig(channel) {
        return this.configs.get(channel) || this.configs.get('default');
    }
    /**
     * 获取统计信息
     */
    getStats(channel) {
        const result = {};
        const channels = channel ? [channel] : Array.from(this.circuits.keys());
        for (const ch of channels) {
            const state = this.getState(ch);
            const record = this.getOrCreateRecord(ch);
            const config = this.getConfig(ch);
            const failureRate = record.requests > 0 ? (record.failures / record.requests) * 100 : 0;
            let nextAttempt = null;
            if (state === 'open') {
                const openTime = this.openSince.get(ch) || Date.now();
                nextAttempt = openTime + config.openDurationMs;
            }
            result[ch] = {
                name: ch,
                state,
                totalRequests: record.requests,
                totalFailures: record.failures,
                failureRate: Math.round(failureRate * 10) / 10,
                consecutiveFailures: record.failures,
                consecutiveSuccesses: record.successes,
                lastFailureTime: record.failures > 0 ? record.windowStart + 60000 : null,
                lastStateChange: Date.now(),
                nextAttempt,
            };
        }
        return result;
    }
    /**
     * 手动重置断路器
     */
    reset(channel) {
        this.setState(channel, 'closed');
        this.openSince.delete(channel);
        this.halfOpenAllowed.delete(channel);
        const record = this.getOrCreateRecord(channel);
        record.requests = 0;
        record.failures = 0;
        record.successes = 0;
        record.windowStart = Date.now();
    }
    /**
     * 更新配置
     */
    updateConfig(channel, config) {
        const existing = this.getConfig(channel);
        this.configs.set(channel, { ...existing, ...config });
    }
}
export const messageCircuitBreakerService = MessageCircuitBreakerService.getInstance();
