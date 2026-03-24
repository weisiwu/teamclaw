# SnapshotCompareDialog 组件

## 功能说明

版本快照对比对话框。

## 引入

```tsx
import { SnapshotCompareDialog } from '@/components/versions/SnapshotCompareDialog';
```

## 位置

`components/versions/SnapshotCompareDialog.tsx`

## Props

| 属性         | 类型                      | 说明         |
| ------------ | ------------------------- | ------------ |
| open         | `boolean`                 | 对话框开关   |
| onOpenChange | `(open: boolean) => void` | 状态变更回调 |
| leftVersion  | `Version`                 | 左侧版本     |
| rightVersion | `Version`                 | 右侧版本     |

## 功能

- 左右版本信息展示
- 差异高亮显示
- 文件树对比
- 逐行 diff 展示
