# VersionHistory

版本操作历史时间线面板。

## 导入

```tsx
import { VersionHistory } from "@/components/versions/VersionHistory";
```

## Props

```tsx
interface VersionHistoryProps {
  version: Version | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

## 事件类型

| type | 标签 | 图标 | 颜色 |
|------|------|------|------|
| `created` | 创建 | `FileText` | 蓝 |
| `built` | 构建 | `Play` | 紫 |
| `published` | 发布 | `CheckCircle` | 绿 |
| `branched` | 分支 | `GitBranch` | 黄 |
| `updated` | 更新 | `Clock` | 橙 |
| `archived` | 归档 | `XCircle` | 灰 |

## 功能

- **时间线视图**：垂直时间线，带连接线
- **事件筛选**：按事件类型过滤
- **统计面板**：总事件数、构建次数、提交数
- **回退按钮**：打开 `RollbackDialog`

## 使用示例

```tsx
import { VersionHistory } from "@/components/versions/VersionHistory";

function VersionDetail({ version }: { version: Version }) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setHistoryOpen(true)}>
        查看历史
      </Button>
      <VersionHistory
        version={version}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  );
}
```
