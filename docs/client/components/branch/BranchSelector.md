# BranchSelector

简洁的下拉分支选择器。

## 导入

```tsx
import { BranchSelector } from "@/components/branch/BranchSelector";
```

## Props

```tsx
interface BranchSelectorProps {
  branches: Branch[];
  value: string;                    // 当前选中的分支名
  onChange: (branchId: string) => void;  // 变更回调
  disabled?: boolean;              // 是否禁用
}

interface Branch {
  id: string;
  name: string;
  isMain: boolean;
}
```

## 使用示例

```tsx
<BranchSelector
  branches={[
    { id: "1", name: "main", isMain: true },
    { id: "2", name: "develop", isMain: false },
    { id: "3", name: "feature-new-ui", isMain: false },
  ]}
  value={selectedBranch}
  onChange={setSelectedBranch}
/>
```

## 设计细节

- **左侧图标**：`GitBranch` 图标
- **样式**：与原生 `select` 一致的外观
- **禁用态**：透明度降低
