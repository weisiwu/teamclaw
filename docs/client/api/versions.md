# 版本管理 API

> `lib/api/versions.ts`（主模块）  
> `lib/api/versionCrud.ts`（CRUD 拆分）  
> `lib/api/versionBuild.ts`（构建）  
> `lib/api/versionCompare.ts`（对比）  
> `lib/api/versionRollback.ts`（回退）  
> `lib/api/versionScreenshot.ts`（截图）  
> `lib/api/versionSummary.ts`（摘要）  
> `lib/api/versionTag.ts`（标签）  
> `lib/api/versionSettings.ts`（设置）

---

## 功能说明

版本管理是核心功能模块，涵盖版本的全生命周期管理。

---

## 版本 CRUD (`versionCrud.ts`)

### fetchVersions

获取版本列表。

```typescript
async function fetchVersions(params?: {
  page?: number;
  pageSize?: number;
  projectId?: string;
  tag?: string;
  status?: 'active' | 'archived' | 'draft';
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}): Promise<VersionListResponse>
```

### fetchVersionById

获取版本详情。

```typescript
async function fetchVersionById(id: string): Promise<Version>
```

### createVersion

创建新版本。

```typescript
async function createVersion(data: CreateVersionData): Promise<Version>
```

### updateVersion

更新版本信息。

```typescript
async function updateVersion(id: string, data: UpdateVersionData): Promise<Version>
```

### deleteVersion

删除版本。

```typescript
async function deleteVersion(id: string): Promise<void>
```

---

## 版本构建 (`versionBuild.ts`)

### triggerBuild

触发版本构建。

```typescript
async function triggerBuild(versionId: string, config?: {
  branch?: string;
  env?: 'development' | 'staging' | 'production';
  withScreenshots?: boolean;
  notifyOnComplete?: boolean;
}): Promise<Build>
```

### fetchBuildStatus

获取构建状态。

```typescript
async function fetchBuildStatus(buildId: string): Promise<BuildStatus>
```

### fetchBuildLogs

获取构建日志。

```typescript
async function fetchBuildLogs(buildId: string): Promise<string>
```

### retryBuild

重试构建。

```typescript
async function retryBuild(buildId: string): Promise<Build>
```

---

## 版本对比 (`versionCompare.ts`)

### compareVersions

对比两个版本。

```typescript
async function compareVersions(
  sourceId: string,
  targetId: string
): Promise<VersionDiff>
```

### fetchChangelog

获取版本变更日志。

```typescript
async function fetchChangelog(versionId: string): Promise<Changelog>
```

### generateChangelog

生成变更日志。

```typescript
async function generateChangelog(versionId: string): Promise<Changelog>
```

---

## 版本回退 (`versionRollback.ts`)

### fetchRollbackTargets

获取可回退版本列表。

```typescript
async function fetchRollbackTargets(versionId: string): Promise<RollbackTarget[]>
```

### previewRollback

预览回退影响。

```typescript
async function previewRollback(versionId: string, targetVersionId: string): Promise<RollbackPreview>
```

### executeRollback

执行回退。

```typescript
async function executeRollback(
  versionId: string,
  targetVersionId: string
): Promise<RollbackResult>
```

---

## 版本截图 (`versionScreenshot.ts`)

### fetchScreenshots

获取版本截图列表。

```typescript
async function fetchScreenshots(versionId: string): Promise<Screenshot[]>
```

### uploadScreenshot

上传截图。

```typescript
async function uploadScreenshot(
  versionId: string,
  file: File
): Promise<Screenshot>
```

### deleteScreenshot

删除截图。

```typescript
async function deleteScreenshot(screenshotId: string): Promise<void>
```

### downloadScreenshot

下载截图。

```typescript
async function downloadScreenshot(screenshotId: string): Promise<Blob>
```

---

## 版本标签 (`versionTag.ts`)

### fetchVersionTags

获取版本标签。

```typescript
async function fetchVersionTags(versionId: string): Promise<VersionTag[]>
```

### addVersionTag

添加版本标签。

```typescript
async function addVersionTag(versionId: string, tag: string): Promise<VersionTag>
```

### removeVersionTag

移除版本标签。

```typescript
async function removeVersionTag(versionId: string, tag: string): Promise<void>
```

---

## 类型定义

```typescript
interface Version {
  id: string;
  name: string;
  projectId: string;
  projectName?: string;
  tag?: string;
  status: 'active' | 'archived' | 'draft';
  commitHash?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  buildStatus?: 'pending' | 'running' | 'success' | 'failed';
  changelog?: string;
  summary?: VersionSummary;
  screenshotCount?: number;
  artifactCount?: number;
}

interface VersionSummary {
  fileCount: number;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  dependencyCount: number;
}

interface VersionDiff {
  sourceId: string;
  targetId: string;
  additions: number;
  deletions: number;
  files: Array<{
    path: string;
    status: 'added' | 'deleted' | 'modified';
    additions: number;
    deletions: number;
  }>;
}

interface Changelog {
  versionId: string;
  content: string;
  additions: number;
  deletions: number;
  commits: Commit[];
}

interface Build {
  id: string;
  versionId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  logs?: string;
  artifacts?: BuildArtifact[];
}

interface Screenshot {
  id: string;
  versionId: string;
  url: string;
  thumbnailUrl?: string;
  name?: string;
  size?: number;
  createdAt: string;
}

interface VersionTag {
  name: string;
  color?: string;
  createdAt: string;
}

interface RollbackTarget {
  id: string;
  name: string;
  commitHash: string;
  createdAt: string;
  isProtected: boolean;
}

interface CreateVersionData {
  projectId: string;
  name: string;
  tag?: string;
  commitHash?: string;
  description?: string;
}
```

---

## React Query 使用示例

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchVersions,
  fetchVersionById,
  createVersion,
  triggerBuild,
  compareVersions,
} from '@/lib/api/versions';

// 版本列表
const { data, isLoading } = useQuery({
  queryKey: ['versions', filters],
  queryFn: () => fetchVersions(filters),
});

// 版本详情
const { data: version } = useQuery({
  queryKey: ['versions', versionId],
  queryFn: () => fetchVersionById(versionId),
  enabled: !!versionId,
});

// 创建版本
const createMutation = useMutation({
  mutationFn: createVersion,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['versions'] });
  },
});

// 触发构建
const buildMutation = useMutation({
  mutationFn: ({ versionId, config }) => triggerBuild(versionId, config),
  onSuccess: (build) => {
    // 开始轮询构建状态
    startBuildPolling(build.id);
  },
});

// 版本对比
const { data: diff } = useQuery({
  queryKey: ['versions', sourceId, 'compare', targetId],
  queryFn: () => compareVersions(sourceId, targetId),
  enabled: !!sourceId && !!targetId,
});
```

---

## 相关文件

- `lib/api/versions.ts` — 主模块
- `lib/api/versionCrud.ts` — CRUD
- `lib/api/versionBuild.ts` — 构建
- `lib/api/versionCompare.ts` — 对比
- `lib/api/versionRollback.ts` — 回退
- `lib/api/versionScreenshot.ts` — 截图
- `lib/api/versionSummary.ts` — 摘要
- `lib/api/versionTag.ts` — 标签
- `lib/api/versionSettings.ts` — 设置
- `app/api/v1/versions/` — Next.js API Routes
- `server/src/routes/version.ts` — 后端路由
