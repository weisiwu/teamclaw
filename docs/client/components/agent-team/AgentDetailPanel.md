# AgentDetailPanel

Agent 详情侧边面板组件，从右侧滑入展示完整 Agent 信息和配置。

## 导入

```tsx
import { AgentDetailPanel } from "@/components/agent-team/AgentDetailPanel";
```

## Props

```tsx
interface AgentDetailPanelProps {
  agent: Agent;         // Agent 数据对象
  onClose: () => void;  // 关闭面板回调
}
```

## 使用示例

```tsx
import { AgentDetailPanel } from "@/components/agent-team/AgentDetailPanel";
import { useUpdateAgentConfig } from "@/hooks/useAgents";

function AgentTeamPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  return (
    <>
      <AgentGrid agents={agents} onSelect={setSelectedAgent} />
      
      {selectedAgent && (
        <AgentDetailPanel
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </>
  );
}
```

## 面板内容分区

1. **头部**：Avatar 圆标 + 名称/角色 + 关闭按钮
2. **状态栏**：状态徽章 + 等级标签
3. **当前任务**：蓝色背景卡片，显示任务名和时间
4. **职责描述**：纯文本
5. **能力列表**：`capabilities` 数组展示为小标签
6. **配置**：默认模型输入框 + 工作空间（只读）+ 负载进度条
7. **时间信息**：最后心跳、群聊暴露状态

## 交互功能

- **修改默认模型**：输入框编辑后点击「保存配置」
- **保存状态**：Saved 时按钮变绿显示 ✅，2 秒后恢复
- **遮罩关闭**：点击背景遮罩也可关闭
- **动画**：右侧滑入 `slide-in-from-right`

## 设计细节

- **宽度**：`max-w-md`（约 448px）
- **位置**：`fixed right-0 top-0 h-full`
- **层级**：`z-50`
- **背景遮罩**：`bg-black/30`
- **内容区**：`flex-1 overflow-y-auto`
- **底部操作栏**：`p-4 border-t bg-gray-50`
