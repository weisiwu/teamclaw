/**
 * AuditLog 模型定义
 * 后台管理平台 - 审计日志数据模型
 */

export type AuditAction =
  | 'user.create'
  | 'user.delete'
  | 'user.update'
  | 'role.change'
  | 'version.create'
  | 'version.delete'
  | 'version.bump'
  | 'version.rollback'
  | 'branch.create'
  | 'branch.delete'
  | 'tag.delete'
  | 'config.change'
  | 'webhook.create'
  | 'webhook.update'
  | 'webhook.delete'
  | 'webhook.trigger'
  | 'task.cancel'
  | 'cron.create'
  | 'cron.delete'
  | 'file.upload'
  | 'file.delete'
  | 'api_token.create'
  | 'api_token.delete'
  | 'login'
  | 'logout';

export interface AuditLog {
  id: string;              // 唯一标识，格式: audit_{timestamp}_{random}
  action: AuditAction;     // 操作类型
  actor: string;           // 操作者（user id 或 'system'）
  target?: string;         // 操作对象（如 version id, user id）
  details?: Record<string, unknown>;  // 附加信息
  ipAddress?: string;      // IP 地址
  userAgent?: string;      // 浏览器 UA
  timestamp: string;       // ISO 8601
}

export interface AuditLogQuery {
  action?: AuditAction;
  actor?: string;
  target?: string;
  startDate?: string;     // ISO 8601
  endDate?: string;       // ISO 8601
  keyword?: string;        // 搜索 details 中的内容
  limit?: number;         // 默认 50
  offset?: number;
}

export interface AuditLogResponse {
  list: AuditLog[];
  total: number;
}
