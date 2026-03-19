/**
 * Messages API
 * 消息机制模块 - 前端 API 封装
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9700/api/v1';

// ========== 类型定义 ==========

export interface Message {
  messageId: string;
  channel: 'wechat' | 'feishu' | 'slack' | 'web';
  userId: string;
  userName: string;
  role: 'admin' | 'vice_admin' | 'employee';
  roleWeight: number;
  content: string;
  type: 'text' | 'file' | 'image' | 'voice' | 'emoji';
  urgency: number;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'suspended' | 'merged';
  timestamp: string;
  mergedFrom?: string[];
  preemptedBy?: string;
  fileInfo?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileUrl?: string;
    convertedContent?: string;
  };
}

export interface QueueStatus {
  list: Pick<Message, 'messageId' | 'userId' | 'userName' | 'role' | 'content' | 'priority' | 'status' | 'timestamp'>[];
  total: number;
  currentProcessing: string | null;
}

export interface QueueDetails {
  queueId: string;
  messages: Message[];
  total: number;
}

export interface ReceiveMessageRequest {
  channel: Message['channel'];
  userId: string;
  userName: string;
  role: Message['role'];
  content: string;
  type?: Message['type'];
  mentionedAgent?: string;
  timestamp?: string;
  fileInfo?: Message['fileInfo'];
}

export interface ReceiveMessageResponse {
  messageId: string;
  priority: number;
  status: Message['status'];
  preempted: boolean;
  notification?: string;
  merged: boolean;
}

export interface MessageHistoryParams {
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

// ========== API 函数 ==========

async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(json.message || 'API 请求失败');
  }
  return json.data;
}

/**
 * 接收外部消息
 */
export async function receiveMessage(
  data: ReceiveMessageRequest
): Promise<ReceiveMessageResponse> {
  return apiRequest<ReceiveMessageResponse>(`${API_BASE}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 获取当前消息队列状态
 */
export async function getQueueStatus(): Promise<QueueStatus> {
  return apiRequest<QueueStatus>(`${API_BASE}/messages/queue`);
}

/**
 * 获取队列详情
 */
export async function getQueueDetails(queueId?: string): Promise<QueueDetails> {
  const url = queueId
    ? `${API_BASE}/messages/queue/${queueId}`
    : `${API_BASE}/messages/queue`;
  return apiRequest<QueueDetails>(url);
}

/**
 * 手动触发抢占
 */
export async function preemptMessage(
  messageId: string
): Promise<{ preemptedMessageId: string | null; currentProcessing: string | null }> {
  return apiRequest(`${API_BASE}/messages/queue/${messageId}/preempt`, {
    method: 'POST',
  });
}

/**
 * 获取消息历史
 */
export async function getMessageHistory(
  params: MessageHistoryParams = {}
): Promise<PaginatedMessages> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.userId) searchParams.set('userId', params.userId);
  if (params.startTime) searchParams.set('startTime', params.startTime);
  if (params.endTime) searchParams.set('endTime', params.endTime);
  if (params.channel) searchParams.set('channel', params.channel);

  const query = searchParams.toString();
  return apiRequest<PaginatedMessages>(
    `${API_BASE}/messages/history${query ? `?${query}` : ''}`
  );
}

/**
 * 上传文件消息
 */
export async function uploadFileMessage(data: {
  channel: Message['channel'];
  userId: string;
  userName: string;
  role: Message['role'];
  fileName: string;
  fileSize: number;
  mimeType: string;
  content?: string;
}): Promise<{ messageId: string; status: Message['status'] }> {
  return apiRequest(`${API_BASE}/messages/file`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 更新消息状态
 */
export async function updateMessageStatus(
  messageId: string,
  status: Message['status']
): Promise<{ messageId: string; status: Message['status'] }> {
  return apiRequest(`${API_BASE}/messages/${messageId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ========== 新增 API ==========

/**
 * 获取消息统计
 */
export async function getMessageStats() {
  return apiRequest(`${API_BASE}/messages/stats`);
}

/**
 * 获取 DLQ 列表
 */
export async function getDLQEntries(params?: { page?: number; pageSize?: number; channel?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.channel) searchParams.set('channel', params.channel);
  const qs = searchParams.toString();
  return apiRequest(`${API_BASE}/messages/dlq${qs ? '?' + qs : ''}`);
}

/**
 * 获取 DLQ 统计
 */
export async function getDLQStats() {
  return apiRequest(`${API_BASE}/messages/dlq/stats`);
}

/**
 * 从 DLQ 重新入队
 */
export async function requeueFromDLQ(messageId: string) {
  return apiRequest(`${API_BASE}/messages/dlq/${messageId}/requeue`, { method: 'POST' });
}

/**
 * 从 DLQ 丢弃
 */
export async function discardFromDLQ(messageId: string) {
  return apiRequest(`${API_BASE}/messages/dlq/${messageId}`, { method: 'DELETE' });
}

/**
 * 获取重试统计
 */
export async function getRetryStats() {
  return apiRequest(`${API_BASE}/messages/retry/stats`);
}
