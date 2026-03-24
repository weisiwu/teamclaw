# 分支与标签模型

> 来源文件：`server/src/models/branch.ts`, `server/src/models/tag.ts`

## BranchRecord 模型

Git 分支记录（SQLite 持久化）。

```typescript
export interface BranchRecord {
  id: string; // 分支唯一 ID，格式: branch_xxx
  name: string; // 分支名称，如 main, develop, feature/v2.0.0
  isMain: boolean; // 是否为主分支
  isRemote: boolean; // 是否为远程分支
  isProtected: boolean; // 是否为受保护分支
  createdAt: string; // 创建时间
  lastCommitAt: string; // 最后一次提交时间
  commitMessage: string; // 最后一次提交信息
  author: string; // 创建者
  versionId?: string; // 关联的版本 ID
  baseBranch?: string; // 基于哪个分支创建
  description?: string; // 分支描述
}
```

### 分支类型标志

| 字段          | 类型    | 说明                      |
| ------------- | ------- | ------------------------- |
| `isMain`      | boolean | 主分支（默认分支）        |
| `isRemote`    | boolean | 远程分支 vs 本地分支      |
| `isProtected` | boolean | 受保护分支不可删除/重命名 |

### BranchConfig 分支配置

```typescript
export interface BranchConfig {
  defaultBranch: string; // 默认分支名，如 "main"
  protectedBranches: string[]; // 保护分支名列表（支持 glob 模式）
  allowForcePush: boolean; // 是否允许 force push
  autoCleanupMerged: boolean; // 是否自动清理已合并分支
}
```

### 典型受保护分支

```typescript
const protectedBranches = ['main', 'master', 'develop', 'release/*'];
```

## TagRecord 模型

Git 标签记录（SQLite 持久化）。

```typescript
export interface TagRecord {
  id: string; // Tag 唯一 ID，格式: tag_xxx
  name: string; // Git Tag 名称，如 v1.0.0
  versionId: string; // 关联的版本 ID
  versionName: string; // 关联的版本号，如 v1.0.0
  message?: string; // Tag annotation 信息

  // 生命周期状态
  archived: boolean; // 是否已归档
  protected: boolean; // 是否受保护
  archivedAt?: string; // 归档时间

  // 元数据
  createdAt: string; // 创建时间
  createdBy?: string; // 创建人
  commitHash?: string; // 对应的 commit hash
  annotation?: string; // Tag annotation（版本摘要）
  source: 'auto' | 'manual'; // 创建方式：auto=系统自动，manual=手动
}
```

### TagSource 创建方式

| 值       | 说明                       |
| -------- | -------------------------- |
| `auto`   | 系统自动创建（版本发布时） |
| `manual` | 用户手动创建               |

### TagConfig 标签配置

```typescript
export interface TagConfig {
  autoTag: boolean; // 是否自动创建 tag
  tagPrefix: 'v' | 'release' | 'version' | 'custom'; // 前缀类型
  customPrefix?: string; // 自定义前缀
  tagOnStatus: string[]; // 在哪些状态时创建 tag
  maxTagAgeDays?: number; // 标签最大保留天数
  autoArchiveEnabled: boolean; // 是否自动归档旧版本 tag
}
```

### Tag 前缀示例

| prefix    | 示例                         |
| --------- | ---------------------------- |
| `v`       | v1.0.0, v2.1.0               |
| `release` | release-1.0.0, release-2.1.0 |
| `version` | version-1.0.0, version-2.1.0 |
| `custom`  | 自定义字符串                 |

## 生命周期管理

### 分支生命周期

```
创建 → 开发中 → 合并 → 清理
         ↓
      保护/归档
```

### 标签生命周期

```
创建 → 活跃使用 → 归档 → 清理
         ↓
      保护（不可删除）
```

### 自动清理规则

- `autoCleanupMerged: true` 时，合并到主分支的功能分支自动清理
- `autoArchiveEnabled: true` 时，旧版本标签自动归档
- `maxTagAgeDays` 超过天数的标签进入归档状态
