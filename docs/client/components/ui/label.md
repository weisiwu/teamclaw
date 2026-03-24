# Label 组件

## 功能说明

表单标签组件。

## 引入

```tsx
import { Label } from '@/components/ui/label';
```

## Props

继承自 React.LabelHTMLAttributes。

| 属性     | 类型              | 说明            |
| -------- | ----------------- | --------------- |
| htmlFor  | `string`          | 关联的 input id |
| children | `React.ReactNode` | 标签内容        |

## 使用示例

```tsx
<Label htmlFor="email">邮箱地址</Label>
<Input id="email" type="email" placeholder="请输入邮箱" />

// 必填标识
<div className="flex items-center gap-1">
  <Label htmlFor="name">名称</Label>
  <span className="text-red-500">*</span>
</div>
```
