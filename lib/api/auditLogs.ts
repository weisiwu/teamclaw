export type AuditAction =
  | 'user.create' | 'user.delete' | 'user.update' | 'role.change'
  | 'version.create' | 'version.delete' | 'version.bump'
  | 'config.change' | 'webhook.create' | 'webhook.update' | 'webhook.delete' | 'webhook.trigger'
  | 'task.cancel' | 'cron.create' | 'cron.delete' | 'file.upload' | 'file.delete'
  | 'login' | 'logout';

export interface AuditLog {
  id: string;
  action: AuditAction;
  actor: string;
  target?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AuditLogQuery {
  action?: AuditAction;
  actor?: string;
  target?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  list: AuditLog[];
  total: number;
}

export async function getAuditLogs(query: AuditLogQuery): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  if (query.action) params.set('action', query.action);
  if (query.actor) params.set('actor', query.actor);
  if (query.target) params.set('target', query.target);
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  if (query.keyword) params.set('keyword', query.keyword);
  if (query.limit) params.set('limit', String(query.limit));
  if (query.offset) params.set('offset', String(query.offset));

  const res = await fetch(`/api/v1/admin/audit-logs?${params}`);
  const data = await res.json();
  return data.data;
}
