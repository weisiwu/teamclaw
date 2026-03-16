// 任务类型定义
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  creator: string;
  createdAt: string;
  completedAt: string | null;
  duration: number | null;
  changes: string;
  changedFiles: string[];
  commits: string[];
  agents: string[];
  tokenCost: number;
  tags: string[];
}

// API 请求类型
export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: TaskPriority;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export interface TaskFilters {
  search?: string;
  status?: TaskStatus | "all";
  priority?: string; // "all" | "10" | "8" | "5" | "low"
  page?: number;
  pageSize?: number;
}

export interface TaskListResponse {
  data: Task[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TaskDetailResponse {
  data: Task;
}

// API 错误类型
export interface ApiError {
  code: string;
  message: string;
}

// 状态选项
export const TASK_STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待处理" },
  { value: "in_progress", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
] as const;

export const TASK_PRIORITY_OPTIONS = [
  { value: "all", label: "全部优先级" },
  { value: "10", label: "紧急 (10)" },
  { value: "8", label: "高 (8-9)" },
  { value: "5", label: "中 (5-7)" },
  { value: "low", label: "低 (1-4)" },
] as const;

// 状态徽章映射
export const STATUS_BADGE_VARIANT: Record<TaskStatus, "default" | "success" | "warning" | "error" | "info"> = {
  pending: "default",
  in_progress: "info",
  completed: "success",
  cancelled: "error",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "待处理",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};
