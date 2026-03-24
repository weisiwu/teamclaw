# Input 组件

## 功能说明

文本输入框组件，基于原生 input 的封装，支持暗色模式和统一的样式。

## 引入

```tsx
import { Input } from '@/components/ui/input';
```

## Props

继承自 `React.InputHTMLAttributes<HTMLInputElement>`，额外属性：

无额外 Props，全部继承原生 input 属性。

## 使用示例

```tsx
// 基本用法
<Input placeholder="请输入名称" />

// 带类型
<Input type="email" placeholder="邮箱" />
<Input type="password" placeholder="密码" />

// 禁用状态
<Input disabled placeholder="不可编辑" />

// 自定义样式
<Input className="max-w-sm" placeholder="自定义宽度" />
```

## 样式特性

- 高度 `h-10`
- 圆角 `rounded-lg`
- 边框 `border-gray-300`
- 暗色模式自适应
- focus 时显示蓝色 ring
- hover 时边框颜色加深
- placeholder 使用浅灰色
