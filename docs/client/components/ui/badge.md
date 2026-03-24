# Badge 组件

## 功能说明

状态标签组件，用于显示数字、状态或分类信息。

## 引入

```tsx
import { Badge } from '@/components/ui/badge';
```

## Props

| 属性      | 类型                                                       | 默认值      | 说明         |
| --------- | ---------------------------------------------------------- | ----------- | ------------ |
| variant   | `"default" \| "success" \| "warning" \| "error" \| "info"` | `"default"` | 标签颜色变体 |
| className | `string`                                                   | -           | 自定义类名   |
| children  | `React.ReactNode`                                          | -           | 标签内容     |

### Variant 变体

- **default**: 灰色默认标签
- **success**: 绿色成功状态
- **warning**: 黄色警告状态
- **error**: 红色错误状态
- **info**: 蓝色信息状态

## 使用示例

```tsx
// 默认标签
<Badge>Draft</Badge>

// 状态标签
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="info">Processing</Badge>

// 带数字
<Badge variant="error">99+</Badge>
```

## 样式特性

- 圆角 `rounded-full`
- 内边距 `px-2.5 py-0.5`
- 字体大小 `text-xs`
- hover 时显示阴影
