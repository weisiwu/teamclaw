# PipelineStatusPanel

协作流水线状态面板，展示多阶段任务的执行进度。

## 导入

```tsx
import { PipelineStatusPanel, PipelineStarter } from "@/components/agent-team/PipelineStatusPanel";
```

## 流水线阶段

| Stage | 标签 | 负责 Agent |
|-------|------|-----------|
| `confirm` | 需求确认 | main |
| `clarify` | 需求澄清 | pm |
| `code` | 代码生成 | coder |
| `review` | 代码审查 | reviewer |
| `notify` | 结果通知 | main |
| `complete` | 完成 | — |

## PipelineStatusPanel

```tsx
interface PipelineStatusPanelProps {
  pipelineId: string | null;  // 流水线 ID，null 则不显示
}
```

## PipelineStarter

启动新流水线的表单组件。

```tsx
interface PipelineStarterProps {
  onStarted: (pipelineId: string) => void;  // 启动后回调
}
```

## 使用示例

```tsx
import { PipelineStatusPanel, PipelineStarter } from "@/components/agent-team/PipelineStatusPanel";
import { usePipeline } from "@/hooks/useAgents";

function TaskPage() {
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PipelineStarter onStarted={setPipelineId} />
      {pipelineId && <PipelineStatusPanel pipelineId={pipelineId} />}
    </div>
  );
}
```

## PM 澄清面板

当 `pipeline.status === 'blocked'` 时，自动渲染 `<PMSessionPanel>`，展示 PM 提出的澄清问题，支持用户输入回答并提交。

## 状态标签

| status | 显示 |
|--------|------|
| `completed` | ✅ 完成（绿色） |
| `running` | 🔄 进行中（蓝色） |
| `blocked` | ⏸ 等待输入（黄色） |
| `failed` | ❌ 失败（红色） |
| `pending` | ⏳ 待执行（灰色） |
