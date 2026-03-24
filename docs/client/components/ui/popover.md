# Popover 组件

## 功能说明

弹出框组件，用于显示附加信息或操作菜单。

## 引入

```tsx
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
```

## 组件

| 组件           | 说明     |
| -------------- | -------- |
| Popover        | 根容器   |
| PopoverTrigger | 触发器   |
| PopoverContent | 弹出内容 |

## 使用示例

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">打开</Button>
  </PopoverTrigger>
  <PopoverContent>
    <p>这里是弹出内容...</p>
  </PopoverContent>
</Popover>
```
