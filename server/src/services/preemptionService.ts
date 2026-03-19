/**
 * Preemption Service
 * 消息机制模块 - 抢占规则引擎
 * 
 * 规则：新任务优先级 > 当前任务优先级 × 1.5 → 触发抢占
 */

import { Message } from '../models/message.js';
import { messageQueueService } from './messageQueue.js';
import { shouldPreempt } from './priorityCalculator.js';

export interface PreemptionResult {
  triggered: boolean;
  preemptedMessageId: string | null;
  newMessageId: string;
  reason: string;
}

/**
 * 检查并执行抢占
 */
export function checkAndPreempt(newMessage: Message): PreemptionResult {
  const currentProcessing = messageQueueService.getQueueStatus().currentProcessing;

  if (!currentProcessing) {
    return {
      triggered: false,
      preemptedMessageId: null,
      newMessageId: newMessage.messageId,
      reason: '当前无正在执行的任务，无需抢占',
    };
  }

  const currentMsg = messageQueueService.getMessage(currentProcessing);
  if (!currentMsg) {
    return {
      triggered: false,
      preemptedMessageId: null,
      newMessageId: newMessage.messageId,
      reason: '当前任务不存在',
    };
  }

  if (shouldPreempt(newMessage.priority, currentMsg.priority)) {
    const result = messageQueueService.enqueue(newMessage as Omit<Message, 'messageId' | 'priority' | 'status'>);
    return {
      triggered: result.preempted,
      preemptedMessageId: result.preemptedMessageId,
      newMessageId: newMessage.messageId,
      reason: `新消息优先级(${newMessage.priority}) > 当前任务优先级(${currentMsg.priority}) × 1.5 = ${currentMsg.priority * 1.5}，触发抢占`,
    };
  }

  return {
    triggered: false,
    preemptedMessageId: null,
    newMessageId: newMessage.messageId,
    reason: `新消息优先级(${newMessage.priority}) ≤ 当前任务优先级(${currentMsg.priority}) × 1.5 = ${currentMsg.priority * 1.5}，不触发抢占`,
  };
}

/**
 * 手动触发抢占
 */
export function manualPreempt(messageId: string): { success: boolean; preemptedId: string | null; error?: string } {
  const targetMsg = messageQueueService.getMessage(messageId);
  if (!targetMsg) {
    return { success: false, preemptedId: null, error: '目标消息不存在' };
  }

  if (targetMsg.status === 'completed') {
    return { success: false, preemptedId: null, error: '已完成的任务无法抢占' };
  }

  const result = messageQueueService.preempt(messageId);
  if (!result.success) {
    return { success: false, preemptedId: null, error: '抢占条件不满足（优先级差距不足）' };
  }

  return { success: true, preemptedId: result.preemptedId };
}

/**
 * 恢复被抢占的任务
 */
export function resumeSuspendedTask(messageId: string): { success: boolean; error?: string } {
  const resumed = messageQueueService.resumeMessage(messageId);
  if (!resumed) {
    return { success: false, error: '消息不存在或状态不允许恢复' };
  }
  return { success: true };
}

/**
 * 获取抢占通知内容
 */
export function buildPreemptionNotification(
  preemptedUser: string,
  preemptedContent: string,
  newUser: string,
  newContent: string
): string {
  return `[抢占通知] ${preemptedUser} 的任务"${preemptedContent}"已被暂停，正在处理 ${newUser} 的任务"${newContent}"`;
}
