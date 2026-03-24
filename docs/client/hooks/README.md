# Hooks 文档总览

> 项目前端所有 Hooks 的索引与概览

## 目录

- [概览](#概览)
- [自定义 Hooks](#自定义-hooks-libhooks)
- [React Query Hooks](#react-query-hooks-libapi)
- [API 函数（无 Hook 封装）](#api-函数无-hook-封装)

---

## 概览

项目前端 Hooks 分为三类：

| 类型 | 位置 | 说明 |
|---|---|---|
| 自定义 Hooks | `lib/hooks/` | UI/业务逻辑封装，不依赖 React Query |
| React Query Hooks | `lib/api/*.ts` | 数据获取/变更的 React Query 封装 |
| API 函数 | `lib/api/*.ts` | 底层 HTTP 封装，React Query hooks 基于这些函数构建 |

**技术栈**：
- React Query (`@tanstack/react-query`) 用于服务端状态管理
- Next.js App Router 兼容（`'use client'` 声明）
- TypeScript 严格类型

---

## 自定义 Hooks (`lib/hooks/`)

| Hook | 文件 | 说明 |
|---|---|---|
| `useAuth` | `useAuth.ts` | 认证状态管理、登录检查、受保护路由 |
| `useDownloadHistory` | `useDownloadHistory.ts` | 下载历史记录（localStorage 持久化） |
| `useDownloadProgress` | `useDownloadProgress.ts` | 实时下载进度（WebSocket 订阅） |

---

## React Query Hooks (`lib/api/`)

### 按模块分类

#### 版本管理 (`versionCrud.ts`)
| Hook | 说明 |
|---|---|
| `useVersions(page, pageSize, status)` | 版本列表（分页、状态筛选） |
| `useVersion(id)` | 单个版本详情 |
| `useCreateVersion()` | 创建版本（mutation） |
| `useUpdateVersion()` | 更新版本（mutation） |
| `useDeleteVersion()` | 删除版本（mutation） |
| `useSetMainVersion()` | 设为主版本（mutation） |
| `useAddVersionTag()` | 添加版本标签（mutation） |
| `useRemoveVersionTag()` | 移除版本标签（mutation） |
| `useCreateGitTag()` | 创建 Git Tag（mutation） |
| `useCreateBranchForVersion()` | 从版本创建分支（mutation） |

#### 版本构建 (`versionBuild.ts`)
| Hook | 说明 |
|---|---|
| `useTriggerBuild()` | 触发构建（mutation） |
| `useRebuildVersion()` | 重新构建（mutation） |
| `useDownloadHistory()` | 下载历史（localStorage） |
| `useAddDownloadRecord()` | 添加下载记录（mutation） |
| `useBranches()` | 分支列表（跨文件重名） |
| `useCreateBranch()` | 创建分支（mutation） |
| `useDeleteBranch()` | 删除分支（mutation） |
| `useSetMainBranch()` | 设为主分支（mutation） |
| `useRenameBranch()` | 重命名分支（mutation） |
| `useToggleBranchProtection()` | 切换分支保护（mutation） |
| `useReleaseLogs(versionId?)` | 发布日志 |
| `useBuildArtifacts(versionName?)` | 构建产物 |
| `useVersionArtifacts(versionId, buildNumber?)` | 版本产物 |

#### 版本对比 (`versionCompare.ts`)
| Hook | 说明 |
|---|---|
| `useCompareVersions(from, to, fromId?, toId?)` | 对比两个版本的差异 |

#### 版本回滚 (`versionRollback.ts`)
| Hook | 说明 |
|---|---|
| `useRollbackTargets(versionId)` | 获取可回滚目标列表 |
| `useRollbackPreview(versionId, ref)` | 回滚预览（diff） |
| `useRollbackVersion()` | 执行回滚（mutation） |
| `useRollbackHistory(versionId?)` | 回滚历史记录 |

#### 版本截图 (`versionScreenshot.ts`)
| Hook | 说明 |
|---|---|
| `useVersionScreenshots(versionId)` | 版本关联的截图列表 |
| `useLinkScreenshot()` | 关联截图到版本（mutation） |
| `useUnlinkScreenshot()` | 取消截图关联（mutation） |

#### 版本设置 (`versionSettings.ts`)
| Hook | 说明 |
|---|---|
| `useVersionSettings()` | 版本构建/通知设置 |
| `useUpdateVersionSettings()` | 更新版本设置（mutation） |
| `useBumpPreview(versionId, taskType?)` | 版本 bump 预览 |
| `useAutoBump()` | 自动 bump（mutation） |
| `useVersionBumpHistory(versionId?, page, pageSize)` | Bump 历史记录 |
| `useTriggerTaskBump()` | 触发任务 bump（mutation） |
| `useVersionChangeStats(tagName?)` | 版本变更统计 |
| `useVersionHeadStatus(versionId?)` | 当前 HEAD 版本状态 |

#### 版本摘要 (`versionSummary.ts`)
| Hook | 说明 |
|---|---|
| `useRefreshVersionSummary()` | 刷新版本摘要（mutation） |
| `useVersionChangelog(versionId)` | 版本变更日志 |
| `useGenerateChangelog()` | 生成变更日志（mutation） |
| `useUpgradeConfig(versionId)` | 升级配置 |
| `useUpdateUpgradeConfig()` | 更新升级配置（mutation） |
| `usePreviewUpgrade()` | 升级预览（mutation） |
| `useUpgradeHistory(versionId)` | 升级历史 |
| `useVersionVectors()` | 版本向量 |
| `useSearchVersions(query, enabled?)` | 搜索版本 |
| `useSimilarVersions(versionId, limit?)` | 相似版本推荐 |
| `useStoreVersionVector()` | 存储版本向量（mutation） |
| `useVersionTimeline(versionId?)` | 版本时间线 |
| `useAddTimelineEvent()` | 添加时间线事件（mutation） |
| `useDeleteTimelineEvent()` | 删除时间线事件（mutation） |
| `useUpdateTimelineEvent()` | 更新时间线事件（mutation） |
| `useIndexVersionToChromaDb()` | 索引版本到向量库（mutation） |
| `useSearchVersionsInChroma(query, limit?)` | 向量库语义搜索 |
| `useGitChangelog(versionId?)` | Git 提交日志 |
| `useGitFileChanges(versionId?, from?, to?)` | Git 文件变更 |

#### 版本标签 (`versionTag.ts`)
| Hook | 说明 |
|---|---|
| `useAllTags()` | 所有版本标签 |
| `useVersionTags(versionId)` | 特定版本的标签 |
| `useArchiveTag()` | 归档标签（mutation） |
| `useTagProtection()` | 设置标签保护（mutation） |
| `useDeleteTag()` | 删除标签（mutation） |
| `useRenameTag()` | 重命名标签（mutation） |
| `useBatchCreateTags()` | 批量创建标签（mutation） |

#### 分支管理 (`branches.ts`)
| Hook | 说明 |
|---|---|
| `useBranches()` | 分支列表 |
| `useBranchStats()` | 分支统计 |
| `useMainBranch()` | 主分支 |
| `useBranch(id)` | 单个分支详情 |
| `useCreateBranch()` | 创建分支（mutation） |
| `useDeleteBranch()` | 删除分支（mutation） |
| `useSetMainBranch()` | 设为主分支（mutation） |
| `useRenameBranch()` | 重命名分支（mutation） |
| `useSetBranchProtection()` | 设置分支保护（mutation） |
| `useCheckoutBranch()` | 检出分支（mutation） |

#### 构建管理 (`builds.ts`)
| Hook | 说明 |
|---|---|
| `useBuilds(versionId, limit?)` | 版本构建列表 |
| `useLatestBuild(versionId)` | 最新构建记录 |
| `useBuild(buildId)` | 单个构建详情 |
| `useBuildStats(versionId)` | 构建统计 |
| `useTriggerBuild()` | 触发构建（mutation） |
| `useCancelBuild()` | 取消构建（mutation） |
| `useRebuildBuild()` | 重新构建（mutation） |
| `useRollbackBuild()` | 回滚构建（mutation） |
| `usePackageInfo(buildId, format?)` | 构建包信息 |
| `useCreatePackage()` | 创建构建包（mutation） |
| `useDeletePackage()` | 删除构建包（mutation） |

#### 产物管理 (`artifacts.ts`)
| Hook | 说明 |
|---|---|
| `useArtifacts(versionId)` | 版本产物列表 |
| `useBuildArtifacts(versionId, buildNumber)` | 构建产物列表 |

#### 标签 (`tags.ts`)
| Hook | 说明 |
|---|---|
| `useTags()` | 项目标签列表 |

---

## API 函数（无 Hook 封装）

这些是底层 API 调用函数，可直接配合 `useQuery` / `useMutation` 使用，或用于非 React 组件环境。

| 模块 | 文件 | 说明 |
|---|---|---|
| 项目管理 | `lib/api/projects.ts` | 项目 CRUD、导入、向量搜索、Git 历史 |
| 版本管理 | `lib/api/versions.ts` | 聚合导出所有 version 子模块 |
| 任务管理 | `lib/api/tasks.ts` | 任务 CRUD、评论、SLA（含状态规范化） |
| Agent 管理 | `lib/api/agents.ts` | Agent 状态、团队概览、任务分发 |
| Token 统计 | `lib/api/tokens.ts` | Token 使用统计、趋势、日报 |
| 团队成员 | `lib/api/team.ts` | 团队成员 CRUD、角色管理 |
| 分支管理 | `lib/api/branches.ts` | 分支 CRUD、保护、主分支 |
| 构建管理 | `lib/api/builds.ts` | 构建触发、历史、包管理 |
| 消息管理 | `lib/api/messages.ts` | 跨渠道消息接口 |
| 定时任务 | `lib/api/cron.ts` | Cron 任务 CRUD、启动/停止 |
| 搜索 | `lib/api/search.ts` | 文档搜索、历史、建议词 |
| 能力配置 | `lib/api/capabilities.ts` | 权限能力开关 |
| 审计日志 | `lib/api/auditLogs.ts` | 操作审计日志查询 |
| Webhook | `lib/api/webhooks.ts` | Webhook CRUD、触发历史 |
| 文档管理 | `lib/api/doc.ts` / `lib/api/docs.ts` | 文档预览、上传 |
| 下载管理 | `lib/api/download.ts` | 批量下载任务、进度订阅 |
| Agent 执行 | `lib/api/agentExecution.ts` | Agent 执行状态、心跳 |
| 管理配置 | `lib/api/adminConfig.ts` | 系统配置（LLM、安全、特许功能） |

### 全局共享类型

```ts
// lib/api/types.ts — 所有接口类型定义
// lib/api/constants.ts — 全局常量（版本状态、优先级等）
// lib/api/api-shared.ts — API 响应格式（success/error 封装）
```
