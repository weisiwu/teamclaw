/**
 * Message Dead Letter Queue Service
 * 消息机制模块 - 死信队列（DLQ）
 * 
 * 当消息处理失败超过最大重试次数后，移入 DLQ 等待人工处理
 * 支持：
 * - DLQ 列表查询
 * - 消息从 DLQ 重新入队
 * - DLQ 消息丢弃
 * - DLQ 容量限制
 */

import { Message } from '../models/message.js';

export interface DLQEntry {
  message: Message;
  failedAt: string;          // 进入 DLQ 的时间
  failReason: string;         // 失败原因
  retryCount: number;         // 失败时的重试次数
  originalQueueId?: string;   // 原队列消息ID
}

export interface DLQStats {
  total: number;
  oldestEntry: string | null;  // 最老 entry 的时间
  newestEntry: string | null;   // 最新 entry 的时间
  byChannel: Record<string, number>;
}

class MessageDLQService {
  private static instance: MessageDLQService;

  // DLQ 存储
  private dlq: Map<string, DLQEntry> = new Map();

  // 最大容量
  private readonly MAX_DLQ_SIZE = 1000;

  static getInstance(): MessageDLQService {
    if (!MessageDLQService.instance) {
      MessageDLQService.instance = new MessageDLQService();
    }
    return MessageDLQService.instance;
  }

  /**
   * 将消息移入 DLQ
   */
  addToDLQ(msg: Message, failReason: string, retryCount: number): boolean {
    // 容量检查
    if (this.dlq.size >= this.MAX_DLQ_SIZE) {
      // 移除最老的 entry
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.dlq.delete(oldestKey);
      }
    }

    const entry: DLQEntry = {
      message: msg,
      failedAt: new Date().toISOString(),
      failReason,
      retryCount,
    };

    this.dlq.set(msg.messageId, entry);
    return true;
  }

  /**
   * 从 DLQ 中查找最老的 key
   */
  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.dlq) {
      const time = new Date(entry.failedAt).getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * 获取 DLQ 中的消息（支持分页）
   */
  getDLQEntries(params: {
    page?: number;
    pageSize?: number;
    channel?: Message['channel'];
  }): { list: DLQEntry[]; total: number; page: number; pageSize: number } {
    const { page = 1, pageSize = 20, channel } = params;

    let entries = Array.from(this.dlq.values());

    // 按时间倒序
    entries.sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime());

    // 渠道过滤
    if (channel) {
      entries = entries.filter(e => e.message.channel === channel);
    }

    const total = entries.length;
    const start = (page - 1) * pageSize;
    const list = entries.slice(start, start + pageSize);

    return { list, total, page, pageSize };
  }

  /**
   * 从 DLQ 获取单条消息
   */
  getEntry(messageId: string): DLQEntry | undefined {
    return this.dlq.get(messageId);
  }

  /**
   * 将消息从 DLQ 重新入队（返回消息数据）
   */
  requeue(messageId: string): Message | null {
    const entry = this.dlq.get(messageId);
    if (!entry) return null;

    // 重置消息状态，累加重试次数
    const requeuedMsg: Message = {
      ...entry.message,
      status: 'pending',
      // 清除之前的失败标记
    };

    this.dlq.delete(messageId);
    return requeuedMsg;
  }

  /**
   * 从 DLQ 丢弃消息
   */
  discard(messageId: string): boolean {
    return this.dlq.delete(messageId);
  }

  /**
   * 清空 DLQ
   */
  clear(): number {
    const count = this.dlq.size;
    this.dlq.clear();
    return count;
  }

  /**
   * 获取 DLQ 统计
   */
  getStats(): DLQStats {
    const entries = Array.from(this.dlq.values());

    let oldestEntry: string | null = null;
    let newestEntry: string | null = null;
    let oldestTime = Infinity;
    let newestTime = 0;

    const byChannel: Record<string, number> = {};

    for (const entry of entries) {
      const time = new Date(entry.failedAt).getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestEntry = entry.failedAt;
      }
      if (time > newestTime) {
        newestTime = time;
        newestEntry = entry.failedAt;
      }

      const ch = entry.message.channel;
      byChannel[ch] = (byChannel[ch] || 0) + 1;
    }

    return {
      total: entries.length,
      oldestEntry,
      newestEntry,
      byChannel,
    };
  }

  /**
   * 检查消息是否在 DLQ 中
   */
  has(messageId: string): boolean {
    return this.dlq.has(messageId);
  }
}

export const messageDLQService = MessageDLQService.getInstance();
export { MessageDLQService };
