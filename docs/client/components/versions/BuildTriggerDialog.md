# BuildTriggerDialog

触发构建的对话框，支持选择版本和环境。

## 导入

```tsx
import { BuildTriggerDialog } from "@/components/versions/BuildTriggerDialog";
```

## Props

```tsx
interface BuildTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetVersion?: Version | null;          // 预设版本（如从详情页打开）
  onBuildComplete?: (buildId: string, versionName: string, status: "success" | "failed") => void;
}
```

## 使用示例

```tsx
import { BuildTriggerDialog } from "@/components/versions/BuildTriggerDialog";

function VersionDetailPage({ version }: { version: Version }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>触发构建</Button>
      <BuildTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        presetVersion={version}
        onBuildComplete={(buildId, versionName, status) => {
          console.log(`Build ${buildId} for ${versionName}: ${status}`);
        }}
      />
    </>
  );
}
```

## 构建流程

1. **选择版本**（对话框内下拉，或通过 `presetVersion` 预设）
2. **选择环境**：`development` / `production` 等
3. **点击「开始构建」** → 进入构建中状态
4. **构建完成**：调用 `onBuildComplete` 回调

## 构建环境

来自 `getBuildEnvironments()` 返回值，通常包含 `development`、`staging`、`production` 等。
