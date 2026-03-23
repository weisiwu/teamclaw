/**
 * Preemption Service
 * 消息机制模块 - 抢占规则引擎
 *
 * 规则：新任务优先级 > 当前任务优先级 × 1.5 → 触发抢占
 */

import { Message } from '../models/message.js';
import { messageQueueService } from './messageQueue.js';
import { shouldPreempt } from './priorityCalculator.js';

/**
 * PreemptionService Class
 * 优先级抢占引擎 - 提供面向对象的抢占判断和执行接口
 */
export class PreemptionService {
  /**
   * 判断是否触发抢占
   * 规则：新任务优先级 > 当前任务优先级 × 1.5
   */
  shouldPreempt(newPriority: number, currentPriority: number): boolean {
    return shouldPreempt(newPriority, currentPriority);
  }

  /**
   * 执行抢占
   * @returns 抢占结果
   */
  async preempt(
    newTaskId: string,
    currentTaskId: string
  ): Promise<{
    preempted: boolean;
    suspendedTask: string;
    notification: string;
  }> {
    const currentMsg = messageQueueService.getMessage(currentTaskId);
    const newMsg = messageQueueService.getMessage(newTaskId);

    if (!currentMsg) {
      return { preempted: false, suspendedTask: '', notification: '' };
    }

    const result = messageQueueService.preempt(currentTaskId);

    if (result.success) {
      await this.pauseCurrentAgentOnPreempt(currentTaskId);

      const notification = buildPreemptionNotification(
        currentMsg.userName,
        currentMsg.content.substring(0, 20),
        newMsg?.userName || '未知用户',
        newMsg?.content.substring(0, 20) || ''
      );

      return {
        preempted: true,
        suspendedTask: currentTaskId,
        notification,
      };
    }

    return { preempted: false, suspendedTask: '', notification: '' };
  }

  /**
   * 恢复被抢占的任务
   */
  async resumeSuspended(taskId: string): Promise<void> {
    resumeSuspendedTask(taskId);
  }

  /**
   * 抢占时联动暂停 Agent 执行
   */
  private async pauseCurrentAgentOnPreempt(preemptedMessageId: string): Promise<void> {
    try {
      const { abortExecution } = await import('./agentExecution.js');
      const currentProcessing = messageQueueService.getQueueStatus().currentProcessing;
      if (!currentProcessing) return;

      const preemptedMsg = messageQueueService.getMessage(preemptedMessageId);
      if (!preemptedMsg) return;

      const { getAgentExecutionState } = await import('./agentExecution.js');
      const agents = ['main', 'pm', 'coder1', 'coder2', 'reviewer'];
      for (const agentName of agents) {
        const state = getAgentExecutionState(agentName);
        if (state && state.status === 'running') {
          abortExecution(agentName, 'admin 抢占，任务被暂停');
          console.log(`[PreemptionService] Paused agent ${agentName} due to preemption`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PreemptionService] Failed to pause agent on preemption:', msg);
    }
  }
}

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
    const result = messageQueueService.enqueue(
      newMessage as Omit<Message, 'messageId' | 'priority' | 'status'>
    );
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
export function manualPreempt(messageId: string): {
  success: boolean;
  preemptedId: string | null;
  error?: string;
} {
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
 * 抢占时联动暂停 Agent 执行
 * 当 admin 消息触发抢占时，暂停当前正在执行的 Agent
 */
export async function pauseCurrentAgentOnPreempt(preemptedMessageId: string): Promise<void> {
  try {
    const { abortExecution } = await import('./agentExecution.js');
    const currentProcessing = messageQueueService.getQueueStatus().currentProcessing;
    if (!currentProcessing) return;

    // 获取当前正在处理的消息对应的任务
    const preemptedMsg = messageQueueService.getMessage(preemptedMessageId);
    if (!preemptedMsg) return;

    // 从 agentExecStates 获取当前运行的 agent
    const { getAgentExecutionState } = await import('./agentExecution.js');
    const agents = ['main', 'pm', 'coder1', 'coder2', 'reviewer'];
    for (const agentName of agents) {
      const state = getAgentExecutionState(agentName);
      if (state && state.status === 'running') {
        abortExecution(agentName, 'admin 抢占，任务被暂停');
        console.log(`[preemptionService] Paused agent ${agentName} due to preemption`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[preemptionService] Failed to pause agent on preemption:', msg);
  }
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
