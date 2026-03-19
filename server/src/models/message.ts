/**
 * Message 模型定义
 * 消息机制模块 - 消息数据模型
 */

export interface Message {
  messageId: string;       // 唯一消息ID，格式: msg_{timestamp}_{random}
  channel: 'wechat' | 'feishu' | 'slack' | 'web';
  userId: string;
  userName: string;
  role: 'admin' | 'vice_admin' | 'employee';
  roleWeight: number;      // 角色权重：admin=10, vice_admin=7, employee=3
  content: string;
  type: 'text' | 'file' | 'image' | 'voice' | 'emoji';
  urgency: number;         // 紧急度：普通=1, 紧急=3
  priority: number;         // 计算后的优先级 = roleWeight × urgency
  status: 'pending' | 'processing' | 'completed' | 'suspended' | 'merged';
  timestamp: string;       // ISO 8601 格式
  mergedFrom?: string[];  // 如果是合并消息，记录被合并的消息ID列表
  fileInfo?: FileInfo;
  preemptedBy?: string;   // 如果被抢占，记录抢占者的消息ID
}

export interface FileInfo {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl?: string;
  convertedContent?: string;
}

export interface MessageQueue {
  queueId: string;         // 格式: q_{date}_{seq}
  messages: Message[];
  total: number;
  currentProcessing: string | null;  // 当前正在处理的消息ID
}

export interface QueueStatus {
  list: Pick<Message, 'messageId' | 'userId' | 'userName' | 'role' | 'content' | 'priority' | 'status' | 'timestamp'>[];
  total: number;
  currentProcessing: string | null;
}

// 角色权重映射
export const ROLE_WEIGHTS: Record<Message['role'], number> = {
  admin: 10,
  vice_admin: 7,
  employee: 3,
};

// 紧急关键词
export const URGENCY_KEYWORDS = ['紧急', '立刻', '马上', '急', '快', 'ASAP', 'urgent', 'immediately'];

// API 请求/响应类型
export interface ReceiveMessageRequest {
  channel: Message['channel'];
  userId: string;
  userName: string;
  role: Message['role'];
  content: string;
  type?: Message['type'];
  mentionedAgent?: string;
  timestamp?: string;
  fileInfo?: FileInfo;
}

export interface PreemptionRequest {
  newMessageId: string;
}

export interface MessageHistoryQuery {
  page?: number;
  pageSize?: number;
  userId?: string;
  startTime?: string;
  endTime?: string;
  channel?: Message['channel'];
}

export interface PaginatedMessages {
  list: Message[];
  total: number;
  page: number;
  pageSize: number;
}
