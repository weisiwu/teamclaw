# BranchCompareDialog

两个分支之间的差异对比对话框。

## 导入

```tsx
import { BranchCompareDialog } from "@/components/branch/BranchCompareDialog";
```

## Props

```tsx
interface BranchCompareDialogProps {
  branches: Branch[];
  isOpen: boolean;
  onClose: () => void;
}

interface Branch {
  id: string;
  name: string;
  description?: string;
  isMain: boolean;
  createdAt: string;
}
```

## 使用示例

```tsx
import { BranchCompareDialog } from "@/components/branch/BranchCompareDialog";

function BranchComparePage() {
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setCompareOpen(true)}>对比分支</Button>
      <BranchCompareDialog
        branches={branches}
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
      />
    </>
  );
}
```

## 对比流程

1. **选择源分支和目标分支**
2. **点击「开始对比」**，调用 `/api/v1/branches/compare`
3. **展示对比结果**：新增 / 变更 / 删除三种差异类型，颜色区分

## 差异类型

| 类型 | Badge 颜色 | 图标 |
|------|-----------|------|
| 新增 | success（绿） | `Plus` |
| 删除 | error（红） | `Minus` |
| 变更 | warning（黄） | `FileDiff` |
