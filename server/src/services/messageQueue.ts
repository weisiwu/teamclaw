/**
 * Message Queue 服务
 * 消息机制模块 - 消息队列管理
 * 
 * 基于内存的消息队列，支持优先级排序、入队、出队、抢占
 */

import { Message, QueueStatus } from '../models/message.js';
import { shouldPreempt } from './priorityCalculator.js';
import { messageMerger } from './messageMerger.js';

// 队列时间戳格式
function getDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

// 生成消息ID
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// 生成队列ID
function generateQueueId(): string {
  return `q_${getDateStr()}_${String(MessageQueueService.getInstance().getTodaySequence()).padStart(3, '0')}`;
}

class MessageQueueService {
  private static instance: MessageQueueService;

  // 消息存储：messageId -> Message
  private messages: Map<string, Message> = new Map();

  // 优先级队列：按 priority 降序排列的消息ID数组
  private priorityQueue: string[] = [];

  // 当前正在处理的消息ID
  private currentProcessing: string | null = null;

  // 今日队列序号（用于生成 queueId）
  private todaySequence: number = 0;
  private lastQueueDate: string = '';

  // 历史消息（用于消息历史查询）
  private history: Message[] = [];
  private readonly MAX_HISTORY = 1000;

  static getInstance(): MessageQueueService {
    if (!MessageQueueService.instance) {
      MessageQueueService.instance = new MessageQueueService();
    }
    return MessageQueueService.instance;
  }

  private getTodaySequence(): number {
    const today = getDateStr();
    if (today !== this.lastQueueDate) {
      this.todaySequence = 0;
      this.lastQueueDate = today;
    }
    this.todaySequence++;
    return this.todaySequence;
  }

  /**
   * 入队：接收新消息，处理合并，计算优先级，加入队列
   */
  enqueue(message: Omit<Message, 'messageId' | 'priority' | 'status'>): {
    message: Message;
    preempted: boolean;
    preemptedMessageId: string | null;
  } {
    // 尝试合并
    const merged = messageMerger.addMessage({
      ...message,
      messageId: generateMessageId(),
      priority: 0,
      status: 'pending',
    } as Message);

    if (merged) {
      // 被合并，不入队
      return { message: merged, preempted: false, preemptedMessageId: null };
    }

    // 构建新消息
    const fullMessage: Message = {
      ...message,
      messageId: generateMessageId(),
      priority: message.roleWeight * message.urgency,
      status: 'pending',
    };

    // 存储消息
    this.messages.set(fullMessage.messageId, fullMessage);

    // 加入优先级队列（按 priority 降序插入）
    this.insertIntoPriorityQueue(fullMessage.messageId, fullMessage.priority);

    // 检查是否需要抢占
    let preempted = false;
    let preemptedMessageId: string | null = null;

    if (this.currentProcessing) {
      const currentMsg = this.messages.get(this.currentProcessing);
      if (currentMsg && shouldPreempt(fullMessage.priority, currentMsg.priority)) {
        // 触发抢占
        preemptedMessageId = this.currentProcessing;
        this.suspendMessage(this.currentProcessing);
        this.currentProcessing = fullMessage.messageId;
        fullMessage.status = 'processing';
        preempted = true;
      }
    }

    return { message: fullMessage, preempted, preemptedMessageId };
  }

  /**
   * 按 priority 降序插入到优先级队列
   */
  private insertIntoPriorityQueue(messageId: string, priority: number): void {
    let inserted = false;
    for (let i = 0; i < this.priorityQueue.length; i++) {
      const existingMsg = this.messages.get(this.priorityQueue[i]);
      if (existingMsg && existingMsg.priority < priority) {
        this.priorityQueue.splice(i, 0, messageId);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.priorityQueue.push(messageId);
    }
  }

  /**
   * 挂起指定消息
   */
  private suspendMessage(messageId: string): void {
    const msg = this.messages.get(messageId);
    if (msg) {
      msg.status = 'suspended';
      // 从优先级队列中移除（不维护顺序，因为已挂起）
      const idx = this.priorityQueue.indexOf(messageId);
      if (idx !== -1) this.priorityQueue.splice(idx, 1);
    }
  }

  /**
   * 恢复挂起的消息（重新加入队列）
   */
  resumeMessage(messageId: string): boolean {
    const msg = this.messages.get(messageId);
    if (!msg || msg.status !== 'suspended') return false;

    msg.status = 'pending';
    this.insertIntoPriorityQueue(messageId, msg.priority);
    return true;
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): QueueStatus {
    const list = this.priorityQueue
      .map(id => this.messages.get(id))
      .filter((m): m is Message => m !== undefined && m.status !== 'suspended')
      .map(m => ({
        messageId: m.messageId,
        userId: m.userId,
        userName: m.userName,
        role: m.role,
        content: m.content,
        priority: m.priority,
        status: m.status,
        timestamp: m.timestamp,
      }));

    return {
      list,
      total: list.length,
      currentProcessing: this.currentProcessing,
    };
  }

  /**
   * 获取消息详情
   */
  getMessage(messageId: string): Message | undefined {
    return this.messages.get(messageId);
  }

  /**
   * 获取队列详情
   */
  getQueueDetails(queueId?: string): { queueId: string; messages: Message[]; total: number } {
    const qId = queueId || generateQueueId();
    const messages = this.priorityQueue
      .map(id => this.messages.get(id))
      .filter((m): m is Message => m !== undefined);

    return { queueId: qId, messages, total: messages.length };
  }

  /**
   * 更新消息状态
   */
  updateMessageStatus(messageId: string, status: Message['status']): boolean {
    const msg = this.messages.get(messageId);
    if (!msg) return false;
    msg.status = status;

    if (status === 'completed') {
      // 从队列中移除
      const idx = this.priorityQueue.indexOf(messageId);
      if (idx !== -1) this.priorityQueue.splice(idx, 1);
      // 加入历史
      this.addToHistory(msg);
      // 如果是当前处理的消息，触发下一个
      if (this.currentProcessing === messageId) {
        this.currentProcessing = null;
        this.processNext();
      }
    }

    return true;
  }

  /**
   * 处理下一条消息
   */
  private processNext(): void {
    if (this.priorityQueue.length === 0) return;

    const nextId = this.priorityQueue[0];
    const nextMsg = this.messages.get(nextId);
    if (nextMsg && nextMsg.status === 'pending') {
      this.currentProcessing = nextId;
      nextMsg.status = 'processing';
    }
  }

  /**
   * 获取消息历史
   */
  getMessageHistory(params: {
    page?: number;
    pageSize?: number;
    userId?: string;
    startTime?: string;
    endTime?: string;
  }): { list: Message[]; total: number; page: number; pageSize: number } {
    const { page = 1, pageSize = 20, userId, startTime, endTime } = params;

    let filtered = [...this.history];

    if (userId) {
      filtered = filtered.filter(m => m.userId === userId);
    }
    if (startTime) {
      const st = new Date(startTime).getTime();
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() >= st);
    }
    if (endTime) {
      const et = new Date(endTime).getTime();
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() <= et);
    }

    // 按时间倒序
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize);

    return { list, total, page, pageSize };
  }

  /**
   * 加入历史
   */
  private addToHistory(message: Message): void {
    this.history.unshift(message);
    if (this.history.length > this.MAX_HISTORY) {
      this.history = this.history.slice(0, this.MAX_HISTORY);
    }
  }

  /**
   * 手动触发抢占
   */
  preempt(messageId: string): { success: boolean; preemptedId: string | null } {
    if (!this.currentProcessing) {
      return { success: false, preemptedId: null };
    }

    const targetMsg = this.messages.get(messageId);
    if (!targetMsg) return { success: false, preemptedId: null };

    const currentMsg = this.messages.get(this.currentProcessing);
    if (!currentMsg) return { success: false, preemptedId: null };

    if (shouldPreempt(targetMsg.priority, currentMsg.priority)) {
      this.suspendMessage(this.currentProcessing);
      targetMsg.status = 'processing';
      const preemptedId = this.currentProcessing;
      this.currentProcessing = messageId;
      return { success: true, preemptedId };
    }

    return { success: false, preemptedId: null };
  }
}

export const messageQueueService = MessageQueueService.getInstance();
