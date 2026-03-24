# VersionPanel

版本管理面板，支持网格/列表两种视图，支持搜索、筛选、统计。

## 导入

```tsx
import { VersionPanel } from "@/components/versions/VersionPanel";
```

## Props

```tsx
interface VersionPanelProps {
  versions: Version[];
  isOpen: boolean;
  onClose: () => void;
  onSelectVersion: (version: Version) => void;
  onRebuild?: (version: Version) => void;
}
```

## 视图模式

### 网格视图（Grid）

每个版本一个卡片，显示：
- Git Tag + 版本号 + 状态徽章
- 标题和描述
- 标签（最多 3 个）
- 统计信息（提交数、变更文件数、日期）
- 展开详情（变更文件列表 + 构建状态）

### 列表视图（List）

紧凑行显示，适合大量版本快速浏览。

## 筛选功能

- **搜索**：按版本号、Tag、标题、描述全文搜索
- **状态筛选**：`all` / `draft` / `published` / `archived`
- **日期范围**：开始日期 ~ 结束日期

## 统计面板

点击「统计」按钮展开：
- **近 6 个月发布趋势**：柱状图
- **状态分布**：已发布 / 草稿 / 已归档的百分比

## 使用示例

```tsx
import { VersionPanel } from "@/components/versions/VersionPanel";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function VersionPage() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  return (
    <>
      <Button onClick={() => setPanelOpen(true)}>版本面板</Button>
      <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
        <DialogContent className="max-w-6xl w-full p-0">
          <VersionPanel
            versions={versions}
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
            onSelectVersion={setSelectedVersion}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
```
