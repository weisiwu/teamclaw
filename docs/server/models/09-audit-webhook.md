# 审计日志与 Webhook 模型

> 来源文件：`server/src/models/auditLog.ts`, `server/src/models/webhook.ts`

## AuditLog 模型

审计日志记录。

```typescript
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
  | 'login'
  | 'logout';

export interface AuditLog {
  id: string; // 格式: audit_{timestamp}_{random}
  action: AuditAction; // 操作类型
  actor: string; // 操作者（user id 或 'system'）
  target?: string; // 操作对象（如 version id, user id）
  details?: Record<string, unknown>; // 附加信息
  ipAddress?: string; // IP 地址
  userAgent?: string; // 浏览器 UA
  timestamp: string; // ISO 8601
}
```

### AuditAction 操作类型

| 类别      | 操作                                                                          |
| --------- | ----------------------------------------------------------------------------- |
| 用户      | `user.create`, `user.delete`, `user.update`, `role.change`, `login`, `logout` |
| 版本      | `version.create`, `version.delete`, `version.bump`, `version.rollback`        |
| 分支/标签 | `branch.create`, `branch.delete`, `tag.delete`                                |
| 配置      | `config.change`                                                               |
| Webhook   | `webhook.create`, `webhook.update`, `webhook.delete`, `webhook.trigger`       |
| 任务      | `task.cancel`                                                                 |
| 定时任务  | `cron.create`, `cron.delete`                                                  |
| 文件      | `file.upload`, `file.delete`                                                  |

### AuditLogQuery 查询条件

```typescript
export interface AuditLogQuery {
  action?: AuditAction;
  actor?: string;
  target?: string;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
  keyword?: string; // 搜索 details 中的内容
  limit?: number; // 默认 50
  offset?: number;
}

export interface AuditLogResponse {
  list: AuditLog[];
  total: number;
}
```

## Webhook 模型

Webhook 配置。

```typescript
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
  // 标识
  id: string; // 格式: wh_{timestamp}_{random}
  name: string; // Webhook 名称
  url: string; // 回调 URL
  secret?: string; // HMAC 签名密钥

  // 配置
  events: WebhookEvent[]; // 订阅的事件类型
  headers: WebhookHeader[]; // 自定义请求头

  // 状态
  status: WebhookStatus;

  // 生命周期
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  createdBy: string; // 创建者

  // 执行统计
  lastTriggerAt?: string; // 上次触发时间
  lastTriggerStatus?: 'success' | 'failed';
  lastTriggerResponse?: string; // 上次响应摘要
  successCount: number; // 成功次数
  failCount: number; // 失败次数
}

export interface WebhookHistory {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, any>;
  responseStatus?: number; // HTTP 响应码
  responseBody?: string; // 响应体摘要
  durationMs: number; // 请求耗时
  attempt: number; // 尝试次数
  success: boolean;
  error?: string;
  timestamp: string; // ISO 8601
}
```

### WebhookEvent 事件类型

| 事件              | 说明         |
| ----------------- | ------------ |
| `version.created` | 版本创建     |
| `version.deleted` | 版本删除     |
| `version.bumped`  | 版本递增     |
| `task.created`    | 任务创建     |
| `task.completed`  | 任务完成     |
| `task.failed`     | 任务失败     |
| `task.cancelled`  | 任务取消     |
| `user.created`    | 用户创建     |
| `user.deleted`    | 用户删除     |
| `config.changed`  | 配置变更     |
| `cron.triggered`  | 定时任务触发 |
| `cron.failed`     | 定时任务失败 |

### WebhookStatus 状态

| 状态     | 说明                   |
| -------- | ---------------------- |
| `active` | 活跃，接收事件         |
| `paused` | 暂停，不接收事件       |
| `error`  | 异常（连续失败后标记） |

### Webhook 签名验证

当配置 `secret` 时，请求头包含 HMAC-SHA256 签名：

```
X-Webhook-Signature: sha256={hmac_signature}
```

## API 请求类型

```typescript
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
```

## 典型 Payload 结构

```typescript
interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: {
    // 根据事件类型不同
    versionId?: string;
    taskId?: string;
    userId?: string;
    // ...
  };
}
```
