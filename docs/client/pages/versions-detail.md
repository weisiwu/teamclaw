# 版本详情

## 页面路由

```
/versions/[id]
```

其中 `[id]` 为动态路由参数，代表版本的唯一标识符。

## 页面功能描述

版本详情页面，是功能最丰富的页面之一，支持多 Tab 切换：
- **基本信息**：版本描述、自动升级配置、版本信息（创建时间/发布时间/提交数/变更文件）
- **Bump 历史**：版本号变更历史
- **产物下载**：构建产物（Artifacts）下载
- **版本回退**：执行版本回退操作
- **变更记录**：该版本的变更日志
- **版本摘要**：AI 生成的版本摘要
- **Git Tag**：Git Tag 关联和创建
- **变更时间线**：变更事件时间轴
- **截图**：关联的飞书消息截图

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `VersionHeader` | 内联 | 版本头部信息 |
| `BumpHistoryPanel` | `@/components/versions/BumpHistoryPanel`（lazy） | Bump 历史 |
| `ArtifactsPanel` | `@/components/versions/ArtifactsPanel`（lazy） | 构建产物下载 |
| `RollbackHistoryPanel` | `@/components/versions/RollbackHistoryPanel`（lazy） | 回退历史 |
| `VersionChangeLogPanel` | `@/components/versions/VersionChangeLogPanel`（lazy） | 变更日志 |
| `VersionSummaryPanel` | `@/components/versions/VersionSummaryPanel`（lazy） | 版本摘要 |
| `VersionGitTagPanel` | `@/components/versions/VersionGitTagPanel`（lazy） | Git Tag |
| `VersionTimeline` | `@/components/versions/VersionTimeline`（lazy） | 变更时间线 |
| `ScreenshotGallery` | `@/components/versions/ScreenshotGallery`（lazy） | 截图画廊 |
| `RollbackDialog` | `@/components/versions/RollbackDialog` | 回退弹窗 |
| `UpgradeConfigDialog` | `@/components/versions/UpgradeConfigDialog` | 升级配置弹窗 |
| `MessageSelector` | `@/components/versions/MessageSelector` | 飞书消息选择器 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `version` | `useState<Version \| null>` | 版本详情数据 |
| `screenshots` | `useState<VersionMessageScreenshot[]>` | 关联截图列表 |
| `changelog` | `useState<VersionChangelog \| null>` | 变更日志 |
| `activeTab` | `useState<TabKey>` | 当前 Tab |
| `rollbackDialogOpen` | `useState<boolean>` | 回退弹窗开关 |
| `upgradeConfigOpen` | `useState<boolean>` | 升级配置弹窗开关 |
| `isUpgrading` | `useState<boolean>` | 手动升级请求中 |
| `upgradeMessage` | `useState<string \| null>` | 升级操作反馈 |
| `messageSelectorOpen` | `useState<boolean>` | 消息选择器弹窗开关 |
| `linkingScreenshot` | `useState<boolean>` | 截图关联请求中 |
| `toastMsg / toastType / toastVisible` | Toast 通知状态 | 操作反馈 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `getVersion` | `@/lib/api/versions` | 获取版本详情 |
| `bumpVersion` | `@/lib/api/versions` | 手动 Bump 版本号 |
| `getVersionScreenshots` | `@/lib/api/versions` | 获取截图列表 |
| `getVersionChangelog` | `@/lib/api/versions` | 获取变更日志 |
| `linkScreenshot` | `@/lib/api/versions` | 关联截图 |
| `unlinkScreenshot` | `@/lib/api/versions` | 取消关联截图 |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/versions` | 点击返回按钮 | 面包屑导航 |
| `/projects/[id]` | 点击项目名 | 跳转项目详情 |

## 代码分割

所有 Tab 对应的面板组件均通过 `React.lazy` 懒加载，配合 `Suspense` + `PanelSkeleton` 占位。

## Toast 通知

内置 Toast 通知组件，通过 `showToast(msg, type)` 方法触发，2.5 秒后自动消失。
