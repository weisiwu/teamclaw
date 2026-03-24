# P14 - 分支管理

**路由**: `/branches` + `/branches/[id]`  
**文件**: `app/branches/page.tsx` + `app/branches/[id]/page.tsx`  
**类型**: 客户端页面（`'use client'`）

---

## 功能概述

管理 Git 分支，支持查看分支列表、创建、删除、合并。

## 页面结构

```
┌─────────────────────────────────────────────────────┐
│ Header: 分支管理           [+ 新建分支]            │
├─────────────────────────────────────────────────────┤
│ 分支列表                                            │
│ 分支名 | 关联版本 | 最新提交 | 操作                │
│ ─────────────────────────────────────────────────  │
│ main   | v1.0.0 | abc123 10min ago | [查看][合并] │
│ develop| v0.9.0 | def456 2hr ago   | [查看][合并] │
│ feat/a | —      | ghi789 3days ago | [查看][删除] │
└─────────────────────────────────────────────────────┘
```

## API 调用

| 端点 | 方法 | 说明 |
|---|---|---|
| `GET /api/v1/branches` | 列表 | 获取分支列表 |
| `GET /api/v1/branches/:id` | 详情 | 获取分支详情 |
| `POST /api/v1/branches` | 创建 | 创建分支 |
| `DELETE /api/v1/branches/:id` | 删除 | 删除分支 |
| `POST /api/v1/branches/:id/merge` | 合并 | 合并分支 |

## 相关文件

- `app/branches/page.tsx` — 列表页
- `app/branches/[id]/page.tsx` — 详情页
- `components/branches/` — 分支组件
- `lib/api/branches.ts` — 分支 API
- `server/src/routes/branch.ts` — 后端路由
