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

// ========== 成员管理类型 ==========

export type MemberRole = "admin" | "sub_admin" | "member";

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  weight: number;
  createdAt: string;
}

export interface CreateMemberRequest {
  name: string;
  role: MemberRole;
  weight: number;
}

export interface UpdateMemberRequest {
  name?: string;
  role?: MemberRole;
  weight?: number;
}

export interface MemberListResponse {
  data: Member[];
  total: number;
}

// 角色选项
export const MEMBER_ROLE_OPTIONS = [
  { value: "admin", label: "管理员" },
  { value: "sub_admin", label: "副管理员" },
  { value: "member", label: "普通员工" },
] as const;

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "管理员",
  sub_admin: "副管理员",
  member: "普通员工",
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

// 模型类型枚举
export type ModelType = "gpt-4" | "gpt-4o" | "claude-3" | "claude-3.5" | "gemini" | "default";

// 模型单价配置 (单位: 每1K token)
export interface ModelPricing {
  inputPrice: number;  // 输入单价 (每1K tokens)
  outputPrice: number; // 输出单价 (每1K tokens)
}

// 模型单价映射
export const MODEL_PRICING: Record<ModelType, ModelPricing> = {
  "gpt-4": { inputPrice: 0.03, outputPrice: 0.06 },
  "gpt-4o": { inputPrice: 0.005, outputPrice: 0.015 },
  "claude-3": { inputPrice: 0.015, outputPrice: 0.075 },
  "claude-3.5": { inputPrice: 0.003, outputPrice: 0.015 },
  "gemini": { inputPrice: 0.00125, outputPrice: 0.005 },
  "default": { inputPrice: 0.01, outputPrice: 0.03 },
};

// 成本汇总
export interface CostSummary {
  totalCost: number;
  todayCost: number;
  weekCost: number;
  monthCost: number;
  avgCostPerTask: number;
}

// Token 汇总 (扩展)
export interface TokenSummary {
  totalTokens: number;
  todayTokens: number;
  weekTokens: number;
  monthTokens: number;
  taskCount: number;
  avgTokensPerTask: number;
  // 新增成本字段
  cost?: CostSummary;
}

// 每日 Token 使用 (扩展)
export interface DailyTokenUsage {
  date: string;
  tokens: number;
  tasks: number;
  // 新增
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}

// 任务 Token 使用 (扩展)
export interface TaskTokenUsage {
  taskId: string;
  taskTitle: string;
  tokens: number;
  agents: string[];
  completedAt: string | null;
  // 新增
  modelType?: ModelType;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  cost?: number;
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
  // 新增筛选字段
  modelType?: ModelType | "all";
  status?: "pending" | "in_progress" | "completed" | "cancelled" | "all";
}

// 增强筛选类型
export interface TokenFiltersEnhanced extends TokenFilters {
  modelType: ModelType | "all";
  status: "pending" | "in_progress" | "completed" | "cancelled" | "all";
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

// ========== 版本管理类型 ==========

export type VersionStatus = "draft" | "published" | "archived";

export interface Version {
  id: string;
  version: string;
  title: string;
  description: string;
  status: VersionStatus;
  releasedAt: string | null;
  createdAt: string;
  changedFiles: string[];
  commitCount: number;
}

export interface CreateVersionRequest {
  version: string;
  title: string;
  description: string;
  status: VersionStatus;
}

export interface UpdateVersionRequest {
  version?: string;
  title?: string;
  description?: string;
  status?: VersionStatus;
}

export interface VersionListResponse {
  data: Version[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 状态选项
export const VERSION_STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "archived", label: "已归档" },
] as const;

export const VERSION_STATUS_LABELS: Record<VersionStatus, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
};

export const VERSION_STATUS_BADGE_VARIANT: Record<VersionStatus, "default" | "success" | "warning"> = {
  draft: "default",
  published: "success",
  archived: "warning",
};
