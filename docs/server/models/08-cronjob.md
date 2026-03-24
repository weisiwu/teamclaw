# 定时任务模型

> 来源文件：`server/src/models/cronJob.ts`

## CronJob 模型

定时任务配置。

```typescript
export type CronJobStatus = 'active' | 'paused' | 'running' | 'failed';

export interface CronJob {
  // 标识
  id: string; // 格式: cron_{timestamp}_{random}
  name: string; // 任务名称

  // 执行配置
  cron: string; // Cron 表达式（5位）
  prompt: string; // 触发时执行的 Prompt

  // 状态
  status: CronJobStatus;
  enabled: boolean; // 是否启用

  // 生命周期
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  createdBy: string; // 创建者

  // 运行统计
  lastRunAt?: string; // 上次运行时间
  lastRunStatus?: 'success' | 'failed' | 'running';
  lastRunOutput?: string; // 上次运行输出摘要
  lastRunError?: string; // 上次运行错误
  nextRunAt?: string; // 下次运行时间
  runCount: number; // 累计运行次数
  successCount: number; // 成功次数
  failCount: number; // 失败次数
}
```

### CronJobStatus 状态

| 状态      | 说明                       |
| --------- | -------------------------- |
| `active`  | 运行中（定时触发）         |
| `paused`  | 已暂停                     |
| `running` | 正在执行                   |
| `failed`  | 异常（连续失败后自动标记） |

### Cron 表达式格式

使用 5 位 cron 表达式（秒级）：

```
┌───────────── 秒 (0-59)
│ ┌───────────── 分钟 (0-59)
│ │ ┌───────────── 小时 (0-23)
│ │ │ ┌───────────── 日 (1-31)
│ │ │ │ ┌───────────── 月 (1-12)
│ │ │ │ │ ┌───────────── 星期 (0-6, 0=周日)
│ │ │ │ │ │
* * * * * *
```

### 常用示例

| 表达式          | 说明          |
| --------------- | ------------- |
| `0 * * * * *`   | 每小时整点    |
| `0 0 * * * *`   | 每天午夜      |
| `0 0 9 * * *`   | 每天上午 9 点 |
| `*/15 * * * *`  | 每 15 分钟    |
| `0 0 * * * 1-5` | 工作日午夜    |

## CronRun 模型

单次执行记录。

```typescript
export interface CronRun {
  id: string; // 格式: run_{timestamp}_{random}
  cronJobId: string; // 关联的定时任务ID
  startTime: string; // 开始时间
  endTime?: string; // 结束时间
  status: 'running' | 'success' | 'failed';
  output?: string; // 执行输出摘要
  error?: string; // 错误信息
  durationMs?: number; // 执行耗时（毫秒）
}
```

## API 请求类型

```typescript
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
```

## 执行统计

### 可靠性指标

```typescript
const reliability = cronJob.successCount / cronJob.runCount;
```

### 失败告警

当 `failCount` 连续增加时，系统可自动：

1. 暂停任务（`status: 'failed'`）
2. 发送通知
3. 记录错误详情
