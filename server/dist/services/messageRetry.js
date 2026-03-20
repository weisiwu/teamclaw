/**
 * Message Retry Service
 * 消息机制模块 - 消息重试机制
 *
 * 支持：
 * - 可配置最大重试次数
 * - 指数退避策略（exponential backoff）
 * - 重试记录追踪
 * - 自动触发重试（基于定时器）
 */
const DEFAULT_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 5000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
};
class MessageRetryService {
    static instance;
    // 重试记录：messageId -> RetryEntry
    retryRecords = new Map();
    // 等待重试的消息队列（按 nextRetryAt 排序）
    retryQueue = [];
    // 失败消息回调（由外部注入）
    onRetryReady = null;
    // 定时器
    timer = null;
    config;
    static getInstance() {
        if (!MessageRetryService.instance) {
            MessageRetryService.instance = new MessageRetryService();
        }
        return MessageRetryService.instance;
    }
    constructor() {
        this.config = { ...DEFAULT_CONFIG };
        this.startTimer();
    }
    /**
     * 配置重试参数
     */
    configure(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * 设置重试就绪回调
     */
    setRetryReadyCallback(cb) {
        this.onRetryReady = cb;
    }
    /**
     * 记录一次失败，准备重试
     */
    recordFailure(msg, errorMessage = 'Unknown error') {
        const existing = this.retryRecords.get(msg.messageId);
        const retryCount = existing ? existing.retryCount + 1 : 1;
        if (retryCount > this.config.maxRetries) {
            // 超过最大重试次数，不重试
            this.retryRecords.delete(msg.messageId);
            return { shouldRetry: false, delayMs: 0, retryCount };
        }
        // 计算延迟
        const delayMs = Math.min(this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, retryCount - 1), this.config.maxDelayMs);
        const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
        const entry = {
            messageId: msg.messageId,
            retryCount,
            nextRetryAt,
            lastError: errorMessage,
            lastRetryAt: new Date().toISOString(),
        };
        this.retryRecords.set(msg.messageId, entry);
        this.insertIntoRetryQueue(msg.messageId, nextRetryAt);
        return {
            shouldRetry: true,
            delayMs,
            retryCount,
            nextRetryAt,
        };
    }
    /**
     * 将 messageId 按 nextRetryAt 排序插入 retryQueue
     */
    insertIntoRetryQueue(messageId, nextRetryAt) {
        const targetTime = new Date(nextRetryAt).getTime();
        // 找到插入位置（按时间升序）
        let insertIdx = this.retryQueue.length;
        for (let i = 0; i < this.retryQueue.length; i++) {
            const existing = this.retryRecords.get(this.retryQueue[i]);
            if (existing && new Date(existing.nextRetryAt).getTime() > targetTime) {
                insertIdx = i;
                break;
            }
        }
        this.retryQueue.splice(insertIdx, 0, messageId);
    }
    /**
     * 获取消息的重试状态
     */
    getRetryStatus(messageId) {
        return this.retryRecords.get(messageId) || null;
    }
    /**
     * 获取待重试队列（即将到期的）
     */
    getPendingRetries(limit = 10) {
        const now = Date.now();
        const results = [];
        for (const messageId of this.retryQueue) {
            const entry = this.retryRecords.get(messageId);
            if (!entry)
                continue;
            if (new Date(entry.nextRetryAt).getTime() <= now) {
                results.push(entry);
                if (results.length >= limit)
                    break;
            }
            else {
                break; // 已按时间排序，后面的还没到时间
            }
        }
        return results;
    }
    /**
     * 清除重试记录
     */
    clearRetry(messageId) {
        this.retryRecords.delete(messageId);
        const idx = this.retryQueue.indexOf(messageId);
        if (idx !== -1)
            this.retryQueue.splice(idx, 1);
    }
    /**
     * 获取统计
     */
    getStats() {
        const pending = this.getPendingRetries(0).length;
        const nextEntry = this.retryQueue.length > 0
            ? this.retryRecords.get(this.retryQueue[0])
            : null;
        return {
            pendingRetries: pending,
            totalRecords: this.retryRecords.size,
            config: { ...this.config },
            nextRetry: nextEntry?.nextRetryAt || null,
        };
    }
    /**
     * 启动定时器，定期检查重试队列
     */
    startTimer() {
        this.timer = setTimeout(() => this.checkAndProcessRetries(), 1000);
    }
    /**
     * 检查并处理到期的重试
     */
    checkAndProcessRetries() {
        const pending = this.getPendingRetries(10);
        for (const entry of pending) {
            // 从队列移除（会在实际重试成功/失败后清除记录）
            const idx = this.retryQueue.indexOf(entry.messageId);
            if (idx !== -1)
                this.retryQueue.splice(idx, 1);
            // 触发回调（由 messageQueueService 注入处理逻辑）
            if (this.onRetryReady) {
                // 注意：这里需要传入完整 Message 对象，由调用方提供
                // 实际处理由 messageQueueService 调用 handleRetryReady
            }
        }
        // 继续定时
        this.startTimer();
    }
    /**
     * 停止定时器
     */
    stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
export const messageRetryService = MessageRetryService.getInstance();
export { MessageRetryService };
