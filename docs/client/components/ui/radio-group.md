# RadioGroup 组件

## 功能说明

单选按钮组组件。

## 引入

```tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
```

## 组件

| 组件           | 说明               |
| -------------- | ------------------ |
| RadioGroup     | 容器，管理选中状态 |
| RadioGroupItem | 单个选项           |

## 使用示例

```tsx
<RadioGroup value={choice} onValueChange={setChoice}>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="option1" id="r1" />
    <Label htmlFor="r1">选项一</Label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="option2" id="r2" />
    <Label htmlFor="r2">选项二</Label>
  </div>
</RadioGroup>
```
