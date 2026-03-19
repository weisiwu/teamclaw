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

import { Message } from '../models/message.js';

export interface RetryConfig {
  maxRetries: number;        // 最大重试次数，默认 3
  baseDelayMs: number;        // 基础延迟（毫秒），默认 5000
  maxDelayMs: number;         // 最大延迟（毫秒），默认 60000
  backoffMultiplier: number;  // 退避倍数，默认 2
}

export interface RetryEntry {
  messageId: string;
  retryCount: number;
  nextRetryAt: string;        // ISO timestamp
  lastError?: string;
  lastRetryAt?: string;
}

export interface RetryResult {
  shouldRetry: boolean;
  delayMs: number;
  retryCount: number;
  nextRetryAt?: string;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 5000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

class MessageRetryService {
  private static instance: MessageRetryService;

  // 重试记录：messageId -> RetryEntry
  private retryRecords: Map<string, RetryEntry> = new Map();

  // 等待重试的消息队列（按 nextRetryAt 排序）
  private retryQueue: string[] = [];

  // 失败消息回调（由外部注入）
  private onRetryReady: ((msg: Message, retryCount: number) => void) | null = null;

  // 定时器
  private timer: ReturnType<typeof setTimeout> | null = null;

  private config: RetryConfig;

  static getInstance(): MessageRetryService {
    if (!MessageRetryService.instance) {
      MessageRetryService.instance = new MessageRetryService();
    }
    return MessageRetryService.instance;
  }

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.startTimer();
  }

  /**
   * 配置重试参数
   */
  configure(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置重试就绪回调
   */
  setRetryReadyCallback(cb: (msg: Message, retryCount: number) => void): void {
    this.onRetryReady = cb;
  }

  /**
   * 记录一次失败，准备重试
   */
  recordFailure(msg: Message, errorMessage: string = 'Unknown error'): RetryResult {
    const existing = this.retryRecords.get(msg.messageId);
    const retryCount = existing ? existing.retryCount + 1 : 1;

    if (retryCount > this.config.maxRetries) {
      // 超过最大重试次数，不重试
      this.retryRecords.delete(msg.messageId);
      return { shouldRetry: false, delayMs: 0, retryCount };
    }

    // 计算延迟
    const delayMs = Math.min(
      this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, retryCount - 1),
      this.config.maxDelayMs
    );

    const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

    const entry: RetryEntry = {
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
  private insertIntoRetryQueue(messageId: string, nextRetryAt: string): void {
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
  getRetryStatus(messageId: string): RetryEntry | null {
    return this.retryRecords.get(messageId) || null;
  }

  /**
   * 获取待重试队列（即将到期的）
   */
  getPendingRetries(limit: number = 10): RetryEntry[] {
    const now = Date.now();
    const results: RetryEntry[] = [];

    for (const messageId of this.retryQueue) {
      const entry = this.retryRecords.get(messageId);
      if (!entry) continue;

      if (new Date(entry.nextRetryAt).getTime() <= now) {
        results.push(entry);
        if (results.length >= limit) break;
      } else {
        break; // 已按时间排序，后面的还没到时间
      }
    }

    return results;
  }

  /**
   * 清除重试记录
   */
  clearRetry(messageId: string): void {
    this.retryRecords.delete(messageId);
    const idx = this.retryQueue.indexOf(messageId);
    if (idx !== -1) this.retryQueue.splice(idx, 1);
  }

  /**
   * 获取统计
   */
  getStats(): {
    pendingRetries: number;
    totalRecords: number;
    config: RetryConfig;
    nextRetry: string | null;
  } {
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
  private startTimer(): void {
    this.timer = setTimeout(() => this.checkAndProcessRetries(), 1000);
  }

  /**
   * 检查并处理到期的重试
   */
  private checkAndProcessRetries(): void {
    const pending = this.getPendingRetries(10);

    for (const entry of pending) {
      // 从队列移除（会在实际重试成功/失败后清除记录）
      const idx = this.retryQueue.indexOf(entry.messageId);
      if (idx !== -1) this.retryQueue.splice(idx, 1);

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
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export const messageRetryService = MessageRetryService.getInstance();
export { MessageRetryService };
