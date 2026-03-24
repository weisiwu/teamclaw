# Select 组件

## 功能说明

下拉选择器组件。

## 引入

```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
```

## 组件

| 组件          | 说明       |
| ------------- | ---------- |
| Select        | 根容器     |
| SelectTrigger | 触发器按钮 |
| SelectValue   | 显示选中值 |
| SelectContent | 下拉内容   |
| SelectItem    | 单个选项   |

## Select Props

| 属性          | 类型                      | 说明               |
| ------------- | ------------------------- | ------------------ |
| value         | `string`                  | 当前选中值（受控） |
| onValueChange | `(value: string) => void` | 变更回调           |
| children      | `React.ReactNode`         | 子组件             |

## SelectItem Props

| 属性     | 类型              | 说明     |
| -------- | ----------------- | -------- |
| value    | `string`          | 选项值   |
| children | `React.ReactNode` | 显示内容 |

## 使用示例

```tsx
<Select value={selected} onValueChange={setSelected}>
  <SelectTrigger>
    <SelectValue placeholder="请选择" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">选项一</SelectItem>
    <SelectItem value="option2">选项二</SelectItem>
    <SelectItem value="option3">选项三</SelectItem>
  </SelectContent>
</Select>
```
