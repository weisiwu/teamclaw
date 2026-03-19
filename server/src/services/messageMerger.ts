/**
 * Message Merger 服务
 * 消息机制模块 - 消息合并引擎
 * 
 * 规则：同一用户在 5 分钟内的连续消息自动合并为一条结构化指令
 */

import { Message } from '../models/message.js';

// 合并时间窗口（毫秒）
const MERGE_WINDOW_MS = 5 * 60 * 1000; // 5 分钟

interface PendingMessage {
  message: Message;
  firstTimestamp: number;
  contentParts: string[];
}

/**
 * 消息合并器
 * 维护一个待合并消息的 Map，以 userId 为 key
 */
class MessageMerger {
  private pendingMessages: Map<string, PendingMessage> = new Map();

  /**
   * 尝试将消息加入合并队列
   * @returns 合并后的消息，或 null（消息已加入待合并队列但尚未合并）
   */
  addMessage(message: Message): Message | null {
    const key = `${message.channel}:${message.userId}`;
    const now = Date.now();

    const existing = this.pendingMessages.get(key);
    if (existing) {
      // 检查是否在合并时间窗口内
      if (now - existing.firstTimestamp <= MERGE_WINDOW_MS) {
        // 追加内容
        existing.contentParts.push(message.content);
        existing.message.content = existing.contentParts.join(' ');
        existing.message.mergedFrom = existing.message.mergedFrom || [];
        existing.message.mergedFrom.push(message.messageId);
        return null; // 消息已合并，尚未触发最终合并
      } else {
        // 窗口已过，先触发旧消息的合并
        this.flushUser(key);
      }
    }

    // 新建待合并消息
    this.pendingMessages.set(key, {
      message: { ...message },
      firstTimestamp: now,
      contentParts: [message.content],
    });

    return null;
  }

  /**
   * 强制合并并返回指定用户的所有待合并消息
   */
  flushUser(key: string): Message | null {
    const pending = this.pendingMessages.get(key);
    if (!pending) return null;

    this.pendingMessages.delete(key);

    if (pending.contentParts.length > 1) {
      pending.message.status = 'merged';
      pending.message.content = pending.contentParts.join(' ');
    }

    return pending.message;
  }

  /**
   * 强制合并所有待合并消息
   * @returns 所有已合并的消息列表
   */
  flushAll(): Message[] {
    const results: Message[] = [];
    for (const key of this.pendingMessages.keys()) {
      const merged = this.flushUser(key);
      if (merged) results.push(merged);
    }
    return results;
  }

  /**
   * 检查指定用户是否有待合并消息
   */
  hasPending(key: string): boolean {
    return this.pendingMessages.has(key);
  }

  /**
   * 获取指定用户的待合并消息数
   */
  getPendingCount(key: string): number {
    const pending = this.pendingMessages.get(key);
    return pending ? pending.contentParts.length : 0;
  }
}

// 单例导出
export const messageMerger = new MessageMerger();

/**
 * 生成合并后的消息ID
 */
export function generateMergedMessageId(originalIds: string[]): string {
  return `merged_${originalIds.join('_')}`;
}
