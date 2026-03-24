# Agent 团队

## 页面路由

```
/agent-team
```

## 页面功能描述

Agent 团队页面，展示团队中所有 Agent 的信息及其协作关系：
- **Agent 团队层级图**（HierarchyChart）：可视化展示 Agent 的指挥链关系
- **Agent 卡片网格**：展示每个 Agent 的名称、描述、状态、层级
- **Agent 详情面板**：点击卡片展开详细面板
- **协作流水线面板**（PipelineStatusPanel）：展示当前流水线执行状态
- **指派规则矩阵**：展示 Agent 间任务指派的规则

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `HierarchyChart` | `@/components/agent-team/HierarchyChart` | Agent 层级关系图 |
| `AgentCard` | `@/components/agent-team/AgentCard` | 单个 Agent 卡片 |
| `AgentDetailPanel` | `@/components/agent-team/AgentDetailPanel` | Agent 详情面板 |
| `PipelineStatusPanel` | `@/components/agent-team/PipelineStatusPanel` | 流水线状态面板 |
| `PipelineStarter` | `@/components/agent-team/PipelineStarter` | 流水线启动器 |
| `AgentTeamSkeleton` | `@/components/ui/projects-skeleton` | 加载骨架屏 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `agents` | 来自 `useAgentList()` | Agent 列表数据 |
| `overview` | 来自 `useTeamOverview()` | 团队概览（含指派矩阵） |
| `selectedAgent` | `useState<Agent \| null>` | 当前选中的 Agent |
| `activePipelineId` | `useState<string \| null>` | 当前活跃流水线 ID |
| `showPipelinePanel` | `useState<boolean>` | 是否显示流水线面板 |
| `isLoading` | `useState<boolean>` | 加载状态 |
| `error` | `useState<string \| null>` | 错误信息 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `useAgentList` | `@/hooks/useAgents` | 获取 Agent 列表 |
| `useTeamOverview` | `@/hooks/useAgents` | 获取团队概览和指派规则 |
| `refetch` | 来自 useAgentList | 刷新 Agent 列表 |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/admin/agents` | — | Agent 监控页面 |
| `/tasks` | — | 任务列表页面 |

## 指派规则

Agent 间任务指派遵循"高级可指派低级"原则：
- **Lv3** Agent → 可指派给 Lv2 或 Lv1
- **Lv2** Agent → 可指派给 Lv1
- **反向不可**：低级 Agent 不能指派给高级 Agent

## 流水线协作

- 点击"流水线"按钮可显示 Pipeline 面板
- PipelineStarter 用于启动新的协作流水线
- PipelineStatusPanel 展示流水线执行状态
- 活跃流水线用蓝点指示器标识
