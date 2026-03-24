# BuildTriggerDialog 组件

## 功能说明

触发构建的对话框组件。

## 引入

```tsx
import { BuildTriggerDialog } from '@/components/versions/BuildTriggerDialog';
```

## 位置

`components/versions/BuildTriggerDialog.tsx`

## Props

| 属性         | 类型                        | 说明            |
| ------------ | --------------------------- | --------------- |
| open         | `boolean`                   | 对话框开关      |
| onOpenChange | `(open: boolean) => void`   | 状态变更回调    |
| projectId    | `string`                    | 项目 ID         |
| versionId    | `string`                    | 版本 ID（可选） |
| onSuccess    | `(buildId: string) => void` | 构建成功回调    |

## 使用示例

```tsx
const [dialogOpen, setDialogOpen] = useState(false);

<Button onClick={() => setDialogOpen(true)}>触发构建</Button>

<BuildTriggerDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  projectId={project.id}
  onSuccess={(buildId) => console.log('Build started:', buildId)}
/>
```
