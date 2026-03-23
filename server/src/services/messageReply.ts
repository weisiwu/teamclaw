/**
 * Message Reply Service
 * 消息机制模块 - 统一封装各渠道消息回复
 * 
 * 负责将消息回复发送到飞书/微信/Web等不同通道
 */

import { Message } from '../models/message.js';

export interface ReplyRequest {
  channel: Message['channel'];
  userId: string;
  content: string;
  messageId?: string;  // 可选的回复目标消息ID（用于回复链）
  replyType?: 'text' | 'notification' | 'mention';
}

/**
 * 发送文本回复到指定通道
 */
export async function sendReply(req: ReplyRequest): Promise<{ success: boolean; error?: string }> {
  const { channel, userId, content, messageId, replyType } = req;

  try {
    switch (channel) {
      case 'feishu':
        return await sendFeishuReply({ userId, content, messageId, replyType });
      case 'wechat':
        return await sendWechatReply({ userId, content });
      case 'web':
        return await sendWebReply({ userId, content });
      default:
        return { success: false, error: `Unsupported channel: ${channel}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[messageReply] Failed to send reply via ${channel}:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * 飞书回复
 */
async function sendFeishuReply(req: {
  userId: string;
  content: string;
  messageId?: string;
  replyType?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, content, messageId, replyType } = req;

  // 优先尝试通过 feishuService 发送
  try {
    const { sendFeishuMessage } = await import('./feishuService.js');
    const result = await sendFeishuMessage({
      receiveId: userId,
      receiveIdType: 'open_id',
      content: JSON.stringify({ text: content }),
      msgType: 'text',
    });
    return { success: true };
  } catch {
    // feishuService 不可用时降级到日志
  }

  // 降级：记录日志（实际生产中应接入飞书 API）
  console.log(`[messageReply:feishu] Would send to ${userId}: ${content}`);
  return { success: true };
}

/**
 * 微信回复
 */
async function sendWechatReply(req: {
  userId: string;
  content: string;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, content } = req;
  console.log(`[messageReply:wechat] Would send to ${userId}: ${content}`);
  return { success: true };
}

/**
 * Web 回复
 */
async function sendWebReply(req: {
  userId: string;
  content: string;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, content } = req;
  console.log(`[messageReply:web] Would send to ${userId}: ${content}`);
  return { success: true };
}

/**
 * 构建标准"已收到"回复文本
 */
export function buildAcknowledgmentReply(userName: string): string {
  return `✅ 收到！您的消息已加入处理队列，main 会尽快回复您。`;
}

/**
 * 构建权限拒绝回复文本
 */
export function buildPermissionDeniedReply(userName: string, agent: string): string {
  return `❌ 抱歉 ${userName}，您没有权限与 ${agent} 交互。如需帮助请联系管理员。`;
}

/**
 * 构建 Agent 执行中回复文本
 */
export function buildAgentBusyReply(userName: string): string {
  return `⏳ 抱歉 ${userName}，main 目前正在处理其他任务，请稍后再试。`;
}

/**
 * 构建抢占通知文本
 */
export function buildPreemptNotification(preemptedUser: string, newUser: string): string {
  return `[抢占通知] ${preemptedUser} 的任务已被暂停，正在处理 ${newUser} 的任务。`;
}
