# 仪表盘与下载模型

> 来源文件：`server/src/models/dashboard.ts`, `server/src/models/download.ts`, `server/src/models/tokenStats.ts`

## Dashboard 模型

### 概览统计

```typescript
export interface ProjectStats {
  total: number;
  active: number;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
}

export interface VersionStats {
  total: number;
  latest: string;
}

export interface TokenStats {
  todayUsed: number;
  weekUsed: number;
  monthUsed: number;
  estimatedCost: number;
}

export interface AgentStats {
  total: number;
  busy: number;
  idle: number;
}

export interface DashboardOverview {
  projects: ProjectStats;
  tasks: TaskStats;
  versions: VersionStats;
  tokens: TokenStats;
  agents: AgentStats;
}
```

## Download 模型

### 下载任务

```typescript
export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface DownloadTask {
  id: string; // 下载任务 ID
  userId: string; // 发起用户

  // 下载类型
  type: 'single' | 'batch'; // 单文件或批量

  // 文件列表
  fileIds: string[]; // 要下载的文件 ID 列表

  // 状态与进度
  status: DownloadStatus;
  progress: number; // 0-100

  // 传输统计
  totalBytes: number;
  downloadedBytes: number;

  // 打包信息
  zipPath?: string; // 打包后的 ZIP 路径
  zipName?: string; // ZIP 文件名

  // 时间
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}
```

### DownloadStatus 状态

| 状态          | 说明     |
| ------------- | -------- |
| `pending`     | 等待开始 |
| `downloading` | 下载中   |
| `completed`   | 已完成   |
| `failed`      | 失败     |
| `cancelled`   | 已取消   |

### 下载进度事件

```typescript
export interface DownloadProgressEvent {
  taskId: string;
  status: DownloadStatus;
  progress: number;
  speed: number; // bytes/s
  eta: number; // 剩余秒数
  downloadedBytes?: number;
  totalBytes?: number;
}
```

## DocPreview 模型

### 文档预览配置

```typescript
export interface DocPreviewConfig {
  maxFileSize: number; // 最大预览文件大小（默认 10MB）
  supportedTypes: string[]; // 支持的预览类型
  pdfRenderDpi: number; // PDF 渲染 DPI
  codePreviewLines: number; // 代码预览最大行数
}
```

### 预览结果

```typescript
export interface DocPreviewResult {
  type: 'html' | 'pdf' | 'code' | 'text' | 'unsupported' | 'image';
  content?: string; // HTML 内容或纯文本内容
  url?: string; // 原始文件 URL
  pages?: number; // PDF 总页数
  currentPage?: number; // 当前页
  size: number;
  canPreview: boolean;
  message?: string; // 预览不可用时的提示
  filename?: string;
}
```

### DocPreviewResult.type 预览类型

| 类型          | 说明       |
| ------------- | ---------- |
| `html`        | HTML 渲染  |
| `pdf`         | PDF 渲染   |
| `code`        | 代码高亮   |
| `text`        | 纯文本     |
| `image`       | 图片       |
| `unsupported` | 不支持预览 |

## TokenStats 模型

### Token 使用统计

```typescript
export type TokenLayer = 'light' | 'medium' | 'strong';

export interface TokenUsageRecord {
  id: string;
  taskId?: string; // 关联的任务 ID
  layer: TokenLayer; // 模型层级
  inputTokens: number; // 输入 token 数
  outputTokens: number; // 输出 token 数
  totalTokens: number; // 总 token 数
  cost: number; // 预估成本（元）
  timestamp: string; // ISO 8601
  model?: string; // 实际使用的模型名称
}

export interface TokenDailyStats {
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface TokenLayerStats {
  layer: TokenLayer;
  tokens: number;
  cost: number;
  percent: number;
}

export interface TokenTaskStats {
  taskId: string;
  tokens: number;
}

export interface TokenSummary {
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  byLayer: TokenLayerStats[];
}

export interface TokenTrendPoint {
  date: string;
  tokens: number;
  cost: number;
}
```

### TokenLayer 模型层级

| 层级     | 说明     | 典型模型          |
| -------- | -------- | ----------------- |
| `light`  | 轻量快速 | gpt-4o-mini       |
| `medium` | 中等能力 | gpt-4o            |
| `strong` | 最强能力 | claude-3-5-sonnet |

### TokenSummary 汇总结构

```typescript
{
  totalTokens: number; // 总 token 数
  totalCost: number; // 总成本（元）
  inputTokens: number; // 输入 token 总数
  outputTokens: number; // 输出 token 总数
  byLayer: [
    // 按层级分布
    { layer: 'light', tokens: number, cost: number, percent: number },
    { layer: 'medium', tokens: number, cost: number, percent: number },
    { layer: 'strong', tokens: number, cost: number, percent: number },
  ];
}
```
