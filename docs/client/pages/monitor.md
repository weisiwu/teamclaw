# 系统监控页

## 页面路由

```
/monitor
```

## 功能概述

系统监控仪表盘，实时展示后端服务健康状态（PostgreSQL、Redis、ChromaDB）、服务延迟、系统运行时间，以及可选的全链路追踪（Trace）面板。

## 组件结构

| 组件 | 来源 | 说明 |
|------|------|------|
| `TraceDetail` | 页面内定义 | 单个 Trace 的详情展示（时间线和事件列表） |
| `Card` | `@/components/ui/card` | shadcn/ui 卡片 |
| `CardContent` | `@/components/ui/card` | 卡片内容 |
| `Button` | `@/components/ui/button` | 按钮 |
| `Badge` | `@/components/ui/badge` | 状态徽章 |
| `EmptyState` | `@/components/ui/empty-state` | 空状态 |

## 页面状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `health` | `useState<HealthData \| null>` | 系统健康数据 |
| `traces` | `useState<TraceInfo[]>` | 最近追踪列表 |
| `loading` | `useState<boolean>` | 加载中状态 |
| `error` | `useState<string \| null>` | 错误信息 |
| `selectedTrace` | `useState<string \| null>` | 选中的 Trace ID |
| `showTracePanel` | `useState<boolean>` | 是否显示追踪面板 |

## API 调用

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/health` | GET | 获取系统健康状态（每 30 秒轮询） |
| `/api/v1/traces/recent` | GET | 获取最近追踪列表 |
| `/api/v1/traces/:traceId` | GET | 获取单个 Trace 详情 |

## HealthData 数据结构

```typescript
interface HealthData {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    postgres: ServiceStatus;
    redis: ServiceStatus;
    chromadb: ServiceStatus;
  };
  uptime: number;  // 秒
}
```

## 全链路追踪事件类型

| 事件 | 说明 |
|------|------|
| `message:received` | 消息接收 |
| `message:routed` | 消息路由 |
| `task:created` | 任务创建 |
| `task:started` | 任务开始 |
| `task:completed` | 任务完成 |
| `task:failed` | 任务失败 |
| `agent:pipeline:start` | Agent 流水线启动 |
| `agent:pipeline:done` | Agent 流水线完成 |
| `agent:stage:change` | Agent 阶段变更 |
| `code:applied` | 代码应用 |
| `code:committed` | 代码提交 |
| `version:bumped` | 版本递增 |
| `build:started` | 构建开始 |
| `build:completed` | 构建完成 |
| `build:failed` | 构建失败 |
| `notification:send` | 通知发送 |

## 页面跳转关系

- 侧边栏「系统监控」→ `/monitor`
