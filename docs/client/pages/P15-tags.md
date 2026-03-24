# P15 - 标签管理

**路由**: `/tags` + `/tags/[name]` + `/tags/new`  
**文件**: `app/tags/page.tsx` + `app/tags/[name]/page.tsx` + `app/tags/new/page.tsx`  
**类型**: 客户端页面（`'use client'`）

---

## 功能概述

管理版本标签，如 `production`、`staging`、`beta` 等。

## 标签类型

| 标签 | 说明 | 颜色 |
|---|---|---|
| `production` | 生产环境 | 绿色 |
| `staging` | 预发布环境 | 蓝色 |
| `beta` | 测试版 | 橙色 |
| `alpha` | 开发版 | 灰色 |

## 页面结构

```
┌─────────────────────────────────────────────────────┐
│ Header: 标签管理           [+ 新建标签]             │
├─────────────────────────────────────────────────────┤
│ production (12)  │ staging (5)  │ beta (3)         │
│ [标签云视图]     │               │                  │
├─────────────────────────────────────────────────────┤
│ 标签列表                                            │
│ production | 12 个版本 | 最后更新: 2024-01-15     │
│ staging    | 5 个版本  | 最后更新: 2024-01-10     │
└─────────────────────────────────────────────────────┘
```

## API 调用

| 端点 | 方法 | 说明 |
|---|---|---|
| `GET /api/v1/tags` | 列表 | 获取标签列表 |
| `GET /api/v1/tags/:name` | 详情 | 获取标签详情 |
| `POST /api/v1/tags` | 创建 | 创建标签 |
| `DELETE /api/v1/tags/:name` | 删除 | 删除标签 |

## 相关文件

- `app/tags/page.tsx` — 列表页
- `app/tags/[name]/page.tsx` — 详情页
- `app/tags/new/page.tsx` — 新建页
- `components/tags/` — 标签组件
- `lib/api/tags.ts` — 标签 API
- `server/src/routes/tag.ts` — 后端路由
