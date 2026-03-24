# 审计日志

## 页面路由

```
/admin/audit
```

## 页面功能描述

审计日志页面（需要管理员权限），记录系统中所有敏感操作的完整日志：
- **操作类型统计**：以卡片网格展示各类型操作的数量
- **多维度筛选**：操作类型、操作者、关键词、日期范围
- **日志表格**：时间、操作类型、操作者、目标、详情
- **分页导航**：支持上一页/下一页翻页
- **CSV 导出**：将筛选后的日志导出为 CSV 文件

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `ActionStatsCards` | 内联组件 | 操作类型统计卡片网格 |
| `AuditLogTable` | 内联组件 | 日志表格（含表头和行） |
| `PaginationControls` | 内联组件 | 分页导航按钮 |
| `PermissionGuard` | `@/components/layout/PermissionGuard` | 权限守卫 |
| `Card` | `@/components/ui/card` | 卡片容器 |
| `CardContent` | `@/components/ui/card` | 卡片内容区 |
| `Badge` | `@/components/ui/badge` | 操作类型徽章 |
| `Button` | `@/components/ui/button` | 操作按钮 |
| `Input` | `@/components/ui/input` | 搜索输入框 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `logs` | `useState<AuditLog[]>` | 日志列表数据 |
| `total` | `useState<number>` | 总记录数 |
| `loading` | `useState<boolean>` | 加载状态 |
| `action` | `useState<string>` | 操作类型筛选 |
| `actor` | `useState<string>` | 操作者筛选 |
| `keyword` | `useState<string>` | 关键词搜索 |
| `startDate / endDate` | `useState<string>` | 日期范围筛选 |
| `offset` | `useState<number>` | 分页偏移量（limit=30） |
| `toastMsg / toastType / toastVisible` | Toast 通知 | 操作反馈 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `fetch GET` | `/api/v1/admin/audit-logs` | 获取审计日志列表 |
| `fetch GET` | `/api/v1/admin/audit-logs/export` | 导出 CSV |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/admin/config` | — | 系统配置页面 |
| `/admin/webhooks` | — | Webhook 配置页面 |

## 操作类型映射

| 操作类型 | 中文标签 |
|---------|---------|
| `user.create` | 用户创建 |
| `user.delete` | 用户删除 |
| `role.change` | 角色变更 |
| `version.create` | 版本创建 |
| `version.bump` | 版本升级 |
| `config.change` | 配置变更 |
| `webhook.trigger` | Webhook 触发 |
| `login` | 登录 |
| `logout` | 登出 |

## 分页参数

- `limit`：每页记录数（固定 30）
- `offset`：当前偏移量
- 通过 `上一页/下一页` 按钮调整 offset
