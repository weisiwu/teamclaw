# Breadcrumb

面包屑导航组件，自动根据当前 URL 路径生成导航路径。

## 导入

```tsx
import { Breadcrumb, BreadcrumbItem } from "@/components/layout/Breadcrumb";
```

## Props

```tsx
interface BreadcrumbProps {
  items?: BreadcrumbItem[];  // 手动指定面包屑项（覆盖自动生成）
  className?: string;        // 自定义类名
}

interface BreadcrumbItem {
  label: string;   // 显示文字
  href?: string;   // 链接（最后一项可无链接）
}
```

## 自动生成逻辑

```tsx
// URL: /versions/v1.2.3/detail
// 自动生成: 首页 → Versions → V1.2.3 → Detail
// 数字 ID 会被跳过（如 /versions/123 → 不显示 "123"）
// 路径段会做格式转换： kebab-case → Title Case
```

## 使用示例

```tsx
// 自动生成
<Breadcrumb />

// 手动指定（优先级更高）
<Breadcrumb
  items={[
    { label: "首页", href: "/" },
    { label: "版本管理", href: "/versions" },
    { label: "v1.2.3" },
  ]}
/>
```

## 设计细节

- **层级分隔符**：`ChevronRight` 图标
- **链接样式**：`text-gray-500`，hover 变蓝色
- **当前项**：`text-gray-900 font-medium`，不可点击
- **最大宽度**：链接有 `max-w-[120px]`，当前项有 `max-w-[160px]`，超出截断
- **URL 数字过滤**：`/^\d+$/` 的路径段不生成面包屑
