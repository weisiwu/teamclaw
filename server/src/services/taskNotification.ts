import crypto from 'crypto';

/**
 * 任务通知服务 - 事件驱动通知（start/complete/fail/timeout）+ Webhook支持
 * iter-23 enhancement
 */

import { taskStore } from './taskLifecycle.js';

// ============ 类型定义 ============

export type TaskEventType = 'task_created' | 'task_started' | 'task_completed' | 'task_failed' | 'task_cancelled' | 'task_timeout_warning' | 'task_suspended';

export interface TaskNotificationEvent {
  eventId: string;         // 唯一事件ID
  eventType: TaskEventType;
  taskId: string;
  taskTitle: string;
  timestamp: string;       // ISO 8601
  payload: Record<string, unknown>; // 事件附加数据
  delivered: boolean;      // 是否已送达
  deliveryAttempts: number;
  lastDeliveryError?: string;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret?: string;        // 用于签名
  events: TaskEventType[]; // 订阅的事件类型
  enabled: boolean;
  createdAt: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  eventType: TaskEventType;
  filter?: {
    priority?: string[];
    assignedAgent?: string[];
    tags?: string[];
    createdBy?: string[];
  };
  channels: ('webhook' | 'log')[];
  webhookEndpointId?: string;
  enabled: boolean;
}

// ============ 内存存储 ============

const webhookEndpoints = new Map<string, WebhookEndpoint>();
const notificationRules = new Map<string, NotificationRule>();
const eventHistory: TaskNotificationEvent[] = [];
const MAX_HISTORY = 500;

// ============ Webhook 管理 ============

export function createWebhookEndpoint(params: {
  name: string;
  url: string;
  secret?: string;
  events: TaskEventType[];
}): WebhookEndpoint {
  const endpoint: WebhookEndpoint = {
    id: generateId('wh'),
    name: params.name,
    url: params.url,
    secret: params.secret,
    events: params.events,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  webhookEndpoints.set(endpoint.id, endpoint);
  return endpoint;
}

export function getWebhookEndpoint(id: string): WebhookEndpoint | undefined {
  return webhookEndpoints.get(id);
}

export function listWebhookEndpoints(): WebhookEndpoint[] {
  return [...webhookEndpoints.values()];
}

export function deleteWebhookEndpoint(id: string): boolean {
  // 同步删除关联规则
  for (const [ruleId, rule] of notificationRules.entries()) {
    if (rule.webhookEndpointId === id) {
      notificationRules.delete(ruleId);
    }
  }
  return webhookEndpoints.delete(id);
}

export function toggleWebhookEndpoint(id: string, enabled: boolean): boolean {
  const endpoint = webhookEndpoints.get(id);
  if (!endpoint) return false;
  endpoint.enabled = enabled;
  return true;
}

// ============ 通知规则管理 ============

export function createNotificationRule(params: {
  name: string;
  eventType: TaskEventType;
  filter?: NotificationRule['filter'];
  channels: ('webhook' | 'log')[];
  webhookEndpointId?: string;
}): NotificationRule {
  const rule: NotificationRule = {
    id: generateId('rule'),
    name: params.name,
    eventType: params.eventType,
    filter: params.filter,
    channels: params.channels,
    webhookEndpointId: params.webhookEndpointId,
    enabled: true,
  };
  notificationRules.set(rule.id, rule);
  return rule;
}

export function listNotificationRules(): NotificationRule[] {
  return [...notificationRules.values()];
}

export function deleteNotificationRule(id: string): boolean {
  return notificationRules.delete(id);
}

export function toggleNotificationRule(id: string, enabled: boolean): boolean {
  const rule = notificationRules.get(id);
  if (!rule) return false;
  rule.enabled = enabled;
  return true;
}

// ============ 事件发送（核心）============

export async function emitTaskEvent(eventType: TaskEventType, taskId: string, payload: Record<string, unknown> = {}): Promise<void> {
  const task = taskStore.get(taskId);
  if (!task) return;

  const event: TaskNotificationEvent = {
    eventId: generateId('evt'),
    eventType,
    taskId,
    taskTitle: task.title,
    timestamp: new Date().toISOString(),
    payload,
    delivered: false,
    deliveryAttempts: 0,
  };

  // 添加到历史
  eventHistory.push(event);
  if (eventHistory.length > MAX_HISTORY) eventHistory.shift();

  // 找到匹配的通知规则
  const matchingRules = [...notificationRules.values()].filter(rule => {
    if (!rule.enabled) return false;
    if (rule.eventType !== eventType) return false;
    // filter 匹配
    if (rule.filter) {
      const { priority, assignedAgent, tags, createdBy } = rule.filter;
      if (priority && !priority.includes(task.priority)) return false;
      if (assignedAgent && (!task.assignedAgent || !assignedAgent.includes(task.assignedAgent))) return false;
      if (tags && !tags.some(t => task.tags.includes(t))) return false;
      if (createdBy && !createdBy.includes(task.createdBy)) return false;
    }
    return true;
  });

  // 执行通知
  for (const rule of matchingRules) {
    if (rule.channels.includes('webhook') && rule.webhookEndpointId) {
      await deliverWebhook(event, rule.webhookEndpointId);
    }
    if (rule.channels.includes('log')) {
      console.log(`[TaskNotification][${eventType}] task=${taskId} "${task.title}" rule=${rule.name}`);
    }
  }

  // 也触发所有启用的webhook（不依赖规则）
  for (const endpoint of webhookEndpoints.values()) {
    if (endpoint.enabled && endpoint.events.includes(eventType)) {
      await deliverWebhook(event, endpoint.id);
    }
  }
}

// ============ Webhook 投递 ============

async function deliverWebhook(event: TaskNotificationEvent, endpointId: string): Promise<void> {
  const endpoint = webhookEndpoints.get(endpointId);
  if (!endpoint || !endpoint.enabled) return;

  event.deliveryAttempts++;
  const payload = {
    event,
    signature: endpoint.secret ? signPayload(JSON.stringify(event), endpoint.secret) : undefined,
  };

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(endpoint.secret ? { 'X-Webhook-Signature': payload.signature! } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      event.delivered = true;
    } else {
      event.lastDeliveryError = `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (err) {
    event.lastDeliveryError = String(err);
  }
}

function signPayload(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

// ============ 历史查询 ============

export function getEventHistory(opts: {
  taskId?: string;
  eventType?: TaskEventType;
  limit?: number;
} = {}): TaskNotificationEvent[] {
  let events = [...eventHistory].reverse();
  if (opts.taskId) events = events.filter(e => e.taskId === opts.taskId);
  if (opts.eventType) events = events.filter(e => e.eventType === opts.eventType);
  if (opts.limit) events = events.slice(0, opts.limit);
  return events;
}

export function getFailedDeliveries(limit = 20): TaskNotificationEvent[] {
  return eventHistory.filter(e => !e.delivered && e.deliveryAttempts > 0).slice(0, limit);
}

// ============ 快捷订阅API ============

export function subscribeTaskEvents(taskId: string, webhookUrl: string): WebhookEndpoint {
  return createWebhookEndpoint({
    name: `Task ${taskId} events`,
    url: webhookUrl,
    events: ['task_created', 'task_started', 'task_completed', 'task_failed', 'task_timeout_warning'],
  });
}
