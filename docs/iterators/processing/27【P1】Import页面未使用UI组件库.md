# 12【P1】Import 页面未使用 UI 组件库

## 问题描述

`app/import/page.tsx`（项目导入向导）是整个项目中样式质量最低的页面，大量使用原生 HTML 元素和内联样式类，未复用项目已有的 UI 组件库（`components/ui/`），导致：
- 与其他页面视觉风格不一致
- 深色模式完全不支持（已在 Task 10 中记录）
- 按钮、输入框、卡片风格与全局不统一

## 具体问题

### 1. 原生 `<input>` 替代 `<Input>` 组件

```tsx
// 当前写法（4处）
<input
  type="url"
  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 ..."
/>

// 应替换为
<Input type="url" placeholder="..." value={url} onChange={...} />
```

涉及行：196、208、221、258

### 2. 原生 `<button>` 替代 `<Button>` 组件

```tsx
// 当前写法（多处）
<button className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg ...">
  下一步 →
</button>

// 应替换为
<Button onClick={...}>下一步 →</Button>
```

涉及行：166-172、175-184、233-238、295-298、301-304、425-428、431-434

### 3. 原生 `<div>` 卡片替代 `<Card>` 组件

```tsx
// 当前写法
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">

// 应替换为
<Card><CardContent className="p-6">...</CardContent></Card>
```

涉及行：162、248、354、409

### 4. 步骤指示器未组件化

步骤指示器 `renderStepIndicator()` 使用硬编码的圆形样式，应改用语义化设计令牌。

## 样式方案

**样式类型：UI 组件替换 + Tailwind CSS 语义化令牌**

### 需引入的组件

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
```

### 替换规则

| 原生元素 | 替换为 | 数量 |
|---------|--------|------|
| `<input type="text/url">` | `<Input>` | 4 处 |
| `<button className="...bg-blue-600...">` | `<Button>` | 5 处 |
| `<button className="...bg-gray-100...">` | `<Button variant="outline">` | 3 处 |
| `<div className="bg-white rounded-lg shadow-sm border...">` | `<Card>` | 4 处 |
| 技术栈 `<span>` 标签 | `<Badge variant="info">` | 动态 |

### 步骤指示器颜色替换

| 当前 | 替换为 |
|------|--------|
| `bg-green-500 text-white` | `bg-green-500 text-white`（保留） |
| `bg-blue-600 text-white` | `bg-primary text-primary-foreground` |
| `bg-gray-200 text-gray-500` | `bg-muted text-muted-foreground` |
| `bg-green-400`（连线） | `bg-green-400 dark:bg-green-500` |
| `bg-gray-200`（连线） | `bg-border` |

## 修改范围

- `app/import/page.tsx` — 全面重构，替换所有原生元素为 UI 组件，添加深色模式支持
