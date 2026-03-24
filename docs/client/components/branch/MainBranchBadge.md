# MainBranchBadge

主分支标识徽章。

## 导入

```tsx
import { MainBranchBadge } from "@/components/branch/MainBranchBadge";
```

## Props

```tsx
interface MainBranchBadgeProps {
  className?: string;
}
```

## 使用示例

```tsx
<MainBranchBadge />
// 或
<MainBranchBadge className="ml-2" />
```

## 设计细节

- 内部使用 `<Badge variant="success">` 包裹
- 左侧有 `Star` 图标（填充样式 `fill-current`）
