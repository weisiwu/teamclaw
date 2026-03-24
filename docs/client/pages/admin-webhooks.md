# Webhook 配置

## 页面路由

```
/admin/webhooks
```

## 页面功能描述

Webhook 配置页面（需要管理员权限），管理系统事件通知回调：
- 展示所有 Webhook 列表（含状态、成功/失败次数）
- 创建新 Webhook（名称、回调 URL、签名密钥、订阅事件）
- 编辑已有 Webhook
- 启用/暂停 Webhook
- 测试 Webhook（手动触发）
- 查看最近通知历史
- 删除 Webhook（需二次确认）

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `WebhookCard` | 内联组件 | 单个 Webhook 信息卡片 |
| `WebhookForm` | 内联组件 | 创建/编辑表单 |
| `WebhookHistory` | 内联组件 | 通知历史列表 |
| `DeleteConfirmDialog` | `@/components/ui/dialog` | 删除确认弹窗 |
| `PermissionGuard` | `@/components/layout/PermissionGuard` | 权限守卫 |
| `useToast` | `@/components/ui/toast` | Toast 通知 Hook |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `webhooks` | `useState<Webhook[]>` | Webhook 列表 |
| `loading` | `useState<boolean>` | 加载状态 |
| `showForm` | `useState<boolean>` | 表单弹窗开关 |
| `editingId` | `useState<string \| null>` | 当前编辑的 Webhook ID |
| `form` | `useState<{name, url, secret, events}>` | 表单数据 |
| `historyMap` | `useState<Record<string, WebhookHistory[]>>` | 各 Webhook 的历史记录 |
| `testing` | `useState<string \| null>` | 当前测试中的 Webhook ID |
| `testResult` | `useState<Record<string, TestResult>>` | 测试结果 |
| `deleteConfirm` | `useState<{open, webhookId}>` | 删除确认弹窗状态 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `fetch GET` | `/api/v1/admin/webhooks` | 获取 Webhook 列表 |
| `fetch POST` | `/api/v1/admin/webhooks` | 创建 Webhook |
| `fetch PUT` | `/api/v1/admin/webhooks/[id]` | 更新/启用/暂停 Webhook |
| `fetch DELETE` | `/api/v1/admin/webhooks/[id]` | 删除 Webhook |
| `fetch POST` | `/api/v1/admin/webhooks/[id]/test` | 测试 Webhook |
| `fetch GET` | `/api/v1/admin/webhooks/[id]/history` | 获取通知历史 |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/admin/audit` | — | 相关日志页面 |
| `/admin/config` | — | 系统配置页面 |

## 支持的事件类型

| 事件类型 | 含义 |
|---------|------|
| `version.created` | 版本创建 |
| `version.deleted` | 版本删除 |
| `version.bumped` | 版本升级 |
| `task.created` | 任务创建 |
| `task.completed` | 任务完成 |
| `task.failed` | 任务失败 |
| `user.created` | 用户创建 |
| `user.deleted` | 用户删除 |
| `config.changed` | 配置变更 |
| `cron.triggered` | 定时任务触发 |
| `cron.failed` | 定时任务失败 |

## Webhook 状态

| 状态 | 含义 |
|------|------|
| `active` | 启用中 |
| `paused` | 已暂停 |
