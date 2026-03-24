# 版本组件

> `components/versions/` — 版本管理相关组件

---

## VersionCard

**文件**: `VersionCard.tsx`（通过 `index.ts` 导出）

### 功能

版本卡片组件，显示版本基本信息、状态、标签、操作按钮。

### Props

```typescript
interface VersionCardProps {
  version: {
    id: string;
    name: string;
    tag?: string;
    status: 'active' | 'archived' | 'draft';
    createdAt: string;
    updatedAt: string;
    projectName?: string;
    commitHash?: string;
    screenshotCount?: number;
  };
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
}
```

### 使用示例

```tsx
import { VersionCard } from '@/components/versions';

<VersionCard
  version={version}
  onView={(id) => router.push(`/versions/${id}`)}
  onSelect={(id) => setSelectedId(id)}
/>
```

---

## VersionTimeline

**文件**: `VersionTimeline.tsx`

### 功能

版本事件时间线，展示版本的生命周期事件（创建、构建、部署、回退等）。

### Props

```typescript
interface TimelineEvent {
  id: string;
  type: 'created' | 'built' | 'deployed' | 'rolled_back' | 'archived' | 'updated';
  timestamp: string;
  actor?: string;
  details?: string;
}

interface VersionTimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
  emptyText?: string;
}
```

### 事件类型图标

| 事件类型 | 图标 | 说明 |
|---|---|---|
| `created` | Plus | 创建 |
| `built` | Hammer | 构建 |
| `deployed` | Rocket | 部署 |
| `rolled_back` | RotateCcw | 回退 |
| `archived` | Archive | 归档 |
| `updated` | Edit | 更新 |

### 使用示例

```tsx
import { VersionTimeline } from '@/components/versions';

<VersionTimeline
  events={timelineEvents}
  emptyText="暂无事件"
/>
```

---

## ChangelogPanel

**文件**: `ChangelogPanel.tsx`

### 功能

变更日志面板，显示版本的代码变更内容，支持 Markdown 渲染。

### Props

```typescript
interface ChangelogPanelProps {
  changelog?: string;
  additions?: number;
  deletions?: number;
  diffUrl?: string;
  loading?: boolean;
  onGenerate?: () => void;
  onCopy?: () => void;
}
```

### 使用示例

```tsx
import { ChangelogPanel } from '@/components/versions';

<ChangelogPanel
  changelog={version.changelog}
  additions={150}
  deletions={30}
  onGenerate={() => generateChangelog(versionId)}
/>
```

---

## BuildLogViewer

**文件**: `BuildLogViewer.tsx`

### 功能

构建日志查看器，实时显示构建输出，支持 ANSI 颜色渲染和自动滚动。

### Props

```typescript
interface BuildLogViewerProps {
  logs: string;
  status?: 'pending' | 'running' | 'success' | 'failed';
  onComplete?: () => void;
  autoScroll?: boolean;
  maxLines?: number;
}
```

### 使用示例

```tsx
import { BuildLogViewer } from '@/components/versions';

<BuildLogViewer
  logs={buildLogs}
  status={buildStatus}
  autoScroll={true}
/>
```

---

## ScreenshotGallery

**文件**: `ScreenshotGallery.tsx`

### 功能

版本截图画廊，支持缩略图预览、全屏查看、下载。

### Props

```typescript
interface Screenshot {
  id: string;
  url: string;
  thumbnailUrl?: string;
  name?: string;
  createdAt: string;
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
  loading?: boolean;
  onUpload?: () => void;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
}
```

### 使用示例

```tsx
import { ScreenshotGallery } from '@/components/versions';

<ScreenshotGallery
  screenshots={screenshots}
  onUpload={uploadScreenshot}
  onDelete={deleteScreenshot}
/>
```

---

## VersionSummaryPanel

**文件**: `VersionSummaryPanel.tsx`

### 功能

版本摘要面板，显示版本的核心统计信息（文件数、代码行数、依赖数等）。

### Props

```typescript
interface VersionSummaryPanelProps {
  summary?: {
    fileCount?: number;
    totalLines?: number;
    codeLines?: number;
    commentLines?: number;
    dependencyCount?: number;
  };
  loading?: boolean;
}
```

### 使用示例

```tsx
import { VersionSummaryPanel } from '@/components/versions';

<VersionSummaryPanel summary={version.summary} />
```

---

## BuildHistoryPanel

**文件**: `BuildHistoryPanel.tsx`

### 功能

构建历史面板，展示版本的所有构建记录。

### Props

```typescript
interface BuildRecord {
  id: string;
  version: string;
  status: 'success' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  commitHash?: string;
}

interface BuildHistoryPanelProps {
  builds: BuildRecord[];
  loading?: boolean;
  onRetry?: (id: string) => void;
  onView?: (id: string) => void;
}
```

### 使用示例

```tsx
import { BuildHistoryPanel } from '@/components/versions';

<BuildHistoryPanel
  builds={buildHistory}
  onRetry={retryBuild}
/>
```

---

## TagGroupManager

**文件**: `TagGroupManager.tsx`

### 功能

版本标签组管理器，支持创建、编辑、删除标签组。

### Props

```typescript
interface TagGroup {
  id: string;
  name: string;
  color: string;
  tags: string[];
}

interface TagGroupManagerProps {
  groups: TagGroup[];
  onCreate?: (group: Omit<TagGroup, 'id'>) => void;
  onUpdate?: (id: string, group: Partial<TagGroup>) => void;
  onDelete?: (id: string) => void;
  onAssignTag?: (groupId: string, tag: string) => void;
}
```

---

## BatchTagOperations

**文件**: `BatchTagOperations.tsx`

### 功能

批量标签操作对话框，支持批量添加/移除标签。

### Props

```typescript
interface BatchTagOperationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVersions: string[];
  onApply: (operation: 'add' | 'remove', tag: string) => void;
  availableTags?: string[];
}
```

### 使用示例

```tsx
import { BatchTagOperations } from '@/components/versions';

<BatchTagOperations
  open={showBatchDialog}
  onOpenChange={setShowBatchDialog}
  selectedVersions={selectedIds}
  onApply={handleBatchApply}
/>
```

---

## RollbackDialog

**文件**: `RollbackDialog.tsx`

### 功能

版本回退确认对话框。

### Props

```typescript
interface RollbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: {
    id: string;
    name: string;
    tag?: string;
  };
  onConfirm: () => void;
  loading?: boolean;
}
```

### 使用示例

```tsx
import { RollbackDialog } from '@/components/versions';

<RollbackDialog
  open={showRollback}
  onOpenChange={setShowRollback}
  version={version}
  onConfirm={executeRollback}
/>
```

---

## BuildTriggerDialog

**文件**: `BuildTriggerDialog.tsx`

### 功能

构建触发配置对话框。

### Props

```typescript
interface BuildTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: {
    id: string;
    name: string;
  };
  onTrigger: (config: BuildConfig) => void;
  loading?: boolean;
}

interface BuildConfig {
  branch?: string;
  env?: 'development' | 'staging' | 'production';
  withScreenshots?: boolean;
  notifyOnComplete?: boolean;
}
```

---

## 其他版本组件

| 组件 | 文件 | 说明 |
|---|---|---|
| `VersionDetails` | `VersionDetails.tsx` | 版本详细信息 |
| `VersionHistory` | `VersionHistory.tsx` | 版本历史记录 |
| `VersionPanel` | `VersionPanel.tsx` | 版本操作面板 |
| `VersionChangeLogPanel` | `VersionChangeLogPanel.tsx` | 版本变更日志面板 |
| `VersionGitTagPanel` | `VersionGitTagPanel.tsx` | Git Tag 面板 |
| `VersionTagsPanel` | `VersionTagsPanel.tsx` | 版本标签面板 |
| `VersionTagsListItem` | `VersionTagsListItem.tsx` | 标签列表项 |
| `VersionTagsDetailDrawer` | `VersionTagsDetailDrawer.tsx` | 标签详情抽屉 |
| `VersionTagsSearchBar` | `VersionTagsSearchBar.tsx` | 标签搜索栏 |
| `VersionTagsSkeleton` | `VersionTagsSkeleton.tsx` | 标签加载骨架 |
| `VersionTagsEmptyState` | `VersionTagsEmptyState.tsx` | 标签空状态 |
| `VersionSortToggle` | `VersionSortToggle.tsx` | 版本排序切换 |
| `VersionStatsOverview` | `VersionStatsOverview.tsx` | 版本统计概览 |
| `VersionSettingsDialog` | `VersionSettingsDialog.tsx` | 版本设置对话框 |
| `ChangeTimeline` | `ChangeTimeline.tsx` | 变更时间线 |
| `CopyButton` | `CopyButton.tsx` | 复制按钮 |
| `CopyToast` | `CopyToast.tsx` | 复制轻提示 |
| `DownloadStatsPanel` | `DownloadStatsPanel.tsx` | 下载统计面板 |
| `DownloadUrlVerifier` | `DownloadUrlVerifier.tsx` | 下载链接验证 |
| `MessageSelector` | `MessageSelector.tsx` | 消息选择器 |
| `RollbackHistoryPanel` | `RollbackHistoryPanel.tsx` | 回退历史面板 |
| `SemanticSearchToggle` | `SemanticSearchToggle.tsx` | 语义搜索开关 |
| `SimilarVersionsPanel` | `SimilarVersionsPanel.tsx` | 相似版本面板 |
| `SnapshotCompareDialog` | `SnapshotCompareDialog.tsx` | 快照对比对话框 |
| `TagLifecyclePanel` | `TagLifecyclePanel.tsx` | 标签生命周期面板 |
| `TaskBumpPanel` | `TaskBumpPanel.tsx` | 任务升级面板 |
| `UpgradeConfigDialog` | `UpgradeConfigDialog.tsx` | 升级配置对话框 |
| `UpgradePreviewDialog` | `UpgradePreviewDialog.tsx` | 升级预览对话框 |
| `ArtifactsPanel` | `ArtifactsPanel.tsx` | 构建产物面板 |
| `BatchDownloadDialog` | `BatchDownloadDialog.tsx` | 批量下载对话框 |
| `BuildEnvSelector` | `BuildEnvSelector.tsx` | 构建环境选择 |
| `BuildNotificationSettingsDialog` | `BuildNotificationSettingsDialog.tsx` | 构建通知设置 |
| `BuildProgress` | `BuildProgress.tsx` | 构建进度 |
| `BuildRetrySettingsDialog` | `BuildRetrySettingsDialog.tsx` | 构建重试设置 |
| `BuildSettingsMenu` | `BuildSettingsMenu.tsx` | 构建设置菜单 |
| `BumpHistoryPanel` | `BumpHistoryPanel.tsx` | 版本升级历史 |
| `BranchManager` | `BranchManager.tsx` | 分支管理器 |
