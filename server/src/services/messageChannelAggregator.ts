/**
 * Message Channel Aggregator Service
 * 多渠道消息聚合服务
 * 
 * 功能：
 * - 统一不同渠道（飞书/微信/Web）的消息格式
 * - 跨渠道消息关联（同一用户的跨渠道会话）
 * - 统一收件箱视图
 */

import { Message } from '../models/message.js';

export interface UnifiedMessage {
  // 全局唯一消息ID
  globalId: string;
  // 用户维度ID（同一用户跨渠道）
  userGlobalId: string;
  // 各渠道原始消息ID
  sourceIds: Partial<Record<Message['channel'], string>>;
  // 内容
  content: string;
  // 发送者信息
  sender: {
    userId: string;
    userName: string;
    role: Message['role'];
  };
  // 时间（统一为ISO格式，取最早的那个）
  timestamp: string;
  // 渠道信息
  channels: Message['channel'][];
  // 消息类型
  type: Message['type'];
  // 是否已读
  unread: boolean;
  // 优先级（取最高）
  priority: number;
}

export interface ChannelSession {
  // 用户全局ID
  userGlobalId: string;
  // 各渠道最新消息
  latestByChannel: Partial<Record<Message['channel'], UnifiedMessage> >;
  // 最近活跃时间（任意渠道）
  lastActivity: string;
  // 未读消息数（跨渠道）
  totalUnread: number;
}

class MessageChannelAggregatorService {
  private static instance: MessageChannelAggregatorService;

  // 全局消息映射: globalId -> UnifiedMessage
  private globalMessages: Map<string, UnifiedMessage> = new Map();

  // 用户会话: userGlobalId -> ChannelSession
  private userSessions: Map<string, ChannelSession> = new Map();

  // 全局消息列表（按时间降序）
  private unifiedTimeline: string[] = []; // globalId 数组
  private readonly MAX_TIMELINE = 500;

  // 跨渠道关联规则（可通过配置扩展）
  private crossChannelRules: Array<{
    match: (msg: Partial<UnifiedMessage>) => boolean;
    link: (existing: UnifiedMessage, newMsg: Partial<UnifiedMessage>) => boolean;
  }> = [];

  static getInstance(): MessageChannelAggregatorService {
    if (!MessageChannelAggregatorService.instance) {
      MessageChannelAggregatorService.instance = new MessageChannelAggregatorService();
    }
    return MessageChannelAggregatorService.instance;
  }

  constructor() {
    // 默认跨渠道关联规则：同一用户ID跨渠道 + 内容相似度
    this.crossChannelRules.push({
      match: (msg) => !!msg.userGlobalId,
      link: (existing, newMsg) =>
        existing.userGlobalId === newMsg.userGlobalId &&
        existing.sender.role === newMsg.sender?.role,
    });
  }

  /**
   * 接收并统一化消息（来自各渠道适配器的原始消息）
   */
  aggregate(rawMessage: {
    channel: Message['channel'];
    channelMessageId: string;
    userId: string;
    userName: string;
    role: Message['role'];
    content: string;
    type?: Message['type'];
    timestamp?: string;
    priority?: number;
    metadata?: Record<string, unknown>;
  }): UnifiedMessage {
    const globalId = this.generateGlobalId(rawMessage.channel, rawMessage.channelMessageId);
    const userGlobalId = this.resolveUserGlobalId(rawMessage.userId, rawMessage.role);

    // 检查是否已有跨渠道消息可合并
    const existingSession = this.userSessions.get(userGlobalId);
    if (existingSession) {
      // 检查是否有同渠道的近期消息（5分钟内）可合并
      for (const ch of rawMessage.channel as Message['channel'][]) {
        const latest = existingSession.latestByChannel[ch];
        if (latest) {
          const age = Date.now() - new Date(latest.timestamp).getTime();
          if (age < 5 * 60 * 1000 && latest.content === rawMessage.content) {
            // 5分钟内同内容，追加到现有消息
            if (!latest.sourceIds[rawMessage.channel]) {
              latest.sourceIds[rawMessage.channel] = rawMessage.channelMessageId;
              latest.channels = [...new Set([...latest.channels, rawMessage.channel])];
            }
            return latest;
          }
        }
      }
    }

    // 创建新的统一消息
    const unified: UnifiedMessage = {
      globalId,
      userGlobalId,
      sourceIds: { [rawMessage.channel]: rawMessage.channelMessageId },
      content: rawMessage.content,
      sender: {
        userId: rawMessage.userId,
        userName: rawMessage.userName,
        role: rawMessage.role,
      },
      timestamp: rawMessage.timestamp || new Date().toISOString(),
      channels: [rawMessage.channel],
      type: rawMessage.type || 'text',
      unread: true,
      priority: rawMessage.priority || 1,
    };

    this.globalMessages.set(globalId, unified);
    this.unifiedTimeline.unshift(globalId);
    if (this.unifiedTimeline.length > this.MAX_TIMELINE) {
      const removed = this.unifiedTimeline.pop();
      if (removed) this.globalMessages.delete(removed);
    }

    // 更新用户会话
    this.updateUserSession(unified);

    return unified;
  }

  /**
   * 更新用户会话
   */
  private updateUserSession(msg: UnifiedMessage): void {
    if (!this.userSessions.has(msg.userGlobalId)) {
      this.userSessions.set(msg.userGlobalId, {
        userGlobalId: msg.userGlobalId,
        latestByChannel: {},
        lastActivity: msg.timestamp,
        totalUnread: 0,
      });
    }

    const session = this.userSessions.get(msg.userGlobalId)!;
    session.latestByChannel[msg.channels[0]] = msg;
    session.lastActivity = msg.timestamp;
    if (msg.unread) session.totalUnread++;
  }

  /**
   * 获取统一收件箱视图
   */
  getUnifiedInbox(params?: {
    page?: number;
    pageSize?: number;
    channel?: Message['channel'];
    role?: Message['role'];
    unreadOnly?: boolean;
  }): {
    list: UnifiedMessage[];
    total: number;
    page: number;
    pageSize: number;
    unreadTotal: number;
  } {
    const { page = 1, pageSize = 20, channel, role, unreadOnly } = params || {};

    let filtered = Array.from(this.globalMessages.values());

    if (channel) {
      filtered = filtered.filter(m => m.channels.includes(channel));
    }
    if (role) {
      filtered = filtered.filter(m => m.sender.role === role);
    }
    if (unreadOnly) {
      filtered = filtered.filter(m => m.unread);
    }

    // 按时间降序
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = filtered.length;
    const unreadTotal = filtered.filter(m => m.unread).length;
    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize);

    return { list, total, page, pageSize, unreadTotal };
  }

  /**
   * 获取跨渠道用户会话列表
   */
  getUserSessions(params?: {
    page?: number;
    pageSize?: number;
    hasUnread?: boolean;
  }): {
    list: ChannelSession[];
    total: number;
  } {
    const { page = 1, pageSize = 20, hasUnread } = params || {};

    let sessions = Array.from(this.userSessions.values());

    if (hasUnread !== undefined) {
      sessions = sessions.filter(s => hasUnread ? s.totalUnread > 0 : s.totalUnread === 0);
    }

    // 按最近活跃排序
    sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    const total = sessions.length;
    const start = (page - 1) * pageSize;
    const list = sessions.slice(start, start + pageSize);

    return { list, total };
  }

  /**
   * 获取跨渠道会话详情
   */
  getSessionMessages(userGlobalId: string): UnifiedMessage[] {
    const session = this.userSessions.get(userGlobalId);
    if (!session) return [];

    // 收集该用户所有跨渠道消息
    const messages: UnifiedMessage[] = [];
    for (const msg of this.globalMessages.values()) {
      if (msg.userGlobalId === userGlobalId) {
        messages.push(msg);
      }
    }

    // 按时间排序
    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * 标记消息为已读
   */
  markRead(globalId: string): boolean {
    const msg = this.globalMessages.get(globalId);
    if (!msg || !msg.unread) return false;

    msg.unread = false;
    const session = this.userSessions.get(msg.userGlobalId);
    if (session && session.totalUnread > 0) {
      session.totalUnread--;
    }
    return true;
  }

  /**
   * 标记用户所有消息为已读
   */
  markAllRead(userGlobalId: string): number {
    let count = 0;
    for (const msg of this.globalMessages.values()) {
      if (msg.userGlobalId === userGlobalId && msg.unread) {
        msg.unread = false;
        count++;
      }
    }
    const session = this.userSessions.get(userGlobalId);
    if (session) session.totalUnread = 0;
    return count;
  }

  /**
   * 获取跨渠道统计
   */
  getCrossChannelStats(): {
    totalMessages: number;
    totalSessions: number;
    totalUnread: number;
    byChannel: Record<Message['channel'], number>;
    byRole: Record<Message['role'], number>;
  } {
    const messages = Array.from(this.globalMessages.values());
    const byChannel: Record<string, number> = { feishu: 0, wechat: 0, web: 0 };
    const byRole: Record<string, number> = { boss: 0, pm: 0, architect: 0, coder: 0, employee: 0, system: 0 };

    let totalUnread = 0;

    for (const msg of messages) {
      for (const ch of msg.channels) {
        byChannel[ch] = (byChannel[ch] || 0) + 1;
      }
      byRole[msg.sender.role] = (byRole[msg.sender.role] || 0) + 1;
      if (msg.unread) totalUnread++;
    }

    return {
      totalMessages: messages.length,
      totalSessions: this.userSessions.size,
      totalUnread,
      byChannel: byChannel as Record<Message['channel'], number>,
      byRole: byRole as Record<Message['role'], number>,
    };
  }

  private generateGlobalId(channel: Message['channel'], channelMessageId: string): string {
    return `ugl_${channel}_${channelMessageId}`;
  }

  private resolveUserGlobalId(userId: string, role: Message['role']): string {
    // 跨渠道用户ID统一映射（可扩展为真实用户系统）
    return `user_${role}_${userId}`;
  }
}

export const messageChannelAggregatorService = MessageChannelAggregatorService.getInstance();
