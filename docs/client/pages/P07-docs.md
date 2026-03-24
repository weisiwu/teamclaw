# P07 - 文档中心

**路由**: `/docs` + `/docs/[slug]`  
**文件**: `app/docs/page.tsx` + `app/docs/[slug]/page.tsx`  
**类型**: 客户端页面（`'use client'`）

---

## 功能概述

项目文档的知识库，支持按分类浏览、搜索和查看文档内容。

## 页面结构

### 列表页 (`/docs`)

```
┌─────────────────────────────────────────────────────┐
│ Header: 文档中心           [搜索...]                │
├───────────────┬─────────────────────────────────────┤
│ 分类导航       │ 文档列表                           │
│ ├─ 入门指南   │ 快速开始 — 5 分钟上手               │
│ ├─ 使用教程   │ 任务管理 — 完整功能指南             │
│ ├─ API 文档   │ API 参考 — 所有端点说明             │
│ └─ 运维指南   │ 部署配置 — 生产环境指南             │
└───────────────┴─────────────────────────────────────┘
```

### 详情页 (`/docs/[slug]`)

渲染 Markdown 格式的文档内容，支持代码高亮、目录导航。

## 组件结构

| 组件 | 来源 | 说明 |
|---|---|---|
| `DocSidebar` | `components/docs/doc-sidebar.tsx` | 分类导航侧边栏 |
| `DocList` | `components/docs/doc-list.tsx` | 文档列表 |
| `DocContent` | `components/docs/doc-content.tsx` | 文档内容渲染 |
| `DocSearch` | `components/docs/doc-search.tsx` | 文档搜索 |

## API 调用

| 端点 | 方法 | 说明 |
|---|---|---|
| `GET /api/v1/docs` | 列表 | 获取文档列表，支持 `category` 筛选 |
| `GET /api/v1/docs/:slug` | 详情 | 获取文档内容（Markdown） |

## 相关文件

- `app/docs/page.tsx` — 列表页
- `app/docs/[slug]/page.tsx` — 详情页
- `components/docs/` — 文档组件
- `lib/api/docs.ts` — 文档 API 封装
- `server/src/routes/doc.ts` — 后端路由
