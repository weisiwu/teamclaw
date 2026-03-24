# React Query Hooks 文档

> 基于 `@tanstack/react-query` 的服务端状态管理 Hooks

## 目录

- [版本管理](#版本管理)
- [构建与产物](#构建与产物)
- [分支管理](#分支管理)
- [对比与回滚](#对比与回滚)
- [标签与截图](#标签与截图)
- [版本摘要与搜索](#版本摘要与搜索)
- [版本设置与升级](#版本设置与升级)

---

## 版本管理

### `useVersions(page, pageSize, status)`

获取版本列表，支持分页和状态筛选。

```ts
import { useVersions } from 'lib/api/versionCrud';

// 示例：获取前 20 个活跃版本
function VersionList() {
  const { data, isLoading, error } = useVersions(1, 20, 'active');

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {data?.data.map(v => (
        <li key={v.id}>{v.version} — {v.status}</li>
      ))}
    </ul>
  );
}
```

**参数**：

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `page` | `number` | `1` | 页码 |
| `pageSize` | `number` | `10` | 每页条数 |
| `status` | `string` | `'all'` | 筛选：`active`/`archived`/`all` |

**返回值**（`UseQueryResult<VersionListResponse>`）：

```ts
interface VersionListResponse {
  data: Version[];      // 版本列表
  total: number;       // 总数
  page: number;         // 当前页
  pageSize: number;     // 每页大小
  totalPages: number;   // 总页数
}
```

---

### `useVersion(id)`

获取单个版本详情。

```ts
import { useVersion } from 'lib/api/versionCrud';

function VersionDetail({ id }: { id: string }) {
  const { data: version, isLoading } = useVersion(id);

  if (!version) return null;
  return (
    <div>
      <h1>{version.version}</h1>
      <p>状态: {version.status}</p>
    </div>
  );
}
```

---

### `useCreateVersion()`

创建新版本（mutation）。

```ts
import { useCreateVersion } from 'lib/api/versionCrud';

function CreateVersionForm() {
  const createVersion = useCreateVersion();

  const handleSubmit = async (formData: CreateVersionRequest) => {
    try {
      await createVersion.mutateAsync(formData);
      alert('版本创建成功！');
    } catch (err) {
      alert('创建失败: ' + err.message);
    }
  };

  return (
    <form onSubmit={e => { e.preventDefault(); handleSubmit({...}); }}>
      <button type="submit" disabled={createVersion.isPending}>
        {createVersion.isPending ? '创建中...' : '创建版本'}
      </button>
    </form>
  );
}
```

---

### `useUpdateVersion()`

更新版本信息（mutation）。

```ts
import { useUpdateVersion } from 'lib/api/versionCrud';

const updateVersion = useUpdateVersion();
await updateVersion.mutateAsync({ id: 'v_xxx', description: '更新说明' });
```

---

### `useDeleteVersion()`

删除版本（mutation，带确认）。

```ts
import { useDeleteVersion } from 'lib/api/versionCrud';

const deleteVersion = useDeleteVersion();

if (confirm('确定删除该版本？')) {
  await deleteVersion.mutateAsync('v_xxx');
}
```

---

### `useSetMainVersion()`

将指定版本设为主版本（mutation）。

```ts
import { useSetMainVersion } from 'lib/api/versionCrud';

const setMain = useSetMainVersion();
await setMain.mutateAsync('v_xxx');
```

---

## 构建与产物

### `useBuilds(versionId, limit?)`

获取指定版本的构建历史。

```ts
import { useBuilds } from 'lib/api/builds';

const { data: builds, isLoading } = useBuilds('v_xxx', 20);
```

**返回类型**：`BuildRecord[]`

```ts
interface BuildRecord {
  id: string;
  versionId: string;
  status: 'pending' | 'building' | 'success' | 'failed' | 'cancelled';
  buildNumber: number;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  exitCode?: number;
  artifactUrl?: string;
  triggeredBy: string;
  triggerType: 'manual' | 'auto' | 'rebuild';
}
```

---

### `useTriggerBuild()`

触发新构建（mutation）。

```ts
import { useTriggerBuild } from 'lib/api/builds';

const triggerBuild = useTriggerBuild();

const handleBuild = async (versionId: string) => {
  const result = await triggerBuild.mutateAsync(versionId);
  console.log('Build ID:', result.buildId);
};
```

---

### `useRebuildBuild()`

重新执行指定构建（mutation）。

```ts
import { useRebuildBuild } from 'lib/api/builds';

const rebuild = useRebuildBuild();
await rebuild.mutateAsync('build_xxx');
```

---

### `useCancelBuild()`

取消正在进行的构建（mutation）。

```ts
import { useCancelBuild } from 'lib/api/builds';

const cancelBuild = useCancelBuild();
await cancelBuild.mutateAsync('build_xxx');
```

---

### `useArtifacts(versionId)`

获取版本的产物文件列表。

```ts
import { useArtifacts } from 'lib/api/artifacts';

const { data: artifacts } = useArtifacts('v_xxx');
// artifacts: Artifact[]
```

---

### `useDownloadHistory()`

获取下载历史记录（来自 localStorage）。

```ts
import { useDownloadHistory } from 'lib/api/versionBuild';

const { records, addRecord, clearHistory, removeRecord } = useDownloadHistory();
```

---

## 分支管理

### `useBranches()`

获取所有 Git 分支列表。

```ts
import { useBranches } from 'lib/api/branches';

const { data, isLoading } = useBranches();
```

---

### `useCreateBranch()`

创建新分支（mutation）。

```ts
import { useCreateBranch } from 'lib/api/branches';

const createBranch = useCreateBranch();

await createBranch.mutateAsync({
  name: 'feature/new-feature',
  from: 'main',        // 源分支
  protected: false,
});
```

---

### `useSetBranchProtection()`

设置分支保护状态（mutation）。

```ts
import { useSetBranchProtection } from 'lib/api/branches';

const setProtection = useSetBranchProtection();

await setProtection.mutateAsync({
  name: 'main',
  protected: true,
  requiredReviewers: 2,
});
```

---

### `useCheckoutBranch()`

检出指定分支（mutation）。

```ts
import { useCheckoutBranch } from 'lib/api/branches';

const checkout = useCheckoutBranch();
await checkout.mutateAsync('feature/login');
```

---

## 对比与回滚

### `useCompareVersions(from, to, fromId?, toId?)`

对比两个版本的差异，返回文件变更和提交差异。

```ts
import { useCompareVersions } from 'lib/api/versionCompare';

const { data, isLoading } = useCompareVersions('v1.0.0', 'v1.1.0', fromId, toId);

// data.files.added    — 新增文件
// data.files.removed  — 删除文件
// data.files.modified  — 修改文件
// data.commits.onlyFrom — from 有而 to 没有的提交
```

---

### `useRollbackTargets(versionId)`

获取可回滚的目标版本/分支列表。

```ts
import { useRollbackTargets } from 'lib/api/versionRollback';

const { data } = useRollbackTargets('v_xxx');
// data.tags    — 可回滚的 Tag 列表
// data.branches — 可回滚的分支列表
```

---

### `useRollbackVersion()`

执行版本回滚（mutation）。

```ts
import { useRollbackVersion } from 'lib/api/versionRollback';

const rollback = useRollbackVersion();

await rollback.mutateAsync({
  versionId: 'v_xxx',
  targetVersion: 'v1.0.0',
  mode: 'revert',       // 'revert' | 'checkout'
  createBackup: true,
});
```

---

## 标签与截图

### `useTags()`

获取项目级标签列表。

```ts
import { useTags } from 'lib/api/tags';

const { data } = useTags();
// data: TagListResponse
```

---

### `useVersionTags(versionId)`

获取指定版本的标签。

```ts
import { useVersionTags } from 'lib/api/versionTag';

const { data: tags } = useVersionTags('v_xxx');
```

---

### `useArchiveTag()`

归档/取消归档版本标签（mutation）。

```ts
import { useArchiveTag } from 'lib/api/versionTag';

const archiveTag = useArchiveTag();
await archiveTag.mutateAsync({ tagId: 'tag_xxx', archive: true });
```

---

### `useVersionScreenshots(versionId)`

获取版本关联的飞书消息截图列表。

```ts
import { useVersionScreenshots } from 'lib/api/versionScreenshot';

const { data: screenshots } = useVersionScreenshots('v_xxx');
```

---

## 版本摘要与搜索

### `useVersionChangelog(versionId)`

获取版本的变更日志。

```ts
import { useVersionChangelog } from 'lib/api/versionSummary';

const { data } = useVersionChangelog('v_xxx');
```

---

### `useGenerateChangelog()`

使用 AI 生成变更日志（mutation）。

```ts
import { useGenerateChangelog } from 'lib/api/versionSummary';

const generateChangelog = useGenerateChangelog();

await generateChangelog.mutateAsync({
  versionId: 'v_xxx',
  style: 'conventional',  // 'conventional' | 'simple'
});
```

---

### `useSearchVersions(query, enabled?)`

搜索版本（防抖实现）。

```ts
import { useSearchVersions } from 'lib/api/versionSummary';

// enabled=false 时不发起请求（常用于防抖控制）
const { data } = useSearchVersions(searchTerm, searchTerm.length > 2);
```

---

### `useSimilarVersions(versionId, limit?)`

获取与指定版本相似的版本推荐。

```ts
import { useSimilarVersions } from 'lib/api/versionSummary';

const { data: similar } = useSimilarVersions('v_xxx', 5);
```

---

### `useVersionTimeline(versionId?)`

获取版本时间线（事件序列）。

```ts
import { useVersionTimeline } from 'lib/api/versionSummary';

const { data: events } = useVersionTimeline('v_xxx');
```

---

### `useAddTimelineEvent()`

添加时间线事件（mutation）。

```ts
import { useAddTimelineEvent } from 'lib/api/versionSummary';

const addEvent = useAddTimelineEvent();

await addEvent.mutateAsync({
  versionId: 'v_xxx',
  type: 'build',
  title: '触发构建',
  description: 'v1.2.0 构建成功',
});
```

---

## 版本设置与升级

### `useVersionSettings()`

获取版本的构建/通知设置。

```ts
import { useVersionSettings } from 'lib/api/versionSettings';

const { data: settings } = useVersionSettings('v_xxx');
// settings.buildSettings   — 构建环境变量、命令
// settings.notificationSettings — 通知渠道、触发条件
```

---

### `useUpdateVersionSettings()`

更新版本设置（mutation）。

```ts
import { useUpdateVersionSettings } from 'lib/api/versionSettings';

const updateSettings = useUpdateVersionSettings();

await updateSettings.mutateAsync({
  versionId: 'v_xxx',
  buildSettings: { retryCount: 3 },
});
```

---

### `useBumpPreview(versionId, taskType?)`

预览版本 bump 结果（semver 计算）。

```ts
import { useBumpPreview } from 'lib/api/versionSettings';

const { data: preview } = useBumpPreview('v_xxx', 'feat');
// preview.current  — 当前版本
// preview.next     — 预测下一版本（patch/minor/major）
```

---

### `useAutoBump()`

执行自动版本 bump（mutation，基于 conventional commits）。

```ts
import { useAutoBump } from 'lib/api/versionSettings';

const autoBump = useAutoBump();
const result = await autoBump.mutateAsync({
  versionId: 'v_xxx',
  type: 'auto',        // 'auto' | 'manual'
  commitMessage: 'feat: add new feature',
});
```

---

## React Query 通用模式

### 标准返回结构

所有 React Query hooks 返回标准 `UseQueryResult` 或 `UseMutationResult`：

```ts
const { data, isLoading, isError, error, refetch, isFetching } = useQueryHook(args);

// isLoading  — 首次加载中（无缓存）
// isFetching  — 任意时刻的加载中（包括后台刷新）
// isError    — 请求失败
// refetch()  — 手动刷新数据
```

### 配合 Query Client 使用

```ts
import { useQueryClient } from '@tanstack/react-query';

// 在 mutation 成功后主动刷新相关 query
const queryClient = useQueryClient();
const createVersion = useCreateVersion();

createVersion.mutate(formData, {
  onSuccess: () => {
    // 刷新版本列表
    queryClient.invalidateQueries({ queryKey: ['versions'] });
    // 或精确刷新
    queryClient.invalidateQueries({ queryKey: ['version', id] });
  },
});
```

### 配置 Query 默认行为

```ts
// app/providers.tsx (React Query Provider)
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 分钟内不重新请求
      gcTime: 1000 * 60 * 30,      // 缓存保留 30 分钟
      retry: 2,                     // 失败重试 2 次
      refetchOnWindowFocus: true,   // 窗口聚焦时刷新
    },
  },
});
```
