# Button 组件

## 功能说明

通用按钮组件，支持多种变体和尺寸，内置加载状态支持。

## 引入

```tsx
import { Button } from '@/components/ui/button';
```

## Props

| 属性      | 类型                                                           | 默认值      | 说明                             |
| --------- | -------------------------------------------------------------- | ----------- | -------------------------------- |
| variant   | `"default" \| "outline" \| "ghost" \| "destructive" \| "link"` | `"default"` | 按钮样式变体                     |
| size      | `"default" \| "sm" \| "lg" \| "icon"`                          | `"default"` | 按钮尺寸                         |
| loading   | `boolean`                                                      | `false`     | 加载状态，显示旋转图标并禁用按钮 |
| disabled  | `boolean`                                                      | -           | 禁用状态                         |
| className | `string`                                                       | -           | 自定义类名                       |
| children  | `React.ReactNode`                                              | -           | 按钮内容                         |

### Variant 变体

- **default**: 蓝色主按钮，适合主要操作
- **outline**: 边框按钮，适合次要操作
- **ghost**: 幽灵按钮，背景hover变化
- **destructive**: 红色危险操作按钮
- **link**: 链接样式按钮

### Size 尺寸

- **default**: 标准尺寸 (h-10 px-4 py-2)
- **sm**: 小尺寸 (h-8 px-3)
- **lg**: 大尺寸 (h-12 px-6)
- **icon**: 图标按钮 (h-8 w-8)

## 使用示例

```tsx
// 主按钮
<Button>保存</Button>

// 加载状态
<Button loading>处理中...</Button>

// 不同变体
<Button variant="outline">取消</Button>
<Button variant="destructive">删除</Button>

// 不同尺寸
<Button size="sm">小按钮</Button>
<Button size="lg">大按钮</Button>
<Button size="icon"><Icon /></Button>
```

## 样式特性

- 圆角 `rounded-lg`
- hover 时向上微移 `-translate-y-px` 并添加阴影
- focus 时显示蓝色 ring
- 禁用时降低透明度 `disabled:opacity-50`
