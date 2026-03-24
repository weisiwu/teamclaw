# 版本管理模型

> 来源文件：`server/src/models/version.ts`, `server/src/models/versionSummary.ts`, `server/src/models/versionChangeEvent.ts`, `server/src/models/rollbackRecord.ts`

## Version 模型

版本基本信息。

```typescript
export type VersionBumpType = 'patch' | 'minor' | 'major';

export interface Version {
  id: string;

  // 版本标识
  version: string; // 语义化版本号，如 "1.2.3"
  title: string; // 版本标题
  description: string; // 版本描述
  status: 'draft' | 'published' | 'archived';
  tags: string[]; // 关联标签列表
  gitTag?: string; // Git Tag 名称
  gitTagCreatedAt?: string; // Tag 创建时间

  // 构建信息
  buildStatus: 'pending' | 'building' | 'success' | 'failed';
  artifactUrl?: string; // 构建产物 URL
  releasedAt?: string; // 发布时间

  // 元数据
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  isMain: boolean; // 是否为主版本
  commitCount: number; // 提交数量
  changedFiles: string[]; // 变更文件列表

  // 摘要信息
  hasScreenshot?: boolean; // 是否有截图
  hasSummary?: boolean; // 是否有变更摘要
  summary?: string; // 变更摘要内容
  summaryGeneratedAt?: string; // 摘要生成时间
  summaryGeneratedBy?: string; // 摘要生成者
}
```

### status 状态

| 状态        | 说明           |
| ----------- | -------------- |
| `draft`     | 草稿，尚未发布 |
| `published` | 已发布         |
| `archived`  | 已归档         |

### buildStatus 状态

| 状态       | 说明     |
| ---------- | -------- |
| `pending`  | 等待构建 |
| `building` | 构建中   |
| `success`  | 构建成功 |
| `failed`   | 构建失败 |

### VersionBumpType 语义化版本

| 类型    | 说明       | 示例          |
| ------- | ---------- | ------------- |
| `major` | 主版本号   | 1.0.0 → 2.0.0 |
| `minor` | 次版本号   | 1.0.0 → 1.1.0 |
| `patch` | 补丁版本号 | 1.0.0 → 1.0.1 |

## VersionSettings 模型

版本自动管理配置。

```typescript
export interface VersionSettings {
  autoBump: boolean; // 是否自动版本递增
  bumpType: VersionBumpType; // 默认递增类型
  autoTag: boolean; // 是否自动创建 Tag
  tagPrefix: 'v' | 'release' | 'version' | 'custom';
  customPrefix?: string; // 自定义前缀
  tagOnStatus: string[]; // 在哪些状态时创建 Tag
  lastBumpedAt?: string; // 上次递增时间
}
```

## VersionSummary 模型

版本变更摘要（PostgreSQL 持久化）。

```typescript
export interface VersionChange {
  type: 'feature' | 'fix' | 'improvement' | 'breaking' | 'docs' | 'refactor' | 'other';
  description: string;
  files?: string[];
}

export interface VersionSummary {
  id: string;
  versionId: string;
  title: string;
  content: string; // 摘要文本内容

  // 分类变更
  features: string[]; // 新功能
  fixes: string[]; // Bug 修复
  changes: string[]; // 其他变更
  breaking: string[]; // 破坏性变更
  changes_detail: VersionChange[]; // 详细变更列表

  // 元数据
  generatedAt: string; // 生成时间
  generatedBy: string; // 生成者（AI/system/用户）
  branchName?: string; // 关联分支
}
```

### VersionSummaryModel API

```typescript
export const VersionSummaryModel = {
  async create(data: Omit<VersionSummary, 'id' | 'generatedAt'>): Promise<VersionSummary>,
  async findById(id: string): Promise<VersionSummary | undefined>,
  async findByVersionId(versionId: string): Promise<VersionSummary | undefined>,
  async findAll(): Promise<VersionSummary[]>,
  async update(versionId: string, data: {...}): Promise<VersionSummary | undefined>,
  async upsert(data: {...}): Promise<VersionSummary>,
  async delete(versionId: string): Promise<boolean>,
};
```

## VersionChangeEvent 模型

版本变更事件记录（SQLite 持久化）。

```typescript
export type ChangeEventType =
  | 'version_created'
  | 'version_published'
  | 'version_rollback'
  | 'version_archived'
  | 'screenshot_linked'
  | 'screenshot_removed'
  | 'changelog_generated'
  | 'changelog_updated'
  | 'bump_executed'
  | 'tag_created'
  | 'build_triggered'
  | 'build_completed'
  | 'manual_note';

export interface VersionChangeEvent {
  id: string;
  versionId: string;
  eventType: ChangeEventType;
  title: string;
  description?: string;
  actor: string; // 操作者名称
  actorId?: string; // 操作者 ID
  screenshotId?: string; // 关联截图 ID
  changelogId?: string; // 关联变更日志 ID
  buildId?: string; // 关联构建 ID
  taskId?: string; // 关联任务 ID
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO 8601
}
```

### VersionChangeEventModel API

```typescript
export const VersionChangeEventModel = {
  create(data: {...}): VersionChangeEvent,
  findById(id: string): VersionChangeEvent | undefined,
  findByVersionId(versionId: string): VersionChangeEvent[],
  findByVersionIdWithScreenshots(versionId: string): VersionChangeEvent[],  // 含截图信息
  delete(id: string): boolean,
  countByVersionId(versionId: string): number,
};
```

## RollbackRecord 模型

版本回退记录（SQLite 持久化）。

```typescript
export interface RollbackRecord {
  id: string; // 唯一 ID，格式: rb_xxx
  versionId: string; // 关联的版本 ID
  versionName: string; // 版本号，如 "v1.0.0"
  targetRef: string; // 回退目标（tag/branch/commit）
  targetType: 'tag' | 'branch' | 'commit';
  mode: 'revert' | 'checkout';
  previousRef?: string; // 回退前的引用
  newBranch?: string; // 如果创建了新分支，记录分支名
  backupCreated: boolean; // 是否创建了备份分支
  message?: string; // 回退说明
  success: boolean; // 是否成功
  error?: string; // 失败原因
  performedBy?: string; // 执行人
  performedAt: string; // 执行时间
  createdAt: string; // 创建时间
}
```

### RollbackRecordModel API

```typescript
export const RollbackRecordModel = {
  findByVersionId(versionId: string): RollbackRecord[],
  findById(id: string): RollbackRecord | null,
  create(data: Omit<RollbackRecord, 'createdAt'>): RollbackRecord,
  findRecent(limit = 20): RollbackRecord[],
};
```
