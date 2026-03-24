# 版本管理组件 (versions)

## 目录

`components/versions/` 包含 40+ 个版本相关组件，分为以下几类：

### 核心组件

| 组件              | 说明           |
| ----------------- | -------------- |
| VersionPanel      | 版本管理主面板 |
| VersionDetails    | 版本详情展示   |
| VersionHistory    | 版本历史列表   |
| VersionTimeline   | 版本时间线展示 |
| VersionSortToggle | 版本排序切换   |

### 版本标签组件

| 组件                    | 说明             |
| ----------------------- | ---------------- |
| VersionTagsPanel        | 标签管理面板     |
| VersionTagsListItem     | 标签列表项       |
| VersionTagsDetailDrawer | 标签详情抽屉     |
| VersionTagsSearchBar    | 标签搜索栏       |
| VersionTagsEmptyState   | 标签空状态       |
| VersionTagsSkeleton     | 标签骨架屏       |
| TagGroupManager         | 标签组管理       |
| TagLifecyclePanel       | 标签生命周期面板 |

### 构建相关组件

| 组件                            | 说明           |
| ------------------------------- | -------------- |
| BuildHistoryPanel               | 构建历史面板   |
| BuildLogViewer                  | 构建日志查看器 |
| BuildProgress                   | 构建进度条     |
| BuildTriggerDialog              | 触发构建对话框 |
| BuildSettingsMenu               | 构建设置菜单   |
| BuildEnvSelector                | 构建环境选择器 |
| BuildRetrySettingsDialog        | 重试设置对话框 |
| BuildNotificationSettingsDialog | 通知设置对话框 |

### 版本对比组件

| 组件                  | 说明           |
| --------------------- | -------------- |
| SnapshotCompareDialog | 快照对比对话框 |
| VersionChangeLogPanel | 变更日志面板   |
| ChangeTimeline        | 变更时间线     |
| SimilarVersionsPanel  | 相似版本面板   |
| UpgradePreviewDialog  | 升级预览对话框 |
| UpgradeConfigDialog   | 升级配置对话框 |

### 回滚相关组件

| 组件                 | 说明            |
| -------------------- | --------------- |
| RollbackDialog       | 回滚确认对话框  |
| RollbackHistoryPanel | 回滚历史面板    |
| BumpHistoryPanel     | 版本 bumps 历史 |

### 其他业务组件

| 组件                  | 说明           |
| --------------------- | -------------- |
| VersionStatsOverview  | 版本统计概览   |
| VersionSummaryPanel   | 版本摘要面板   |
| VersionGitTagPanel    | Git Tag 面板   |
| VersionSettingsDialog | 版本设置对话框 |
| ArtifactsPanel        | 构建产物面板   |
| ChangelogPanel        | 变更日志面板   |
| ScreenshotGallery     | 截图画廊       |
| CopyButton            | 复制按钮       |
| CopyToast             | 复制提示       |
| DownloadStatsPanel    | 下载统计面板   |
| DownloadUrlVerifier   | 下载链接验证   |
| BatchDownloadDialog   | 批量下载对话框 |
| BatchTagOperations    | 批量标签操作   |
| SemanticSearchToggle  | 语义搜索开关   |
| MessageSelector       | 消息选择器     |
| TaskBumpPanel         | 任务跳转面板   |
| BranchManager         | 分支管理器     |

### 入口文件

```tsx
// 批量引入
export * from './versions';
```
