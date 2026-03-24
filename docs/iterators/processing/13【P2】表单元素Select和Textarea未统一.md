# 13【P2】表单元素 Select 和 Textarea 未统一

## 问题描述

项目中 Select 下拉框和 Textarea 文本域使用了多种实现方式，缺乏统一的组件封装，导致样式和交互不一致。

## 具体问题

### 1. Select 下拉框混用三种写法

| 写法 | 文件 | 行号 |
|------|------|------|
| 原生 `<select>` + 内联样式 | `app/cron/page.tsx` | 483-491 |
| 原生 `<select>` + 内联样式 | `app/versions/page.tsx` | 263-273 |
| `<LegacySelect>` 组件 | `app/members/page.tsx` | 306-323 |

原生 `<select>` 的样式在深色模式、不同浏览器间表现差异大，且样式代码冗长重复。

### 2. Textarea 使用原生标签

`app/cron/page.tsx` line 265-270：
```tsx
<textarea
  className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md 
             focus:outline-none focus:ring-2 focus:ring-blue-500 
             focus:border-transparent resize-none text-sm"
  ...
/>
```

无深色模式适配，样式与 `<Input>` 组件不统一。

## 样式方案

**样式类型：新建 UI 组件 + Tailwind CSS**

### 方案一：创建 `<Textarea>` 组件

在 `components/ui/textarea.tsx` 中创建，样式参照 `<Input>` 组件：

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
export { Textarea };
```

### 方案二：统一 Select 组件

`components/ui/select.tsx` 已有 `LegacySelect` 实现，应统一所有原生 `<select>` 为此组件，并确保深色模式适配。

## 修改步骤

1. **新建** `components/ui/textarea.tsx` 组件
2. `app/cron/page.tsx`：原生 `<textarea>` → `<Textarea>` 组件
3. `app/cron/page.tsx`：原生 `<select>` → `<LegacySelect>` 组件
4. `app/versions/page.tsx`：原生 `<select>` → `<LegacySelect>` 组件
5. 验证深色模式下所有表单元素渲染正常

## 修改范围

- **新建** `components/ui/textarea.tsx`
- `app/cron/page.tsx` — 替换 textarea 和 select
- `app/versions/page.tsx` — 替换 select
