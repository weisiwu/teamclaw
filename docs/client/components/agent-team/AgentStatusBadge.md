# AgentStatusBadge

Agent 状态徽章组件，显示智能体当前运行状态。

## 导入

```tsx
import { AgentStatusBadge } from "@/components/agent-team/AgentStatusBadge";
```

## Props

```tsx
interface AgentStatusBadgeProps {
  status: AgentStatus;   // 状态类型
  size?: "sm" | "md";    // 徽章尺寸，默认 "md"
}
```

`AgentStatus` 类型定义：

```tsx
type AgentStatus = "idle" | "busy" | "error" | "offline";
```

## 状态映射

| status | 标签 | 圆点颜色 | 样式 |
|--------|------|---------|------|
| `idle` | 空闲 | 绿色 | 绿底绿字 |
| `busy` | 忙碌 | 蓝色 | 蓝底蓝字 |
| `error` | 异常 | 红色 | 红底红字 |
| `offline` | 离线 | 灰色 | 灰底灰字 |

## 使用示例

```tsx
<AgentStatusBadge status="idle" />
<AgentStatusBadge status="busy" />
<AgentStatusBadge status="error" />
<AgentStatusBadge status="offline" size="sm" />
```

## 设计细节

- **形状**：`rounded-full`（药丸形）
- **左侧圆点**：表示状态的实时指示器
- **尺寸**：
  - `md`：`text-xs px-2 py-1`
  - `sm`：`text-xs px-1.5 py-0.5`
