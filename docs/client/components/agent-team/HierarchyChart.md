# HierarchyChart

Agent 团队等级架构可视化图表。

## 导入

```tsx
import { HierarchyChart } from "@/components/agent-team/HierarchyChart";
```

## Props

```tsx
interface HierarchyChartProps {
  overview: TeamOverview;         // 团队概览数据
  selectedAgent: string | null;   // 当前选中的 Agent 名称
  onSelectAgent: (name: string) => void;  // 选择 Agent 回调
}
```

## 使用示例

```tsx
import { HierarchyChart } from "@/components/agent-team/HierarchyChart";
import { useTeamOverview } from "@/hooks/useAgents";

function TeamPage() {
  const { data: overview } = useTeamOverview();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  if (!overview) return null;

  return (
    <HierarchyChart
      overview={overview}
      selectedAgent={selectedAgent}
      onSelectAgent={setSelectedAgent}
    />
  );
}
```

## 架构层级

```
Lv3 决策层 (👑) ─────────────┐
                             │
        Lv2 策划层 (📋🔍) ───┼──（连接线）
                             │
        Lv1 执行层 (💻💻💻) ──┘
```

- **Lv3（决策层）**：紫色按钮，显示 👑
- **Lv2（策划层）**：蓝色按钮，显示 📋（pm）或 🔍（reviewer）
- **Lv1（执行层）**：绿色按钮，显示 💻

## 设计细节

- **布局**：垂直树状结构，层级间用渐变连接线
- **选中态**：对应层级颜色背景 + `scale-105` 放大 + 白色文字
- **图例**：底部有彩色图例说明各层级含义
