# P05 - 能力配置

**路由**: `/capabilities`  
**文件**: `app/capabilities/page.tsx`  
**类型**: 客户端页面（`'use client'`）

---

## 功能概述

配置 AI Agent 的能力范围和权限，控制 Agent 可以执行的操作类型。

## 页面结构

```
┌─────────────────────────────────────────────────────┐
│ Header: 能力配置                                    │
├─────────────────────────────────────────────────────┤
│ Agent 选择: [选择 Agent ▼]                          │
├─────────────────────────────────────────────────────┤
│ 能力列表                                            │
│ ├─ ☑ 代码审查能力                                   │
│ ├─ ☑ 自动构建能力                                   │
│ ├─ ☑ 部署执行能力                                   │
│ ├─ ☑ 文档生成能力                                   │
│ └─ ☐ 系统管理能力（需管理员权限）                   │
├─────────────────────────────────────────────────────┤
│ 能力详情                                            │
│ [选中能力的详细配置项]                              │
└─────────────────────────────────────────────────────┘
```

## 组件结构

| 组件 | 来源 | 说明 |
|---|---|---|
| `AgentSelector` | `components/capabilities/agent-selector.tsx` | Agent 下拉选择 |
| `CapabilityList` | `components/capabilities/capability-list.tsx` | 能力列表 |
| `CapabilityToggle` | `components/capabilities/capability-toggle.tsx` | 能力开关 |
| `CapabilityDetail` | `components/capabilities/capability-detail.tsx` | 能力详情配置 |

## 能力分类

| 能力类型 | 说明 | 所需权限 |
|---|---|---|
| `code_review` | 代码审查 | user |
| `auto_build` | 自动构建 | user |
| `deploy` | 部署执行 | admin |
| `doc_generate` | 文档生成 | user |
| `system_admin` | 系统管理 | super_admin |

## API 调用

| 端点 | 方法 | 说明 |
|---|---|---|
| `GET /api/v1/agents` | 列表 | 获取 Agent 列表 |
| `GET /api/v1/agents/:id/capabilities` | 获取 | 获取 Agent 能力配置 |
| `PUT /api/v1/agents/:id/capabilities` | 更新 | 更新能力配置 |

## 相关文件

- `app/capabilities/page.tsx` — 本页
- `components/capabilities/` — 能力配置组件
- `lib/api/agents.ts` — Agent API 封装
- `server/src/routes/ability.ts` — 后端能力路由
