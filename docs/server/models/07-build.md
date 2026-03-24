# 构建记录模型

> 来源文件：`server/src/models/buildRecord.ts`

## BuildRecord 模型

构建历史记录（内存 + JSON 文件持久化）。

```typescript
export type BuildRecordStatus = 'pending' | 'building' | 'success' | 'failed' | 'cancelled';
export type BuildTriggerType = 'manual' | 'auto' | 'rebuild';

export interface BuildRecord {
  // 标识
  id: string; // 格式: br_xxx
  versionId: string;
  versionName: string;
  versionNumber: string; // 语义化版本字符串

  // 构建配置
  buildCommand?: string; // 自定义构建命令（null 使用默认）
  projectPath?: string; // 显式项目路径
  projectType?: 'nextjs' | 'node' | 'react' | 'unknown';

  // 时间
  status: BuildRecordStatus;
  queuedAt: string; // 入队时间
  startedAt?: string; // 开始时间
  completedAt?: string; // 完成时间
  duration?: number; // 毫秒

  // 构建结果
  exitCode?: number;
  command?: string; // 实际执行的命令
  output?: string; // stdout（最后 100KB）
  errorOutput?: string; // stderr（最后 50KB）

  // 产物
  artifactCount?: number;
  artifactPaths?: string[]; // 产物相对路径
  artifactUrl?: string;

  // 元数据
  triggeredBy: string; // userId or 'system'
  triggerType: BuildTriggerType; // 触发方式
  buildNumber: number; // 版本内递增编号 (1, 2, 3...)
  parentBuildId?: string; // 如果是 rebuild，记录原始 build ID

  // 回滚信息
  rollbackCount: number; // 被回滚次数
  lastRollbackAt?: string; // 上次回滚时间
  lastRollbackCommit?: string; // 回滚到的 commit
  rollbackFromCommit?: string; // 回滚前的 commit

  // 打包信息
  packagePath?: string; // 打包文件绝对路径
  packageUrl?: string; // 下载 URL
  packageFormat?: 'zip' | 'tar.gz' | 'tar';
  packageSize?: number; // 字节
  packageCreatedAt?: string; // 打包时间
}
```

### BuildRecordStatus 状态

| 状态        | 说明     |
| ----------- | -------- |
| `pending`   | 等待中   |
| `building`  | 构建中   |
| `success`   | 构建成功 |
| `failed`    | 构建失败 |
| `cancelled` | 已取消   |

### BuildTriggerType 触发方式

| 类型      | 说明                            |
| --------- | ------------------------------- |
| `manual`  | 手动触发                        |
| `auto`    | 自动触发（如代码提交、Webhook） |
| `rebuild` | 重新构建（基于已有 build）      |

### projectType 项目类型

| 类型      | 检测关键词                   |
| --------- | ---------------------------- |
| `nextjs`  | next.config.js, pages/, app/ |
| `react`   | package.json + react         |
| `node`    | package.json（无前端框架）   |
| `unknown` | 未能识别                     |

## BuildRecordModel CRUD API

构建记录使用内存存储 + JSON 文件持久化。

```typescript
export function createBuildRecord(
  data: Omit<BuildRecord, 'id' | 'buildNumber' | 'queuedAt' | 'status'>
): BuildRecord;

export function getBuildRecord(id: string): BuildRecord | undefined;

export function getBuildRecordsByVersion(versionId: string, limit = 20): BuildRecord[];

export function getLatestBuildRecord(versionId: string): BuildRecord | undefined;

export function updateBuildRecord(
  id: string,
  updates: Partial<BuildRecord>
): BuildRecord | undefined;

export function getBuildRecordStats(versionId?: string): {
  total: number;
  success: number;
  failed: number;
  building: number;
  averageDuration?: number;
};

export function cancelBuildRecord(id: string): BuildRecord | undefined;
```

### 持久化存储

- 存储位置：`{cwd}/data/build_records.json`
- 自动加载：模块导入时从文件恢复
- 写入时机：每次 create/update 后自动持久化

### buildNumber 递增规则

每个版本的 buildNumber 从 1 开始递增：

```
Version v1.0.0: buildNumber = 1, 2, 3...
Version v1.1.0: buildNumber 重新从 1 开始
```

## 回滚追踪

`BuildRecord` 记录了完整的回滚历史：

```typescript
rollbackCount: number;         // 该构建被回滚到多少次
lastRollbackAt?: string;       // 上次回滚时间
lastRollbackCommit?: string;   // 回滚到的 commit
rollbackFromCommit?: string;   // 回滚前的 commit
parentBuildId?: string;       // rebuild 时记录原 build
```

### 回滚计数用途

- 标识不稳定版本
- 帮助决策是否跳过某版本
- 追踪回归问题
