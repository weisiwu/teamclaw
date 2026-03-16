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

// ========== 定时任务类型 ==========

export type CronStatus = "running" | "stopped";

export interface CronTask {
  id: string;
  name: string;
  cron: string;
  prompt: string;
  status: CronStatus;
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export interface CreateCronRequest {
  name: string;
  cron: string;
  prompt: string;
}

export interface UpdateCronRequest {
  name?: string;
  cron?: string;
  prompt?: string;
}

export interface CronListResponse {
  data: CronTask[];
  total: number;
}

// 状态选项
export const CRON_STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "running", label: "运行中" },
  { value: "stopped", label: "已停止" },
] as const;

export const CRON_STATUS_LABELS: Record<CronStatus, string> = {
  running: "运行中",
  stopped: "已停止",
};

export const CRON_STATUS_BADGE_VARIANT: Record<CronStatus, "success" | "default"> = {
  running: "success",
  stopped: "default",
};

// ========== Token 消费统计类型 ==========

export interface TokenSummary {
  totalTokens: number;
  todayTokens: number;
  weekTokens: number;
  monthTokens: number;
  taskCount: number;
  avgTokensPerTask: number;
}

export interface DailyTokenUsage {
  date: string;
  tokens: number;
  tasks: number;
}

export interface TaskTokenUsage {
  taskId: string;
  taskTitle: string;
  tokens: number;
  agents: string[];
  completedAt: string | null;
}

export interface TrendDataPoint {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface TokenFilters {
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface TokenSummaryResponse {
  data: TokenSummary;
}

export interface TokenDailyListResponse {
  data: DailyTokenUsage[];
  total: number;
}

export interface TokenTaskListResponse {
  data: TaskTokenUsage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TokenTrendResponse {
  data: TrendDataPoint[];
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapabilityListResponse {
  data: Capability[];
  total: number;
}

export interface UpdateCapabilityRequest {
  enabled: boolean;
}
