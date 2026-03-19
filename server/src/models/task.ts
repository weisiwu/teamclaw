/**
 * Task 模型定义
 * 任务机制模块 - 任务数据模型
 */

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'suspended' | 'cancelled';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  taskId: string;            // 唯一任务ID，格式: task_{timestamp}_{random}
  title: string;             // 任务标题
  description: string;        // 任务描述
  status: TaskStatus;        // 当前状态
  priority: TaskPriority;     // 优先级

  // 生命周期
  createdAt: string;         // ISO 8601
  updatedAt: string;
  startedAt?: string;         // 开始时间
  completedAt?: string;      // 完成时间

  // 执行信息
  assignedAgent?: string;    // 指派的 Agent ID
  assignedSessionKey?: string; // 指派的 session
  parentTaskId?: string;     // 父任务ID（用于任务链）
  subtaskIds: string[];      // 子任务ID列表

  // 依赖管理
  dependsOn: string[];       // 依赖的任务ID列表（必须这些任务完成后才能开始）
  blockingTasks: string[];   // 被本任务阻塞的任务ID列表

  // 上下文/记忆化
  sessionId: string;         // 关联的 session
  contextSnapshot?: string;  // 创建时的上下文快照（JSON字符串）
  progress: number;          // 进度 0-100
  lastHeartbeat?: string;    // 最近心跳时间

  // 元数据
  createdBy: string;         // 创建者
  tags: string[];            // 标签
  result?: string;           // 执行结果（错误信息或成功摘要）
  retryCount: number;        // 重试次数
  maxRetries: number;        // 最大重试次数

  // 关联的版本（用于自动 bump）
  versionId?: string;       // 关联的 Version ID
}

// API 请求/响应类型
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

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  result?: string;
}

export interface TaskQuery {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  assignedAgent?: string;
  sessionId?: string;
  parentTaskId?: string;
  includeSubtasks?: boolean;
}

export interface PaginatedTasks {
  list: Task[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TaskOverview {
  total: number;
  pending: number;
  running: number;
  done: number;
  failed: number;
  suspended: number;
}

// 优先级数值映射（用于排序）
export const PRIORITY_VALUES: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

// 优先级标签
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: '🔥 紧急',
  high: '⚡ 高',
  normal: '📋 正常',
  low: '💤 低',
};
