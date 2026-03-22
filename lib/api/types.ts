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

// 任务评论类型
export interface TaskComment {
  id: string;
  taskId: string;
  author: string;
  content: string;
  createdAt: string;
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
export type MemberStatus = "active" | "inactive";

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  weight: number;
  status: MemberStatus;
  createdAt: string;
}

export interface CreateMemberRequest {
  name: string;
  role: MemberRole;
  weight: number;
  status: MemberStatus;
}

export interface UpdateMemberRequest {
  name?: string;
  role?: MemberRole;
  weight?: number;
  status?: MemberStatus;
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
export type CronRunStatus = "success" | "failed" | "running";

export interface CronRunLog {
  id: string;
  cronId: string;
  startTime: string;
  endTime: string | null;
  status: CronRunStatus;
  output: string;
  error: string | null;
}

export interface CronTask {
  id: string;
  name: string;
  cron: string;
  prompt: string;
  status: CronStatus;
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runs?: CronRunLog[];
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

export type VersionStatus = "draft" | "published" | "archived" | "rolled_back";
export type BuildStatus = "pending" | "building" | "success" | "failed" | "cancelled";

// 预设标签
export const VERSION_TAG_OPTIONS = [
  { value: "stable", label: "stable", color: "bg-green-100 text-green-800" },
  { value: "beta", label: "beta", color: "bg-blue-100 text-blue-800" },
  { value: "latest", label: "latest", color: "bg-purple-100 text-purple-800" },
  { value: "deprecated", label: "deprecated", color: "bg-red-100 text-red-800" },
  { value: "draft", label: "draft", color: "bg-gray-100 text-gray-800" },
] as const;

export type VersionTag = typeof VERSION_TAG_OPTIONS[number]["value"];

// ========== 版本快照类型 ==========

export interface VersionSnapshot {
  id: string;
  versionId: string;
  version: string;
  name: string;
  description: string;
  tags: VersionTag[];
  status: VersionStatus;
  buildStatus: BuildStatus;
  artifactUrl: string | null;
  gitBranch: string;
  createdAt: string;
}

// 创建快照请求
export interface CreateSnapshotRequest {
  name: string;
  description?: string;
}

// 快照列表响应
export interface SnapshotListResponse {
  data: VersionSnapshot[];
  total: number;
}

// 扩展 Version 接口添加快照
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
  isMain: boolean;
  buildStatus: BuildStatus;
  artifactUrl: string | null;
  tags: VersionTag[];
  // Git Tag 信息
  gitTag?: string;
  gitTagCreatedAt?: string;
  // 版本摘要（自动生成，可编辑）
  summary?: string;
  summaryGeneratedAt?: string;
  summaryGeneratedBy?: string; // 'AI' | 'manual' | 'system'
  // 快照列表
  snapshots?: VersionSnapshot[];
  // 变更追踪指标
  hasScreenshot?: boolean;
  hasSummary?: boolean;
  // 回退追踪字段 (iter75)
  commitHash?: string;
  rollbackCount?: number;
  lastRollbackAt?: string;
}

// 版本摘要结构
export interface VersionSummary {
  id?: string;
  versionId: string;
  title: string;
  content: string;           // overview text (backend field)
  text?: string;             // legacy alias for content
  features: string[];       // 本版本新增功能
  changes: string[];        // 变更内容 (improvements)
  fixes: string[];          // Bug 修复
  breaking: string[];       // 破坏性变更
  changes_detail?: ChangelogChange[]; // detailed change list
  generatedAt: string;
  generatedBy?: string;     // 'AI' | 'manual' | 'system'
  branchName?: string;
}

export interface CreateVersionRequest {
  version: string;
  title: string;
  description: string;
  status: VersionStatus;
  tags?: VersionTag[];
  summary?: string;
}

export interface UpdateVersionRequest {
  version?: string;
  title?: string;
  description?: string;
  status?: VersionStatus;
  tags?: VersionTag[];
  summary?: string;
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
  rolled_back: "已回退",
};

export const VERSION_STATUS_BADGE_VARIANT: Record<VersionStatus, "default" | "success" | "warning"> = {
  draft: "default",
  published: "success",
  archived: "warning",
  rolled_back: "warning",
};

export const BUILD_STATUS_LABELS: Record<BuildStatus, string> = {
  pending: "待构建",
  building: "构建中",
  success: "构建成功",
  failed: "构建失败",
  cancelled: "已取消",
};

export const BUILD_STATUS_BADGE_VARIANT: Record<BuildStatus, "default" | "info" | "success" | "error" | "warning"> = {
  pending: "default",
  building: "info",
  success: "success",
  failed: "error",
  cancelled: "warning",
};

// ============ 自动升级类型定义 ============

export type VersionBumpType = 'patch' | 'minor' | 'major';

// Tag 前缀类型
export type TagPrefix = 'v' | 'release' | 'version' | 'custom';

// 版本自动升级和 Tag 设置
export interface VersionSettings {
  autoBump: boolean;
  bumpType: VersionBumpType;
  lastBumpedAt?: string;
  // 自动 Tag 配置
  autoTag: boolean;
  tagPrefix: TagPrefix;
  customPrefix?: string; // 当 tagPrefix 为 custom 时使用
  tagOnStatus: VersionStatus[]; // 哪些状态变更时自动打 Tag
}

// Tag 创建请求
export interface CreateTagRequest {
  versionId: string;
  tagName?: string; // 自定义 tag 名称，默认使用版本号
  message?: string; // Tag 描述/注释
  force?: boolean; // 是否强制创建（覆盖已有 tag）
}

// Tag 创建结果
export interface CreateTagResponse {
  success: boolean;
  tagName?: string;
  message?: string;
  createdAt?: string;
  error?: string;
}

// 发布记录
export interface ReleaseLog {
  id: string;
  versionId: string;
  version: string;
  previousVersion: string;
  bumpType: VersionBumpType;
  releasedAt: string;
  releasedBy: string;
}

// Bump 历史记录
export type BumpHistoryTriggerType = 'task_done' | 'build_success' | 'manual';

export interface BumpHistoryRecord {
  id: string;
  versionId: string;
  versionName: string;
  previousVersion: string;
  newVersion: string;
  bumpType: VersionBumpType;
  triggerType: BumpHistoryTriggerType;
  triggerTaskId?: string;
  triggerTaskTitle?: string;
  summary?: string;
  createdBy: string;
  createdAt: string;
}

// 版本号递增请求
export interface BumpVersionRequest {
  bumpType: VersionBumpType;
}

// 递增版本的响应
export interface BumpVersionResponse {
  success: boolean;
  version?: Version;
  previousVersion?: string;
  newVersion?: string;
  bumpType?: VersionBumpType;
  gitTag?: string;
  error?: string;
}

// ========== Git 分支类型 ==========

export interface GitBranch {
  id: string;
  name: string;
  isMain: boolean;
  isRemote: boolean;
  isProtected: boolean; // 保护分支，不可轻易删除
  createdAt: string;
  lastCommitAt: string;
  commitMessage: string;
  author: string;
  versionId?: string; // 关联的版本 ID
}

export interface CreateBranchRequest {
  name: string;
  baseBranch?: string; // 基于哪个分支
  versionId?: string; // 基于哪个版本
}

export interface RenameBranchRequest {
  branchId: string;
  newName: string;
}

export interface BranchProtectionRequest {
  branchId: string;
  protected: boolean;
}

export interface BranchListResponse {
  data: GitBranch[];
  total: number;
}

// ========== 版本消息截图类型 ==========

export interface VersionMessageScreenshot {
  id: string;
  versionId: string;
  messageId: string;
  messageContent: string;
  senderName: string;
  senderAvatar?: string;
  screenshotUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
  /** 关联的分支名称 */
  branchName?: string;
}

// 创建截图关联请求
export interface LinkScreenshotRequest {
  messageId: string;
  messageContent: string;
  senderName: string;
  senderAvatar?: string;
  screenshotUrl: string;
  thumbnailUrl?: string;
  branchName?: string;
}

// 截图列表响应
export interface ScreenshotListResponse {
  data: VersionMessageScreenshot[];
  total: number;
}

// ========== 版本变更摘要类型 ==========

export interface VersionChangelog {
  id: string;
  versionId: string;
  title: string;
  content: string;
  changes: ChangelogChange[];
  generatedAt: string;
  generatedBy: string;
  /** 关联的分支名称 */
  branchName?: string;
}

export interface ChangelogChange {
  type: "feature" | "fix" | "improvement" | "breaking" | "docs" | "refactor" | "other";
  description: string;
  files?: string[];
  /** 关联的分支名称 */
  branchName?: string;
}

// 创建变更摘要请求
export interface GenerateChangelogRequest {
  versionId: string;
  title?: string;
}

// 变更摘要响应
export interface ChangelogResponse {
  data: VersionChangelog;
}

// ========== 下载记录类型 ==========

export type DownloadFormat = 'zip' | 'tar.gz' | 'apk' | 'ipa' | 'exe' | 'dmg';

export interface DownloadRecord {
  id: string;
  versionId: string;
  version: string;
  format: DownloadFormat;
  url: string;
  downloadedAt: string;
  downloadedBy?: string;
}

export interface DownloadHistoryResponse {
  data: DownloadRecord[];
  total: number;
}

export const DOWNLOAD_FORMAT_OPTIONS = [
  { value: 'zip', label: 'ZIP (.zip)', desc: '通用压缩包' },
  { value: 'tar.gz', label: 'TAR.GZ (.tar.gz)', desc: 'Linux/Unix 压缩包' },
  { value: 'apk', label: 'APK (.apk)', desc: 'Android 安装包' },
  { value: 'ipa', label: 'IPA (.ipa)', desc: 'iOS 安装包' },
  { value: 'exe', label: 'EXE (.exe)', desc: 'Windows 安装程序' },
  { value: 'dmg', label: 'DMG (.dmg)', desc: 'macOS 磁盘镜像' },
] as const;

// ========== 版本升级配置类型 ==========

export interface VersionUpgradeConfig {
  id: string;
  versionId: string;
  bumpType: 'major' | 'minor' | 'patch' | 'custom';
  customPattern?: string;
  autoTrigger: boolean;
  triggerOn: ('create' | 'publish' | 'tag' | 'manual')[];
  enablePreview: boolean;
  historyRetention: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpgradeHistoryRecord {
  id: string;
  versionId: string;
  fromVersion: string;
  toVersion: string;
  bumpType: string;
  triggeredBy: string;
  timestamp: string;
}

export interface UpgradePreview {
  currentVersion: string;
  newVersion: string;
  bumpType: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

export interface UpgradeConfigResponse {
  data: VersionUpgradeConfig;
}

export interface UpgradeHistoryResponse {
  data: UpgradeHistoryRecord[];
  total: number;
}

// ========== 版本摘要向量类型 ==========

// 版本摘要向量
export interface VersionSummaryVector {
  versionId: string;
  version: string;
  summaryText: string;
  // 简化：使用文本哈希模拟向量（实际应接入嵌入API）
  vectorHash: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// 向量搜索请求
export interface VectorSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
}

// 向量搜索结果
export interface VectorSearchResult {
  version: VersionSummaryVector;
  similarity: number;
}

// 向量存储响应
export interface VectorStoreResponse {
  success: boolean;
  vector?: VersionSummaryVector;
  error?: string;
}

// 相似版本（用于 UI 展示）
export interface SimilarVersion {
  versionId: string;
  version: string;
  title: string;
  similarity: number;
  commonTags: string[];
}

// ========== Tag 生命周期管理类型 ==========

// Git Tag 记录（用于生命周期管理）- localStorage 存储
export interface TagLifecycleRecord {
  id: string;
  name: string;
  versionId: string;
  version: string;
  archived: boolean;
  protected: boolean;
  createdAt: string;
  archivedAt?: string;
  // Git commit info (from API)
  commit?: string;
  date?: string;
  annotation?: string;
  hasRecord?: boolean;
  source?: 'auto' | 'manual';
}

// Tag 归档请求
export interface ArchiveTagRequest {
  tagId: string;
  archive?: boolean; // true = 归档, false = 取消归档
}

// Tag 保护请求
export interface TagProtectionRequest {
  tagId: string;
  protect?: boolean; // true = 保护, false = 取消保护
}

// Tag 批量操作请求
export interface BatchTagRequest {
  versionIds: string[];
  action: 'create' | 'delete' | 'archive' | 'unarchive';
  prefix?: string;
  message?: string;
}

// Tag 批量操作响应
export interface BatchTagResponse {
  success: boolean;
  results: {
    versionId: string;
    success: boolean;
    tagName?: string;
    error?: string;
  }[];
  totalSuccess: number;
  totalFailed: number;
}

// ========== GitTag 类型 ==========

export interface GitTag {
  name: string;           // tag 名
  version: string;        // 版本号（如 v1.0.0）
  commit: string;         // commit hash (short)
  commitHash: string;    // 完整 commit hash
  subject: string;       // commit message 第一行
  author: string;         // 作者名
  authorEmail: string;    // 作者邮箱
  taggerDate: string;    // Tag 创建时间 (ISO)
  projectName: string;    // 所属项目名
  status: "active" | "archived" | "protected";
  buildStatus?: BuildStatus; // 构建状态
  hasScreenshot?: boolean; // 是否有关联截图
  hasChangelog?: boolean; // 是否有变更摘要
}

export interface TagListResponse {
  data: GitTag[];
  total: number;
}

// ========== Tag 生命周期管理类型 ==========

export interface TagRecord {
  id: string;
  name: string;
  versionId: string;
  version: string;
  prefix?: string;
  message?: string;
  archived: boolean;
  protected: boolean;
  createdAt: string;
  archivedAt?: string;
  source?: 'auto' | 'manual';
}

export interface CreateTagRequest {
  versionId: string;
  tagName?: string;
  prefix?: string;
  message?: string;
  force?: boolean;
}

export interface BatchTagOperation {
  versionIds: string[];
  operation: 'create' | 'delete' | 'archive' | 'unarchive';
  options?: {
    prefix?: string;
    message?: string;
    force?: boolean;
  };
}

export interface BatchTagResult {
  success: boolean;
  results: Array<{
    versionId: string;
    success: boolean;
    tagName?: string;
    error?: string;
  }>;
}

export interface TagFilter {
  archived?: boolean;
  protected?: boolean;
  versionId?: string;
  prefix?: string;
}

// === 构建增强功能类型 ===

// 构建重试设置
export interface BuildRetrySettings {
  maxRetries: number; // 0-3
  retryDelays: number[]; // 重试延迟（秒）
}

// 构建通知设置
export type NotifyOn = 'always' | 'failure' | 'never';
export type NotifyChannel = 'email' | 'feishu';

export interface BuildNotificationSettings {
  notifyOn: NotifyOn;
  notifyChannels: NotifyChannel[];
  notifyEmails?: string[];
}

// 构建环境变量
export interface BuildEnvironment {
  name: 'development' | 'staging' | 'production';
  label: string;
  envVars: Record<string, string>;
}

// 构建环境预设
export const BUILD_ENVIRONMENTS: BuildEnvironment[] = [
  { name: 'development', label: '开发环境', envVars: { NODE_ENV: 'development', API_URL: 'https://dev.api.example.com' } },
  { name: 'staging', label: '预发布环境', envVars: { NODE_ENV: 'staging', API_URL: 'https://staging.api.example.com' } },
  { name: 'production', label: '生产环境', envVars: { NODE_ENV: 'production', API_URL: 'https://api.example.com' } },
];

// 构建增强设置（组合）
export interface BuildEnhancementSettings {
  retry: BuildRetrySettings;
  notification: BuildNotificationSettings;
  defaultEnv?: BuildEnvironment['name'];
}

export const DEFAULT_BUILD_RETRY_SETTINGS: BuildRetrySettings = {
  maxRetries: 0,
  retryDelays: [3, 6, 12],
};

export const DEFAULT_NOTIFICATION_SETTINGS: BuildNotificationSettings = {
  notifyOn: 'failure',
  notifyChannels: ['feishu'],
};

// ========== 产物下载增强 (iter-22) ==========

// 批量下载请求
export interface BatchDownloadRequest {
  versionIds: string[];
  format: string;
}

// 批量下载响应
export interface BatchDownloadResponse {
  success: boolean;
  results: Array<{
    versionId: string;
    version: string;
    url: string;
    success: boolean;
    error?: string;
  }>;
}

// 下载链接验证结果
export interface DownloadUrlVerification {
  versionId: string;
  version: string;
  url: string;
  isValid: boolean;
  fileSize?: number;
  lastModified?: string;
  error?: string;
}

// 下载统计
export interface DownloadStats {
  totalDownloads: number;
  downloadsByVersion: Array<{
    version: string;
    count: number;
  }>;
  downloadsByFormat: Array<{
    format: string;
    count: number;
  }>;
  recentTrend: Array<{
    date: string;
    count: number;
  }>;
}


// Build Artifact
export interface BuildArtifact {
  filename: string;
  versionName: string;
  env: string;
  platform: string;
  arch: string;
  size: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
}


// Version Rollback
export interface VersionRollbackRequest {
  versionId: string;
  targetVersionId: string;
  mode: "revert" | "checkout";
  createBackup: boolean;
}

export interface VersionRollbackResponse {
  success: boolean;
  rollbackId: string;
  newVersionId: string;
  message: string;
  backupCreated: boolean;
}

export interface RollbackHistoryRecord {
  id: string;
  versionId: string;
  versionName: string;
  targetRef: string;
  targetType: "tag" | "branch" | "commit";
  mode: "revert" | "checkout";
  previousRef?: string;
  newBranch?: string;
  backupCreated: boolean;
  message?: string;
  success: boolean;
  error?: string;
  performedBy?: string;
  performedAt: string;
  createdAt: string;
}

// ========== 变更时间线 ==========
export interface TimelineEvent {
  id: string;
  type: 'version_created' | 'screenshot_linked' | 'changelog_generated' | 'manual_note' | 'version_rollback' | 'bump_executed';
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
  actorId?: string;
  screenshotId?: string;
  summaryId?: string;
  screenshot?: {
    id: string;
    url: string;
    thumbnailUrl?: string;
    messageContent?: string;
    senderName?: string;
  };
  changelog?: {
    features: string[];
    fixes: string[];
    improvements: string[];
    breaking: string[];
    docs: string[];
  };
}

export interface TimelineResponse {
  code: number;
  message: string;
  data: {
    versionId: string;
    version: string;
    events: TimelineEvent[];
  };
}

// ========== 智能搜索增强 (iter-25) ==========

export interface SearchFilter {
  type?: string;         // doc type: md, pdf, txt, code, image
  dateFrom?: string;     // ISO date string
  dateTo?: string;       // ISO date string
  projectId?: string;    // project filter
  sizeMin?: number;      // min size in bytes
  sizeMax?: number;      // max size in bytes
}

export interface SearchHistoryRecord {
  id: string;
  userId: string;
  query: string;
  type: 'keyword' | 'semantic';
  filters?: SearchFilter;
  resultCount: number;
  createdAt: string;
}

export interface EnhancedSearchResult {
  type: 'doc' | 'task' | 'version';
  id: string;
  title: string;
  snippet: string;
  url: string;
  score: number;
  metadata?: Record<string, string | number | boolean>;
}

// ========== 批量下载管理 (iter-25) ==========

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface DownloadTask {
  id: string;
  userId: string;
  type: 'single' | 'batch';
  fileIds: string[];
  status: DownloadStatus;
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  zipPath?: string;
  zipName?: string;
  fileCount?: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface DownloadProgressEvent {
  taskId: string;
  status: DownloadStatus;
  progress: number;
  speed: number;
  eta: number;
  downloadedBytes?: number;
  totalBytes?: number;
  done?: boolean;
}

// ========== 文档预览 (iter-25) ==========

export interface DocPreviewConfig {
  maxFileSize: number;
  supportedTypes: string[];
  pdfRenderDpi: number;
  codePreviewLines: number;
}

export interface DocPreviewResult {
  type: 'html' | 'pdf' | 'code' | 'text' | 'unsupported' | 'image';
  content?: string;
  url?: string;
  pages?: number;
  currentPage?: number;
  size: number;
  canPreview: boolean;
  message?: string;
  filename?: string;
}
