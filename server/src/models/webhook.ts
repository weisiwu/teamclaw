/**
 * Webhook 模型定义
 * 后台管理平台 - Webhook 配置数据模型
 */

export type WebhookEvent =
  | 'version.created'
  | 'version.deleted'
  | 'version.bumped'
  | 'task.created'
  | 'task.completed'
  | 'task.failed'
  | 'task.cancelled'
  | 'user.created'
  | 'user.deleted'
  | 'config.changed'
  | 'cron.triggered'
  | 'cron.failed';

export type WebhookStatus = 'active' | 'paused' | 'error';

export interface WebhookHeader {
  key: string;
  value: string;
}

export interface Webhook {
  id: string;              // 唯一标识，格式: wh_{timestamp}_{random}
  name: string;            // Webhook 名称
  url: string;             // 回调 URL
  secret?: string;         // 签名密钥（可选）
  events: WebhookEvent[];  // 订阅的事件类型
  headers: WebhookHeader[]; // 自定义请求头
  status: WebhookStatus;   // 当前状态
  createdAt: string;       // ISO 8601
  updatedAt: string;
  createdBy: string;       // 创建者
  lastTriggerAt?: string;  // 上次触发时间
  lastTriggerStatus?: 'success' | 'failed';
  lastTriggerResponse?: string; // 上次响应摘要
  successCount: number;    // 成功次数
  failCount: number;       // 失败次数
}

export interface WebhookHistory {
  id: string;              // 唯一标识
  webhookId: string;       // 关联的 Webhook ID
  event: WebhookEvent;     // 触发的事件类型
  payload: Record<string, any>; // 发送的 payload
  responseStatus?: number;  // HTTP 响应码
  responseBody?: string;   // 响应体摘要
  durationMs: number;       // 请求耗时
  attempt: number;          // 第几次尝试
  success: boolean;
  error?: string;          // 错误信息
  timestamp: string;       // ISO 8601
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  headers?: WebhookHeader[];
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  secret?: string;
  events?: WebhookEvent[];
  headers?: WebhookHeader[];
  status?: WebhookStatus;
}

export interface WebhookListResponse {
  list: Webhook[];
  total: number;
}
