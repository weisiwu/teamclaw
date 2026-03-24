# 任务详情页

## 页面路由

```
/tasks/[id]
```

## 功能概述

展示单个任务的完整信息，包括执行状态、Agent 流水线阶段可视化、日志输出和元数据。是最重要的任务执行追踪页面。

## 组件结构

| 组件 | 来源 | 说明 |
|------|------|------|
| `TaskStatusBadge` | `@/components/tasks/TaskStatusBadge` | 任务状态徽章 |
| `TaskSteps` | `@/components/tasks/TaskSteps` | 流水线阶段步骤条 |
| `TaskLog` | `@/components/tasks/TaskLog` | 实时日志输出 |
| `TaskMetadata` | `@/components/tasks/TaskMetadata` | 任务元数据展示 |
| `AgentPipelineViz` | `@/components/tasks/AgentPipelineViz` | Agent 流水线可视化 |
| `Button` | `@/components/ui/button` | shadcn/ui 按钮 |
| `Badge` | `@/components/ui/badge` | 状态标签 |
| `Card` | `@/components/ui/card` | shadcn/ui 卡片 |

## 页面状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `task` | `useQuery` | 任务详情 |
| `isPolling` | `boolean` | 是否轮询更新 |
| `activeStep` | `number` | 当前活跃的流水线阶段 |
| `autoScroll` | `boolean` | 日志是否自动滚动 |

## API 调用

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/tasks/:id` | GET | 获取任务详情 |
| `/api/v1/tasks/:id/logs` | GET | 获取任务日志流 |
| `/api/v1/tasks/:id/cancel` | POST | 取消任务 |
| `/api/v1/tasks/:id/retry` | POST | 重试任务 |

## Agent 流水线阶段

| 阶段 | 说明 |
|------|------|
| `planner` | 任务规划 |
| `coder` | 代码生成 |
| `reviewer` | 代码审查 |
| `executor` | 执行验证 |

## 页面跳转关系

- 点击「返回任务列表」→ `/tasks`
- 任务完成 → 跳转到对应项目 `/projects/[projectId]`
