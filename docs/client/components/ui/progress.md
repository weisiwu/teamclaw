# Progress 组件

## 功能说明

进度条组件，用于显示任务完成进度。

## 引入

```tsx
import { Progress } from '@/components/ui/progress';
```

## Props

| 属性      | 类型     | 默认值 | 说明               |
| --------- | -------- | ------ | ------------------ |
| value     | `number` | `0`    | 当前进度值 (0-100) |
| className | `string` | -      | 自定义类名         |

## 使用示例

```tsx
// 50% 进度
<Progress value={50} />

// 动态进度
<Progress value={uploadProgress} />
```
