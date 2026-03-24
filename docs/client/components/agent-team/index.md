# Agent Team 组件

## 目录

`components/agent-team/` 包含 Agent 团队相关组件：

| 组件                | 说明             |
| ------------------- | ---------------- |
| AgentCard           | Agent 卡片展示   |
| AgentDetailPanel    | Agent 详情面板   |
| AgentStatusBadge    | Agent 状态徽章   |
| HierarchyChart      | Agent 层级关系图 |
| PipelineStatusPanel | 流水线状态面板   |

## AgentCard

Agent 信息卡片组件。

| 属性    | 类型         | 说明       |
| ------- | ------------ | ---------- |
| agent   | `Agent`      | Agent 对象 |
| onClick | `() => void` | 点击回调   |

## AgentStatusBadge

Agent 运行状态徽章。

| 属性   | 类型                             | 说明 |
| ------ | -------------------------------- | ---- |
| status | `"idle" \| "running" \| "error"` | 状态 |
| size   | `"sm" \| "md" \| "lg"`           | 尺寸 |

状态颜色：

- **idle**: 灰色
- **running**: 蓝色
- **error**: 红色

## HierarchyChart

展示 Agent 层级关系和调用链路。

```tsx
<HierarchyChart agents={agentList} highlightId={selectedId} />
```

## PipelineStatusPanel

显示完整流水线的执行状态。
