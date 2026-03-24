# 任务列表页

## 页面路由

```
/tasks
```

## 功能概述

展示所有任务的全局列表，支持按状态筛选、搜索排序，以及任务创建功能。任务来源分为「手动创建」和「消息触发」两种类型。

## 组件结构

| 组件 | 来源 | 说明 |
|------|------|------|
| `TaskCard` | `@/components/tasks/TaskCard` | 任务卡片展示 |
| `TaskFilter` | `@/components/tasks/TaskFilter` | 筛选工具栏 |
| `TaskForm` | `@/components/tasks/TaskForm` | 创建任务表单 |
| `TasksSkeleton` | `@/components/ui/projects-skeleton` | 骨架屏 |
| `EmptyState` | `@/components/ui/empty-state` | 空状态 |
| `Button` | `@/components/ui/button` | shadcn/ui 按钮 |
| `Input` | `@/components/ui/input` | shadcn/ui 输入框 |
| `Select` | `@/components/ui/select` | shadcn/ui 选择器 |

## 页面状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `statusFilter` | `TaskStatus \| 'all'` | 状态筛选 |
| `searchQuery` | `string` | 搜索关键词 |
| `sortBy` | `'createdAt' \| 'priority'` | 排序字段 |
| `isFormOpen` | `boolean` | 创建表单弹窗 |
| `selectedTask` | `Task \| null` | 选中的任务 |

## API 调用

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/tasks` | GET | 获取任务列表 |
| `/api/v1/tasks` | POST | 创建新任务 |
| `/api/v1/tasks/:id` | PUT | 更新任务状态 |

## 任务状态

| 状态 | 说明 |
|------|------|
| `pending` | 等待执行 |
| `running` | 执行中 |
| `completed` | 已完成 |
| `failed` | 执行失败 |
| `cancelled` | 已取消 |

## 页面跳转关系

- 点击任务卡片 → `/tasks/[id]`（任务详情页）
- 侧边栏「任务」→ `/tasks`
- 任务创建成功 → 刷新列表并关闭表单
