# P16 - 项目详情

**路由**: `/projects/[id]`  
**文件**: `app/projects/[id]/page.tsx`  
**类型**: 客户端页面（`'use client'`）

---

## 功能概述

查看单个项目的详细信息，包括版本列表、统计、成员等。

## 页面结构

```
┌─────────────────────────────────────────────────────┐
│ Header: 项目名称                    [设置] [导入新版本]│
├─────────────────────────────────────────────────────┤
│ 项目信息卡片                                        │
│ 技术栈: Next.js | Node.js | PostgreSQL            │
│ 创建时间: 2024-01-01 | 版本数: 15 | 成员: 5       │
├─────────────────────────────────────────────────────┤
│ 版本列表                                            │
│ v1.0.0 | production | 2024-01-15 | [查看]         │
│ v0.9.0 | staging    | 2024-01-10 | [查看]         │
├─────────────────────────────────────────────────────┤
│ 技术栈详情                                          │
│ 前端: Next.js 14 | 后端: Express | 数据库: PG    │
└─────────────────────────────────────────────────────┘
```

## API 调用

| 端点 | 方法 | 说明 |
|---|---|---|
| `GET /api/v1/projects/:id` | 获取 | 获取项目详情 |
| `PUT /api/v1/projects/:id` | 更新 | 更新项目信息 |
| `DELETE /api/v1/projects/:id` | 删除 | 删除项目 |
| `GET /api/v1/projects/:id/versions` | 版本列表 | 获取项目版本 |
| `GET /api/v1/projects/:id/members` | 成员 | 获取项目成员 |
| `GET /api/v1/projects/:id/tech-stack` | 技术栈 | 获取技术栈信息 |

## 相关文件

- `app/projects/[id]/page.tsx` — 本页
- `app/projects/page.tsx` — 项目列表页
- `components/projects/` — 项目组件
- `lib/api/projects.ts` — 项目 API
- `server/src/routes/project.ts` — 后端路由
