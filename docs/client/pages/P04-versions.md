# P04 - 版本管理

**路由**: `/versions` + `/versions/[id]` + `/versions/new` + `/versions/panel` + `/versions/tags`  
**文件**: `app/versions/page.tsx` + `app/versions/[id]/page.tsx` + ...  
**类型**: 客户端页面（`'use client'`）

---

## 功能概述

版本管理是核心功能，支持版本创建、详情查看、构建、回退、对比、截图等功能。

## 页面结构

### 列表页 (`/versions`)

```
┌─────────────────────────────────────────────────────┐
│ Header: 版本管理        [+ 新建版本] [批量操作▼]   │
├─────────────────────────────────────────────────────┤
│ 统计: 总数 | Active | Archived                      │
├─────────────────────────────────────────────────────┤
│ 筛选: [项目▼] [标签▼] [状态▼] [搜索]              │
├─────────────────────────────────────────────────────┤
│ 版本列表 (卡片/表格切换视图)                         │
│ v1.0.0 | production | 2024-01-15 | [查看][操作]   │
│ v0.9.0 | staging    | 2024-01-10 | [查看][操作]   │
└─────────────────────────────────────────────────────┘
```

### 版本详情页 (`/versions/[id]`)

```
┌─────────────────────────────────────────────────────┐
│ Header: v1.0.0           [编辑] [构建] [回退]     │
├─────────────────────────────────────────────────────┤
│ 版本信息卡片                                        │
│ 项目 | 标签 | 状态 | 创建时间 | 发布人              │
├──────────────────────┬──────────────────────────────┤
│ 版本截图              │ 版本信息                    │
│ [截图1] [截图2]      │ commit hash | diff | ...    │
├──────────────────────┴──────────────────────────────┤
│ 版本对比                                            │
│ [选择版本 ▼] → v1.0.0  [对比]                     │
└─────────────────────────────────────────────────────┘
```

### 新建版本页 (`/versions/new`)

```
┌─────────────────────────────────────────────────────┐
│ Header: 新建版本                                    │
├─────────────────────────────────────────────────────┤
│ 项目选择: [选择项目 ▼]                              │
│ 版本号: [输入版本号]                                │
│ 标签: [多选: production/staging/beta]              │
│ 备注: [文本框]                                     │
│                    [取消] [创建]                    │
└─────────────────────────────────────────────────────┘
```

### 版本面板 (`/versions/panel`)

版本操作快捷面板，支持构建、发布、回退等批量操作。

### 版本标签页 (`/versions/tags`)

按标签（production/staging/beta）分类展示版本。

## 组件结构

| 组件 | 来源 | 说明 |
|---|---|---|
| `VersionTable` | `components/versions/version-table.tsx` | 版本列表表格 |
| `VersionCard` | `components/versions/version-card.tsx` | 版本卡片视图 |
| `VersionDetail` | `components/versions/version-detail.tsx` | 版本详情 |
| `VersionDiff` | `components/versions/version-diff.tsx` | 版本对比 |
| `VersionTimeline` | `components/versions/version-timeline.tsx` | 版本时间线 |

## API 调用

| 端点 | 方法 | 说明 |
|---|---|---|
| `GET /api/v1/versions` | 列表 | 支持分页、筛选 |
| `GET /api/v1/versions/:id` | 详情 | 获取版本详细信息 |
| `POST /api/v1/versions` | 创建 | 新建版本 |
| `PUT /api/v1/versions/:id` | 更新 | 更新版本信息 |
| `DELETE /api/v1/versions/:id` | 删除 | 删除版本 |
| `POST /api/v1/versions/:id/build` | 构建 | 触发构建 |
| `POST /api/v1/versions/:id/rollback` | 回退 | 回退到指定版本 |
| `GET /api/v1/versions/:id/diff` | 对比 | 获取版本差异 |

## 相关文件

- `app/versions/page.tsx` — 列表页
- `app/versions/[id]/page.tsx` — 详情页
- `app/versions/new/page.tsx` — 新建页
- `app/versions/panel/page.tsx` — 操作面板
- `app/versions/tags/page.tsx` — 标签页
- `components/versions/` — 版本相关组件
- `lib/api/versions.ts` — 版本 API（大型文件，3200+ 行）
- `lib/api/versionCrud.ts` — 版本 CRUD API（iter-20 拆分）
- `lib/api/versionBuild.ts` — 版本构建 API
