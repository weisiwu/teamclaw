export type WebhookEvent =
  | 'version.created' | 'version.deleted' | 'version.bumped'
  | 'task.created' | 'task.completed' | 'task.failed' | 'task.cancelled'
  | 'user.created' | 'user.deleted' | 'config.changed'
  | 'cron.triggered' | 'cron.failed';

export type WebhookStatus = 'active' | 'paused' | 'error';

export interface WebhookHeader {
  key: string;
  value: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  headers: WebhookHeader[];
  status: WebhookStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastTriggerAt?: string;
  lastTriggerStatus?: 'success' | 'failed';
  successCount: number;
  failCount: number;
}

export interface WebhookHistory {
  id: string;
  webhookId: string;
  event: WebhookEvent | 'test';
  payload: Record<string, unknown>;
  responseStatus?: number;
  durationMs: number;
  attempt: number;
  success: boolean;
  error?: string;
  timestamp: string;
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

export async function getWebhooks(): Promise<{ list: Webhook[]; total: number }> {
  const res = await fetch('/api/v1/admin/webhooks');
  const data = await res.json();
  return data.data;
}

export async function createWebhook(req: CreateWebhookRequest): Promise<Webhook> {
  const res = await fetch('/api/v1/admin/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function updateWebhook(id: string, req: UpdateWebhookRequest): Promise<Webhook> {
  const res = await fetch(`/api/v1/admin/webhooks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function deleteWebhook(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/webhooks/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
}

export async function testWebhook(id: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const res = await fetch(`/api/v1/admin/webhooks/${id}/test`, { method: 'POST' });
  const data = await res.json();
  return data.data;
}

export async function getWebhookHistory(id: string, limit = 50): Promise<WebhookHistory[]> {
  const res = await fetch(`/api/v1/admin/webhooks/${id}/history?limit=${limit}`);
  const data = await res.json();
  return data.data?.list || [];
}
