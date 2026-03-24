# Agent 监控

## 页面路由

```
/admin/agents
```

## 页面功能描述

Agent 监控页面（需要管理员权限），实时监控所有 Agent 的健康状态：
- **总体状态概览**：Healthy / Degraded / Unhealthy / Offline 数量统计
- **Agent 健康卡片网格**：每个 Agent 的详细健康指标（成功率、平均耗时、运行时长）
- **问题和建议**：自动展示各 Agent 的问题和建议
- **执行统计表格**：各 Agent 的总执行/完成/失败/超时统计

监控数据每 30 秒自动轮询刷新。

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `AgentHealthCard` | 内联组件 | 单个 Agent 健康信息卡片 |
| `HealthSummaryCards` | 内联组件 | 总体状态统计卡片 |
| `ExecutionStatsTable` | 内联组件 | 执行统计表格 |
| `PermissionGuard` | `@/components/layout/PermissionGuard` | 权限守卫 |
| `Card` | `@/components/ui/card` | 卡片容器 |
| `Badge` | `@/components/ui/badge` | 状态徽章 |
| `Button` | `@/components/ui/button` | 操作按钮 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `healthData` | `useState<HealthReportData \| null>` | 健康报告数据 |
| `statsData` | `useState<Record<string, AgentStats> \| null>` | 执行统计数据 |
| `loading` | `useState<boolean>` | 初始加载状态 |
| `isChecking` | `useState<boolean>` | 健康检查请求中 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `fetch GET` | `/api/v1/agents/health` | 获取 Agent 健康状态 |
| `fetch GET` | `/api/v1/agents/executions/stats` | 获取执行统计 |
| `fetch POST` | `/api/v1/agents/health/check` | 触发健康检查 |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/monitor` | — | 相关监控页面 |
| `/admin/audit` | — | 审计日志页面 |

## 监控的 Agent 列表

```typescript
const AGENT_NAMES = ["main", "pm", "reviewer", "coder1", "coder2"];
```

## Agent 状态

| 状态 | 含义 | 颜色 |
|------|------|------|
| `healthy` | 健康 | 绿色 |
| `degraded` | 降级（部分指标异常） | 黄色 |
| `unhealthy` | 不健康（多项指标异常） | 红色 |
| `offline` | 离线（无心跳） | 灰色 |

## 健康检查

- 初始加载时自动获取数据
- 每 30 秒轮询刷新（通过 `setInterval`）
- 组件卸载时清理定时器
- 点击"健康检查"按钮可手动触发后端健康诊断
