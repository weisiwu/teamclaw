# RollbackDialog 组件

## 功能说明

版本回滚确认对话框。

## 引入

```tsx
import { RollbackDialog } from '@/components/versions/RollbackDialog';
```

## 位置

`components/versions/RollbackDialog.tsx`

## Props

| 属性           | 类型                      | 说明               |
| -------------- | ------------------------- | ------------------ |
| open           | `boolean`                 | 对话框开关         |
| onOpenChange   | `(open: boolean) => void` | 状态变更回调       |
| version        | `Version`                 | 要回滚到的目标版本 |
| currentVersion | `Version`                 | 当前版本           |
| onConfirm      | `() => Promise<void>`     | 确认回滚回调       |

## 使用示例

```tsx
<RollbackDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  version={targetVersion}
  currentVersion={currentVersion}
  onConfirm={handleRollback}
/>
```

## 注意事项

- 回滚操作不可逆，需二次确认
- 显示回滚影响范围
- 回滚过程中显示进度
