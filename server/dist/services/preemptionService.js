/**
 * Preemption Service
 * 消息机制模块 - 抢占规则引擎
 *
 * 规则：新任务优先级 > 当前任务优先级 × 1.5 → 触发抢占
 */
import { messageQueueService } from './messageQueue.js';
import { shouldPreempt } from './priorityCalculator.js';
/**
 * 检查并执行抢占
 */
export function checkAndPreempt(newMessage) {
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
        const result = messageQueueService.enqueue(newMessage);
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
export function manualPreempt(messageId) {
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
export function resumeSuspendedTask(messageId) {
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
export async function pauseCurrentAgentOnPreempt(preemptedMessageId) {
    try {
        const { abortExecution } = await import('./agentExecution.js');
        const currentProcessing = messageQueueService.getQueueStatus().currentProcessing;
        if (!currentProcessing)
            return;
        // 获取当前正在处理的消息对应的任务
        const preemptedMsg = messageQueueService.getMessage(preemptedMessageId);
        if (!preemptedMsg)
            return;
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
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[preemptionService] Failed to pause agent on preemption:', msg);
    }
}
/**
 * 获取抢占通知内容
 */
export function buildPreemptionNotification(preemptedUser, preemptedContent, newUser, newContent) {
    return `[抢占通知] ${preemptedUser} 的任务"${preemptedContent}"已被暂停，正在处理 ${newUser} 的任务"${newContent}"`;
}
