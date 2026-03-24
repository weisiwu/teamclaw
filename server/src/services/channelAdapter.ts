/**
 * Channel Adapter 服务
 * 消息机制模块 - 消息通道适配器
 *
 * 统一不同平台（飞书、微信、Slack、Web）的消息格式
 */

import { Message, ReceiveMessageRequest } from '../models/message.js';

/**
 * 飞书消息格式转换
 */
export function adaptFeishuMessage(raw: Record<string, unknown>): ReceiveMessageRequest {
  // 飞书事件消息格式
  const event = raw.event as Record<string, unknown>;
  const sender = event?.sender as Record<string, unknown>;
  const content = JSON.parse((event?.content as string) || '{}');

  return {
    channel: 'feishu',
    userId: String(
      (sender?.sender_id as { open_id?: string; user_id?: string })?.open_id ||
        (sender?.sender_id as { open_id?: string; user_id?: string })?.user_id ||
        ''
    ),
    userName: String(sender?.sender_name || '未知用户'),
    role: detectRoleFromFeishu(sender),
    content: String(content.text || content.content || ''),
    type: 'text',
    mentionedAgent: detectMentionedAgent(content.text || ''),
    timestamp: String(event?.create_time || new Date().toISOString()),
  };
}

/**
 * 微信消息格式转换
 */
export function adaptWechatMessage(raw: Record<string, unknown>): ReceiveMessageRequest {
  return {
    channel: 'wechat',
    userId: String(raw.FromUserName || ''),
    userName: String(raw.FromNickName || '微信用户'),
    role: detectRoleFromWechat(raw),
    content: String(raw.Content || raw.Recognition || ''),
    type: detectWechatType(raw),
    mentionedAgent: detectMentionedAgent(String(raw.Content || '')),
    timestamp: String(
      raw.CreateTime
        ? new Date(Number(raw.CreateTime) * 1000).toISOString()
        : new Date().toISOString()
    ),
  };
}

/**
 * Web 消息格式转换
 */
export function adaptWebMessage(raw: Record<string, unknown>): ReceiveMessageRequest {
  return {
    channel: 'web',
    userId: String(raw.userId || raw.sessionId || 'anonymous'),
    userName: String(raw.userName || '访客'),
    role: (raw.role as Message['role']) || 'employee',
    content: String(raw.content || ''),
    type: 'text',
    mentionedAgent: detectMentionedAgent(String(raw.content || '')),
    timestamp: new Date().toISOString(),
  };
}

/**
 * 统一入口：根据 channel 调用对应适配器
 */
export function adaptMessage(
  raw: Record<string, unknown>,
  channel: Message['channel']
): ReceiveMessageRequest {
  switch (channel) {
    case 'feishu':
      return adaptFeishuMessage(raw);
    case 'wechat':
      return adaptWechatMessage(raw);
    case 'web':
      return adaptWebMessage(raw);
    default:
      return adaptWebMessage(raw);
  }
}

/**
 * 从飞书消息中检测角色
 */
function detectRoleFromFeishu(sender: Record<string, unknown> | undefined): Message['role'] {
  // 飞书特殊成员或管理员标识
  const isAdmin = sender?.is_admin === true || sender?.is_boss === true;
  const isViceAdmin = sender?.is_vice_admin === true;

  if (isAdmin) return 'admin';
  if (isViceAdmin) return 'vice_admin';
  return 'employee';
}

/**
 * 从微信消息中检测角色
 */
function detectRoleFromWechat(raw: Record<string, unknown>): Message['role'] {
  // 微信通过 RemarkName 或特定标签判断（此处简化处理）
  const remark = String(raw.RemarkName || '');
  if (remark.includes('[管理员]')) return 'admin';
  if (remark.includes('[副管理员]')) return 'vice_admin';
  return 'employee';
}

/**
 * 检测微信消息类型
 */
function detectWechatType(raw: Record<string, unknown>): Message['type'] {
  const msgType = String(raw.MsgType || '');
  switch (msgType) {
    case '1':
      return 'text';
    case '3':
      return 'image';
    case '34':
      return 'voice';
    case '47':
      return 'emoji';
    case '49':
      return 'file';
    default:
      return 'text';
  }
}

/**
 * 检测消息中 @ 的 Agent
 */
function detectMentionedAgent(content: string): string | undefined {
  const agents = ['main', 'pm', 'coder', 'reviewer', 'devops'];
  const lowerContent = content.toLowerCase();
  for (const agent of agents) {
    if (lowerContent.includes(`@${agent}`)) {
      return agent;
    }
  }
  return undefined;
}

// ============ UnifiedMessage Interface ============

export interface UnifiedMessage {
  messageId: string;
  channel: 'wechat' | 'feishu' | 'web';
  userId: string;
  userName: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'voice';
  mentionedAgent?: string;
  groupId: string;
  timestamp: string;
  rawData?: unknown;
}

// ============ ChannelAdapter Class ============

import { WechatService } from './wechatService.js';
import { FeishuService } from './feishuService.js';
export interface ChannelService {
  sendToGroup(groupId: string, content: string): Promise<void>;
}

/**
 * ChannelAdapter Class
 * 统一通道管理 - 注册通道、接收消息、发送消息
 */
export class ChannelAdapter {
  private channels: Map<string, ChannelService> = new Map();

  /**
   * 注册通道
   */
  registerChannel(name: string, service: ChannelService): void {
    this.channels.set(name, service);
    console.log(`[ChannelAdapter] Channel registered: ${name}`);
  }

  /**
   * 注册微信通道
   */
  registerWechat(service: WechatService): void {
    this.registerChannel('wechat', service);
  }

  /**
   * 注册飞书通道
   */
  registerFeishu(service: FeishuService): void {
    this.registerChannel('feishu', service);
  }

  /**
   * 接收消息（统一入口）
   * 将各通道的原始消息格式转换为 UnifiedMessage
   */
  async receive(channel: string, rawMessage: unknown): Promise<UnifiedMessage> {
    const msg = rawMessage as Record<string, unknown>;

    if (channel === 'wechat') {
      const adapted = adaptWechatMessage(msg);
      return {
        messageId: String(msg.msgid ?? msg.MsgId ?? Date.now()),
        channel: 'wechat',
        userId: adapted.userId,
        userName: adapted.userName,
        content: adapted.content,
        type: adapted.type || 'text',
        mentionedAgent: adapted.mentionedAgent,
        groupId: String(msg.roomid ?? msg.RoomId ?? adapted.userId),
        timestamp: adapted.timestamp || new Date().toISOString(),
        rawData: rawMessage,
      };
    }

    if (channel === 'feishu') {
      const adapted = adaptFeishuMessage(msg);
      return {
        messageId: String(msg.message_id ?? Date.now()),
        channel: 'feishu',
        userId: adapted.userId,
        userName: adapted.userName,
        content: adapted.content,
        type: adapted.type || 'text',
        mentionedAgent: adapted.mentionedAgent,
        groupId: String(msg.chat_id ?? msg.chatId ?? adapted.userId),
        timestamp: adapted.timestamp || new Date().toISOString(),
        rawData: rawMessage,
      };
    }

    // Web channel
    const adapted = adaptWebMessage(msg);
    return {
      messageId: String(msg.id ?? Date.now()),
      channel: 'web',
      userId: adapted.userId,
      userName: adapted.userName,
      content: adapted.content,
      type: 'text',
      mentionedAgent: adapted.mentionedAgent,
      groupId: String(msg.groupId ?? adapted.userId),
      timestamp: adapted.timestamp || new Date().toISOString(),
      rawData: rawMessage,
    };
  }

  /**
   * 发送消息（统一出口）
   */
  async send(channel: string, groupId: string, content: string): Promise<void> {
    const service = this.channels.get(channel);
    if (service) {
      await service.sendToGroup(groupId, content);
    } else {
      throw new Error(`[ChannelAdapter] Channel not registered: ${channel}`);
    }
  }

  /**
   * 获取已注册通道列表
   */
  getChannels(): string[] {
    return Array.from(this.channels.keys());
  }
}

// Singleton instance
export const channelAdapter = new ChannelAdapter();
