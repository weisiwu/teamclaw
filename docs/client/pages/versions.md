# 版本列表

## 页面路由

```
/versions
```

## 页面功能描述

版本列表页面，展示所有版本记录，支持：
- 版本卡片/列表展示（版本号、标题、状态、构建状态）
- 按状态筛选（草稿/发布/归档）
- 按项目/分支筛选
- 版本对比（选择两个版本进行 diff）
- 创建新版本
- 点击进入版本详情

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `VersionCard` | `@/components/versions/VersionCard` | 单个版本卡片 |
| `VersionTable` | `@/components/versions/VersionTable` | 表格视图 |
| `VersionCompare` | `@/components/versions/VersionCompare` | 版本对比视图 |
| `VersionFilters` | `@/components/versions/VersionFilters` | 筛选栏 |
| `CreateVersionDialog` | `@/components/versions/CreateVersionDialog` | 创建版本弹窗 |
| `Button` | `@/components/ui/button` | 操作按钮 |
| `Badge` | `@/components/ui/badge` | 状态徽章 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `versions` | `useState<Version[]>` | 版本列表数据 |
| `filteredVersions` | `useMemo<Version[]>` | 过滤后版本 |
| `statusFilter` | `useState<VersionStatus>` | 状态筛选 |
| `projectFilter` | `useState<string>` | 项目筛选 |
| `compareIds` | `useState<[string, string] \| null>` | 待对比的两个版本 ID |
| `viewMode` | `useState<'cards' \| 'table'>` | 视图模式 |
| `isLoading` | `useState<boolean>` | 加载状态 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `useVersions` | `@/lib/api/versions` | 获取版本列表（React Query） |
| `getVersions` | `@/lib/api/versions` | 获取版本列表 |
| `createVersion` | `@/lib/api/versions` | 创建版本 |
| `compareVersions` | `@/lib/api/versions` | 对比两个版本 |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/versions/[id]` | 点击版本卡片 | 版本 ID |
| `/versions/new` | 点击"新建版本"按钮 | 快捷操作 |
| `/versions/panel` | 点击"面板视图"入口 | 切换视图 |
| `/versions/tags` | 点击"标签视图"入口 | 切换视图 |

## 版本状态

| 状态值 | 含义 | 徽章颜色 |
|--------|------|---------|
| `draft` | 草稿 | 灰色 |
| `published` | 已发布 | 绿色 |
| `archived` | 已归档 | 蓝色 |
| `deprecated` | 已弃用 | 红色 |

## 构建状态

| 状态值 | 含义 |
|--------|------|
| `success` | 构建成功 |
| `failed` | 构建失败 |
| `building` | 构建中 |
| `pending` | 待构建 |
