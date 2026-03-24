# BranchPanel

分支管理完整面板，支持分支的创建、删除、重命名、设为主分支、保护等操作。

## 导入

```tsx
import { BranchPanel } from "@/components/branch/BranchPanel";
```

## Props

```tsx
interface BranchPanelProps {
  branches: Branch[];
  isOpen: boolean;
  onClose: () => void;
  onCreateBranch: (data: { name: string; description?: string; baseBranch?: string }) => void;
  onDeleteBranch: (branchId: string) => void;
  onSetMainBranch: (branchId: string) => void;
  onRenameBranch: (branchId: string, newName: string) => void;
  onToggleProtection: (branchId: string, isProtected: boolean) => void;
  isCreatingBranch: boolean;
  isDeletingBranch: boolean;
  isSettingMainBranch: boolean;
  isRenamingBranch: boolean;
  isTogglingProtection: boolean;
  baseBranches?: Branch[];
}

interface Branch {
  id: string;
  name: string;
  description?: string;
  isMain: boolean;
  isProtected: boolean;
  createdAt: string;
}
```

## 功能区域

1. **搜索栏** — 按分支名搜索
2. **筛选器** — 全部 / 已保护 / 未保护
3. **创建表单** — 分支名 + 描述 + 基于分支选择
4. **分支列表** — 支持重命名，保护切换、设为主分支、删除

## 使用示例

```tsx
import { BranchPanel } from "@/components/branch/BranchPanel";
import { useBranches } from "@/hooks/useBranches";

function BranchPage() {
  const [panelOpen, setPanelOpen] = useState(false);
  const { data: branches } = useBranches();

  return (
    <>
      <Button onClick={() => setPanelOpen(true)}>管理分支</Button>
      <BranchPanel
        branches={branches || []}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        onCreateBranch={handleCreate}
        onDeleteBranch={handleDelete}
        onSetMainBranch={handleSetMain}
        onRenameBranch={handleRename}
        onToggleProtection={handleToggleProtection}
        isCreatingBranch={isCreating}
        isDeletingBranch={isDeleting}
        isSettingMainBranch={isSettingMain}
        isRenamingBranch={isRenaming}
        isTogglingProtection={isTogglingProtection}
      />
    </>
  );
}
```

## 关键交互

- **创建分支**：输入名称后按 Enter 或点击「创建」
- **删除分支**：二次确认（按钮文字变「确认」），保护分支不可删除
- **重命名**：点击编辑图标，输入新名称后确认
- **保护切换**：Switch 开关（主分支不可切换）
- **设为主分支**：点击星形图标
- **Escape 关闭**：监听键盘 Escape 键

## 设计细节

- **最大尺寸**：`max-w-2xl`，`max-h-[80vh]`
- **动画**：分支卡片错开动画 `animate-fade-in`
- **保护分支**：黄色边框提示
- **主分支**：蓝色背景高亮
