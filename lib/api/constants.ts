// API 运行时常量 — 从 types.ts 分离

import type {
  TaskStatus,
  MemberRole,
  CronStatus,
  ModelType,
  ModelPricing,
  VersionStatus,
  BuildStatus,
  ArtifactFormat,
  BuildRetrySettings,
  BuildNotificationSettings,
  BuildEnvironment,
} from './types';

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

export const MODEL_PRICING: Record<ModelType, ModelPricing> = {
  "gpt-4": { inputPrice: 0.03, outputPrice: 0.06 },
  "gpt-4o": { inputPrice: 0.005, outputPrice: 0.015 },
  "claude-3": { inputPrice: 0.015, outputPrice: 0.075 },
  "claude-3.5": { inputPrice: 0.003, outputPrice: 0.015 },
  "gemini": { inputPrice: 0.00125, outputPrice: 0.005 },
  "default": { inputPrice: 0.01, outputPrice: 0.03 },
};

export const VERSION_TAG_OPTIONS = [
  { value: "stable", label: "stable", color: "bg-green-100 text-green-800" },
  { value: "beta", label: "beta", color: "bg-blue-100 text-blue-800" },
  { value: "latest", label: "latest", color: "bg-purple-100 text-purple-800" },
  { value: "deprecated", label: "deprecated", color: "bg-red-100 text-red-800" },
  { value: "draft", label: "draft", color: "bg-gray-100 text-gray-800" },
] as const;

export const ARTIFACT_FORMAT_LABELS: Record<ArtifactFormat, string> = {
  zip: 'ZIP 压缩包',
  apk: 'Android 安装包',
  exe: 'Windows 安装包',
  dmg: 'macOS 安装包',
  pkg: 'macOS 安装包',
  ipa: 'iOS 安装包',
  'tar.gz': 'TAR.GZ 压缩包',
  other: '其他文件',
};

export const ARTIFACT_FORMAT_ICONS: Record<ArtifactFormat, string> = {
  zip: '📦',
  apk: '📱',
  exe: '🖥️',
  dmg: '🍎',
  pkg: '🍎',
  ipa: '📱',
  'tar.gz': '📦',
  other: '📄',
};

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

export const DOWNLOAD_FORMAT_OPTIONS = [
  { value: 'zip', label: 'ZIP (.zip)', desc: '通用压缩包' },
  { value: 'tar.gz', label: 'TAR.GZ (.tar.gz)', desc: 'Linux/Unix 压缩包' },
  { value: 'apk', label: 'APK (.apk)', desc: 'Android 安装包' },
  { value: 'ipa', label: 'IPA (.ipa)', desc: 'iOS 安装包' },
  { value: 'exe', label: 'EXE (.exe)', desc: 'Windows 安装程序' },
  { value: 'dmg', label: 'DMG (.dmg)', desc: 'macOS 磁盘镜像' },
] as const;

export const BUILD_ENVIRONMENTS: BuildEnvironment[] = [
  { name: 'development', label: '开发环境', envVars: { NODE_ENV: 'development', API_URL: 'https://dev.api.example.com' } },
  { name: 'staging', label: '预发布环境', envVars: { NODE_ENV: 'staging', API_URL: 'https://staging.api.example.com' } },
  { name: 'production', label: '生产环境', envVars: { NODE_ENV: 'production', API_URL: 'https://api.example.com' } },
];

export const DEFAULT_BUILD_RETRY_SETTINGS: BuildRetrySettings = {
  maxRetries: 0,
  retryDelays: [3, 6, 12],
};

export const DEFAULT_NOTIFICATION_SETTINGS: BuildNotificationSettings = {
  notifyOn: 'failure',
  notifyChannels: ['feishu'],
};

