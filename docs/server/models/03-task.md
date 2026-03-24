# 任务机制模型

> 来源文件：`server/src/models/task.ts`

## Task 模型

核心任务数据模型。

```typescript
export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'suspended' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  // 标识
  taskId: string; // 唯一任务ID，格式: task_{timestamp}_{random}

  // 基本信息
  title: string; // 任务标题
  description: string; // 任务描述
  status: TaskStatus; // 当前状态
  priority: TaskPriority; // 优先级

  // 生命周期时间戳
  createdAt: string; // ISO 8601 创建时间
  updatedAt: string; // ISO 8601 更新时间
  startedAt?: string; // 开始时间
  completedAt?: string; // 完成时间

  // 执行信息
  assignedAgent?: string; // 指派的 Agent ID
  assignedSessionKey?: string; // 指派的 session
  parentTaskId?: string; // 父任务ID（用于任务链）
  subtaskIds: string[]; // 子任务ID列表

  // 依赖管理
  dependsOn: string[]; // 依赖的任务ID列表
  blockingTasks: string[]; // 被本任务阻塞的任务ID列表

  // 上下文/记忆化
  sessionId: string; // 关联的 session
  contextSnapshot?: string; // 创建时的上下文快照（JSON）
  progress: number; // 进度 0-100
  lastHeartbeat?: string; // 最近心跳时间

  // 元数据
  createdBy: string; // 创建者
  tags: string[]; // 标签
  result?: string; // 执行结果（错误信息或成功摘要）
  retryCount: number; // 重试次数
  maxRetries: number; // 最大重试次数

  // 关联的版本
  versionId?: string; // 关联的 Version ID
}
```

### TaskStatus 状态流转

```
pending → running → done
              ↘ failed → pending (retry)
              ↘ suspended
              ↘ cancelled
```

### 优先级数值映射

```typescript
export const PRIORITY_VALUES: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: '🔥 紧急',
  high: '⚡ 高',
  normal: '📋 正常',
  low: '💤 低',
};
```

## API 请求/响应类型

### 创建任务

```typescript
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignedAgent?: string;
  parentTaskId?: string;
  dependsOn?: string[];
  sessionId: string;
  contextSnapshot?: string;
  createdBy: string;
  tags?: string[];
}
```

### 更新任务

```typescript
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  result?: string;
}
```

### 查询任务

```typescript
export interface TaskQuery {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  assignedAgent?: string;
  sessionId?: string;
  parentTaskId?: string;
  includeSubtasks?: boolean;
}
```

### 分页响应

```typescript
export interface PaginatedTasks {
  list: Task[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 任务概览

```typescript
export interface TaskOverview {
  total: number;
  pending: number;
  running: number;
  done: number;
  failed: number;
  suspended: number;
}
```

## 任务依赖管理

### DAG 特性

- **dependsOn**：本任务依赖的其他任务完成后才能开始
- **blockingTasks**：本任务完成后才能继续的任务
- **parentTaskId / subtaskIds**：支持任务层级嵌套

### 依赖检查

任务开始前需满足：

1. 所有 `dependsOn` 中的任务状态为 `done`
2. 直接父任务（如果存在）已完成

## 上下文快照

`contextSnapshot` 字段存储创建任务时的完整上下文，用于：

- 断点恢复
- 任务历史追溯
- 上下文隔离
