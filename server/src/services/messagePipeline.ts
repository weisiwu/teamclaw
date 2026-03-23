/**
 * Message Pipeline Service
 * 消息机制模块 - 消息处理主管道
 * 
 * 串联消息→任务→Agent的全流程：
 * 1. 入队 + 优先级计算
 * 2. @Agent 检测 → 权限校验 → 任务创建 → Agent 派发
 * 3. 立即回复"已收到"
 * 4. Agent 执行完成 → 回复消息通道
 */

import { Message, ReceiveMessageRequest } from '../models/message.js';
import { messageQueueService } from './messageQueue.js';
import { enrichMessagePriority } from './priorityCalculator.js';
import { checkPermission } from './permissionService.js';
import { taskLifecycle } from './taskLifecycle.js';
import { dispatchToAgent } from './agentExecution.js';
import {
  sendReply,
  buildAcknowledgmentReply,
  buildPermissionDeniedReply,
  buildAgentBusyReply,
} from './messageReply.js';
import { AgentName } from '../constants/agents.js';

// ============ 类型定义 ============

export interface PipelineContext {
  message: Message;
  request: ReceiveMessageRequest;
}

export interface PipelineResult {
  success: boolean;
  messageId: string;
  acknowledged?: boolean;
  taskId?: string;
  executionId?: string;
  error?: string;
}

// ============ @Agent 检测 ============

/**
 * 从消息内容中检测 @mentioned Agent
 */
export function detectMentionedAgent(content: string): AgentName | null {
  const patterns: Array<{ regex: RegExp; agent: AgentName }> = [
    { regex: /@main/gi, agent: 'main' },
    { regex: /@pm/gi, agent: 'pm' },
    { regex: /@coder/gi, agent: 'coder' },
    { regex: /@reviewer/gi, agent: 'reviewer' },
  ];

  for (const { regex, agent } of patterns) {
    if (regex.test(content)) {
      return agent;
    }
  }
  return null;
}

// ============ 主管道入口 ============

/**
 * 处理消息的完整管道
 * 
 * 流程：
 * 1. 入队 + 计算优先级
 * 2. 立即回复"已收到"
 * 3. 检测 @agent → 权限校验 → 创建任务 → 派发 Agent
 */
export async function processMessage(request: ReceiveMessageRequest): Promise<PipelineResult> {
  const role = request.role || 'employee';
  const { urgency, priority, roleWeight } = enrichMessagePriority(role, request.content);

  // 1. 入队
  const enqueueResult = messageQueueService.enqueue({
    channel: request.channel,
    userId: request.userId,
    userName: request.userName || '未知用户',
    role: request.role || 'employee',
    roleWeight,
    content: request.content,
    type: request.type || 'text',
    urgency,
    priority,
    timestamp: request.timestamp || new Date().toISOString(),
    fileInfo: request.fileInfo,
  });

  const message = enqueueResult.message;

  // 2. 立即回复"已收到"（非阻塞）
  sendAcknowledgment(message).catch((err) => {
    console.error('[messagePipeline] Acknowledgment failed:', err.message);
  });

  // 3. 检测 @agent → 权限校验 → 创建任务 → 派发
  const mentionedAgent = detectMentionedAgent(request.content) || request.mentionedAgent as AgentName | null;

  if (mentionedAgent) {
    return handleAgentMention(message, request, mentionedAgent);
  }

  // 无 @agent：普通消息，仅入队
  return {
    success: true,
    messageId: message.messageId,
    acknowledged: true,
  };
}

// ============ @Agent 处理 ============

/**
 * 处理 @agent 提及
 * 
 * @main → 权限校验 → 创建任务(pending) → main Agent 开始讨论
 * @pm → 权限校验 → pm Agent 直接响应
 * 无权限 → 回复拒绝
 */
async function handleAgentMention(
  message: Message,
  request: ReceiveMessageRequest,
  agent: AgentName
): Promise<PipelineResult> {
  const { userId, userName, role: userRole } = request;

  // 权限校验
  const permission = checkPermission(userRole as any, agent);

  if (!permission.allowed) {
    // 回复权限拒绝
    const replyContent = buildPermissionDeniedReply(userName || '用户', agent);
    await sendReply({
      channel: request.channel,
      userId,
      content: replyContent,
    });

    return {
      success: false,
      messageId: message.messageId,
      error: `Permission denied: ${permission.reason}`,
    };
  }

  // 创建任务
  const sessionId = `session_${userId}_${Date.now()}`;
  const task = taskLifecycle.createTask({
    title: `[${agent}] ${message.content.slice(0, 50)}${message.content.length > 50 ? '...' : ''}`,
    description: message.content,
    priority: message.priority >= 15 ? 'urgent' : message.priority >= 10 ? 'high' : 'normal',
    sessionId,
    createdBy: userName || userId,
    tags: [agent, request.channel],
    assignedAgent: agent,
    dependsOn: [],
    subtaskIds: [],
    blockingTasks: [],
  });

  // 派发 Agent
  const dispatchResult = dispatchToAgent({
    dispatcher: 'system',
    targetAgent: agent,
    taskId: task.taskId,
    prompt: message.content,
  });

  if ('error' in dispatchResult) {
    return {
      success: false,
      messageId: message.messageId,
      taskId: task.taskId,
      error: dispatchResult.error,
    };
  }

  // 任务变为 running
  await taskLifecycle.transition(task.taskId, 'running');

  return {
    success: true,
    messageId: message.messageId,
    taskId: task.taskId,
    executionId: dispatchResult.executionId,
    acknowledged: true,
  };
}

// ============ 立即回复"已收到" ============

/**
 * 发送"消息已收到"回复
 */
async function sendAcknowledgment(message: Message): Promise<void> {
  const content = buildAcknowledgmentReply(message.userName);
  await sendReply({
    channel: message.channel,
    userId: message.userId,
    content,
  });
}
