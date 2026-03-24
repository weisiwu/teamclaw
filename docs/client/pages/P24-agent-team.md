# P24 - Agent 团队

**路由**: `/agent-team`  
**文件**: `app/agent-team/page.tsx`  
**类型**: 客户端页面（`'use client'`）

---

## 功能概述

管理 Agent 团队，查看 Agent 状态、配置、能力、负载等。

## 页面结构

```
┌─────────────────────────────────────────────────────┐
│ Header: Agent 团队                    [新建 Agent]  │
├─────────────────────────────────────────────────────┤
│ Agent 概览                                          │
│ 总数: 5 | 忙碌: 2 | 空闲: 3 | 负载峰值: 80%      │
├─────────────────────────────────────────────────────┤
│ Agent 卡片                                          │
│ ┌─────────────────┐ ┌─────────────────┐            │
│ │ Agent-1         │ │ Agent-2         │            │
│ │ 状态: ● 运行中  │ │ 状态: ● 空闲    │            │
│ │ 负载: 75%       │ │ 负载: 0%        │            │
│ │ 当前任务: T-045 │ │ 当前任务: —     │            │
│ │ 能力: 5/6       │ │ 能力: 4/6       │            │
│ └─────────────────┘ └─────────────────┘            │
└─────────────────────────────────────────────────────┘
```

## Agent 状态

| 状态 | 说明 |
|---|---|
| `idle` | 空闲，等待任务 |
| `busy` | 执行任务中 |
| `offline` | 离线 |

## API 调用

| 端点 | 方法 | 说明 |
|---|---|---|
| `GET /api/v1/agents` | 列表 | 获取 Agent 列表 |
| `GET /api/v1/agents/:id` | 详情 | 获取 Agent 详情 |
| `GET /api/v1/agents/:id/status` | 状态 | 获取实时状态 |
| `POST /api/v1/agents` | 创建 | 创建 Agent |
| `PUT /api/v1/agents/:id` | 更新 | 更新 Agent 配置 |

## 相关文件

- `app/agent-team/page.tsx` — 本页
- `components/agent/` — Agent 相关组件
- `lib/api/agents.ts` — Agent API
- `server/src/routes/agent.ts` — 后端路由
- `server/src/services/agentService.ts` — Agent 服务
