# Dialog 组件

## 功能说明

模态对话框组件，用于重要操作确认、表单填写等场景。

## 引入

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
```

## 组件

### Dialog

| 属性         | 类型                      | 说明                |
| ------------ | ------------------------- | ------------------- |
| open         | `boolean`                 | 控制对话框显示/隐藏 |
| onOpenChange | `(open: boolean) => void` | 状态变更回调        |
| children     | `React.ReactNode`         | 对话框内容          |

### DialogContent

对话框内容区。

| 属性      | 类型              | 说明       |
| --------- | ----------------- | ---------- |
| title     | `string`          | 标题       |
| onClose   | `() => void`      | 关闭回调   |
| className | `string`          | 自定义类名 |
| children  | `React.ReactNode` | 内容       |

### DialogHeader

头部区域。

### DialogFooter

底部区域，通常放置按钮。

### DialogTitle

对话框标题。

## 使用示例

```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>打开对话框</Button>

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent title="确认操作">
    <p>确定要执行此操作吗？</p>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
      <Button onClick={handleConfirm}>确认</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## 样式特性

- 背景遮罩 `bg-black/50`
- 内容框居中显示
- 点击遮罩或按 Escape 可关闭
- 进入/退出动画
- 最大宽度 `max-w-md`
- 圆角 `rounded-xl`
