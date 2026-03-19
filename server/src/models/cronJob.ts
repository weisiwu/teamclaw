/**
 * CronJob 模型定义
 * 后台管理平台 - 定时任务数据模型
 */

export type CronJobStatus = 'active' | 'paused' | 'running' | 'failed';

export interface CronJob {
  id: string;              // 唯一标识，格式: cron_{timestamp}_{random}
  name: string;            // 任务名称
  cron: string;            // Cron 表达式（5位）
  prompt: string;          // 触发时执行的 Prompt
  status: CronJobStatus;   // 当前状态
  createdAt: string;       // ISO 8601
  updatedAt: string;
  createdBy: string;       // 创建者
  lastRunAt?: string;     // 上次运行时间
  lastRunStatus?: 'success' | 'failed' | 'running';
  lastRunOutput?: string; // 上次运行输出摘要
  lastRunError?: string;   // 上次运行错误
  nextRunAt?: string;     // 下次运行时间
  runCount: number;        // 累计运行次数
  successCount: number;    // 成功次数
  failCount: number;       // 失败次数
  enabled: boolean;         // 是否启用
}

export interface CronRun {
  id: string;              // 唯一标识，格式: run_{timestamp}_{random}
  cronJobId: string;       // 关联的定时任务ID
  startTime: string;       // 开始时间
  endTime?: string;        // 结束时间
  status: 'running' | 'success' | 'failed';
  output?: string;         // 执行输出摘要
  error?: string;          // 错误信息
  durationMs?: number;     // 执行耗时(毫秒)
}

export interface CreateCronJobRequest {
  name: string;
  cron: string;
  prompt: string;
  enabled?: boolean;
}

export interface UpdateCronJobRequest {
  name?: string;
  cron?: string;
  prompt?: string;
  enabled?: boolean;
}

export interface CronJobListResponse {
  list: CronJob[];
  total: number;
}
