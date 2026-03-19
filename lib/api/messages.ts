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

// ========== 消息流控 API ==========

export interface RateLimitStats {
  global: { current: number; limit: number; windowMs: number };
  adaptive: { factor: number; effectiveLimit: number; queueSize: number } | null;
  users: number;
  roles: number;
  channels: number;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

/**
 * 获取限流统计
 */
export async function getRateLimitStats(): Promise<{ data: RateLimitStats }> {
  return apiRequest(`${API_BASE}/messages/ratelimit/stats`);
}

/**
 * 限流检查
 */
export async function checkRateLimit(
  userId: string, role: string, channel: string
): Promise<{ data: RateLimitResult }> {
  return apiRequest(`${API_BASE}/messages/ratelimit/check?userId=${userId}&role=${role}&channel=${channel}`);
}

// ========== 断路器 API ==========

export interface CircuitBreakerStats {
  name: string;
  state: 'closed' | 'open' | 'half_open';
  totalRequests: number;
  totalFailures: number;
  failureRate: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  nextAttempt: number | null;
}

/**
 * 获取断路器统计
 */
export async function getCircuitBreakerStats(
  channel?: string
): Promise<{ data: Record<string, CircuitBreakerStats> }> {
  const qs = channel ? `?channel=${channel}` : '';
  return apiRequest(`${API_BASE}/messages/circuit/stats${qs}`);
}

/**
 * 重置断路器
 */
export async function resetCircuitBreaker(channel: string): Promise<{ data: { channel: string; reset: boolean } }> {
  return apiRequest(`${API_BASE}/messages/circuit/${channel}/reset`, { method: 'POST' });
}

// ========== 统一收件箱 API ==========

export interface UnifiedMessage {
  globalId: string;
  userGlobalId: string;
  sourceIds: Partial<Record<string, string>>;
  content: string;
  sender: { userId: string; userName: string; role: string };
  timestamp: string;
  channels: string[];
  type: string;
  unread: boolean;
  priority: number;
}

export interface ChannelSession {
  userGlobalId: string;
  latestByChannel: Partial<Record<string, UnifiedMessage> >;
  lastActivity: string;
  totalUnread: number;
}

/**
 * 获取统一收件箱
 */
export async function getUnifiedInbox(params?: {
  page?: number; pageSize?: number; channel?: string; role?: string; unreadOnly?: boolean;
}): Promise<{ data: { list: UnifiedMessage[]; total: number; page: number; pageSize: number; unreadTotal: number } }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params?.channel) sp.set('channel', params.channel);
  if (params?.role) sp.set('role', params.role);
  if (params?.unreadOnly) sp.set('unreadOnly', 'true');
  const qs = sp.toString();
  return apiRequest(`${API_BASE}/messages/unified/inbox${qs ? '?' + qs : ''}`);
}

/**
 * 获取跨渠道会话列表
 */
export async function getUserSessions(params?: {
  page?: number; pageSize?: number; hasUnread?: boolean;
}): Promise<{ data: { list: ChannelSession[]; total: number } }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params?.hasUnread !== undefined) sp.set('hasUnread', String(params.hasUnread));
  const qs = sp.toString();
  return apiRequest(`${API_BASE}/messages/unified/sessions${qs ? '?' + qs : ''}`);
}

/**
 * 获取跨渠道会话详情
 */
export async function getSessionMessages(userGlobalId: string): Promise<{ data: { userGlobalId: string; messages: UnifiedMessage[]; total: number } }> {
  return apiRequest(`${API_BASE}/messages/unified/sessions/${userGlobalId}`);
}

/**
 * 标记已读
 */
export async function markUnifiedRead(globalId?: string, userGlobalId?: string): Promise<{ data: { marked: number } }> {
  return apiRequest(`${API_BASE}/messages/unified/read`, {
    method: 'POST',
    body: JSON.stringify({ globalId, userGlobalId }),
  });
}

// ========== 消息路由 API ==========

export interface RouteRule {
  id: string;
  name: string;
  conditions: Record<string, unknown>;
  action: { target: string; agentType?: string; reason?: string };
  enabled: boolean;
  priority: number;
}

export interface RouteResult {
  routed: boolean;
  target: 'queue' | 'dlq' | 'drop' | 'agent';
  reason?: string;
  agentType?: string;
  tags?: string[];
  content?: string;
  matchedRule?: string;
}

export interface RouterStats {
  totalRules: number;
  enabledRules: number;
  byTarget: Record<string, number>;
}

/**
 * 获取路由规则列表
 */
export async function getRouterRules(): Promise<{ data: { rules: RouteRule[]; total: number } }> {
  return apiRequest(`${API_BASE}/messages/router/rules`);
}

/**
 * 添加/更新路由规则
 */
export async function upsertRouterRule(rule: RouteRule): Promise<{ data: { ruleId: string; added: boolean } }> {
  return apiRequest(`${API_BASE}/messages/router/rules`, {
    method: 'POST',
    body: JSON.stringify(rule),
  });
}

/**
 * 删除路由规则
 */
export async function deleteRouterRule(ruleId: string): Promise<{ data: { ruleId: string; deleted: boolean } }> {
  return apiRequest(`${API_BASE}/messages/router/rules/${ruleId}`, { method: 'DELETE' });
}

/**
 * 手动路由测试
 */
export async function testRouterRoute(params: {
  channel: string; userId: string; role: string; content: string; priority?: number;
}): Promise<{ data: RouteResult }> {
  return apiRequest(`${API_BASE}/messages/router/route`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * 获取路由统计
 */
export async function getRouterStats(): Promise<{ data: RouterStats }> {
  return apiRequest(`${API_BASE}/messages/router/stats`);
}
