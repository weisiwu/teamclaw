# P09 - 成员管理

**路由**: `/members`  
**文件**: `app/members/page.tsx`  
**类型**: 客户端页面（`'use client'`）

---

## 功能概述

管理团队成员，设置角色和权限。

## 页面结构

```
┌─────────────────────────────────────────────────────┐
│ Header: 成员管理             [+ 邀请成员]          │
├─────────────────────────────────────────────────────┤
│ 成员列表                                            │
│ 头像 | 姓名 | 邮箱 | 角色 | 状态 | 操作             │
│ ─────────────────────────────────────────────────── │
│ 👤 张三 | zhang@example.com | admin | active | [编辑]│
│ 👤 李四 | li@example.com    | user  | active | [编辑]│
│ 👤 王五 | wang@example.com  | user  | inactive|[编辑]│
└─────────────────────────────────────────────────────┘
```

## 角色类型

| 角色 | 说明 | 权限 |
|---|---|---|
| `super_admin` | 超级管理员 | 全部权限 |
| `admin` | 管理员 | 大部分权限 |
| `user` | 普通用户 | 受限权限 |
| `viewer` | 查看者 | 只读权限 |

## API 调用

| 端点 | 方法 | 说明 |
|---|---|---|
| `GET /api/v1/members` | 列表 | 获取成员列表 |
| `POST /api/v1/members/invite` | 邀请 | 发送邀请 |
| `PUT /api/v1/members/:id` | 更新 | 更新成员信息/角色 |
| `DELETE /api/v1/members/:id` | 移除 | 移除成员 |

## 相关文件

- `app/members/page.tsx` — 本页
- `components/members/` — 成员管理组件
- `lib/api/members.ts` — 成员 API
- `server/src/routes/member.ts` — 后端路由
