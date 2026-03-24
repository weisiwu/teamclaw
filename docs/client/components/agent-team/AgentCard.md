# AgentCard

Agent 团队成员卡片组件，展示单个智能体的概要信息。

## 导入

```tsx
import { AgentCard } from "@/components/agent-team/AgentCard";
```

## Props

```tsx
interface AgentCardProps {
  agent: Agent;           // Agent 数据对象
  onClick: () => void;   // 点击卡片回调
  isSelected?: boolean;   // 是否被选中（高亮边框）
}
```

`Agent` 类型（来自 `@/lib/api/agents`）：

```tsx
interface Agent {
  name: string;
  role: string;          // 角色名称，如 "主管"、"产品经理"
  level: number;         // 等级 1-3
  status: AgentStatus;
  description: string;
  currentTask?: string;   // 当前任务
  currentTaskStartedAt?: string;
  inGroup: boolean;       // 是否在群聊中暴露
  workspace: string;
  defaultModel: string;
  capabilities: string[];
  loadScore: number;     // 负载评分 0-100
  lastHeartbeat: string;
}
```

## 使用示例

```tsx
import { AgentCard } from "@/components/agent-team/AgentCard";
import { Agent } from "@/lib/api/agents";

function AgentGrid({ agents, selectedAgent, onSelect }: {
  agents: Agent[];
  selectedAgent: string | null;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {agents.map(agent => (
        <AgentCard
          key={agent.name}
          agent={agent}
          isSelected={selectedAgent === agent.name}
          onClick={() => onSelect(agent.name)}
        />
      ))}
    </div>
  );
}
```

## 卡片内容

1. **头部**：渐变背景（按 level 变色） + Agent 头像 emoji + 名称/角色 + 状态徽章
2. **描述**：Agent 职责描述，最多显示 2 行
3. **当前任务**：蓝色背景的任务摘要（如果有）
4. **底部**：群聊/等级信息 + 右侧箭头图标

## 等级颜色映射

| Level | 渐变 | 颜色名称 |
|-------|------|---------|
| 3 | `from-purple-500 to-indigo-600` | 紫色 |
| 2 | `from-blue-500 to-cyan-600` | 蓝色 |
| 1 | `from-emerald-500 to-teal-600` | 绿色 |

## 设计细节

- **选中态**：`border-2 border-blue-500 ring-2 ring-blue-100`
- **hover**：`hover:shadow-lg hover:-translate-y-0.5`
- **角标 emoji**：主管 👑、产品经理 📋、代码审查 🔍、程序员 💻⚡
