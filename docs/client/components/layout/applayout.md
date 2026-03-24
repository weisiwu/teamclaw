# AppLayout

应用整体布局组件，组合 Header + Sidebar + 内容区域，并内置错误边界和 Toast 支持。

## 导入

```tsx
import { AppLayout } from "@/components/layout/AppLayout";
```

## Props

```tsx
interface AppLayoutProps {
  children: React.ReactNode;
}
```

## 使用示例

```tsx
import { AppLayout } from "@/components/layout/AppLayout";

export default function App() {
  return (
    <AppLayout>
      <YourPageContent />
    </AppLayout>
  );
}
```

## 包含的功能

1. **Header** — 顶部导航栏
2. **Sidebar** — 侧边栏（桌面端固定，移动端抽屉式）
3. **ToastProvider** — Toast 通知系统
4. **ErrorBoundary** — 全局错误边界

## 移动端行为

- 侧边栏默认隐藏
- 点击 Header 中的菜单按钮打开抽屉
- 抽屉有遮罩背景，点击背景或关闭按钮关闭
- 侧边栏使用 `transform` 动画

## 设计细节

- **主区域**：`flex-1 min-h-[calc(100vh-3.5rem)]`
- **背景**：`bg-gray-50 dark:bg-slate-900`
- **移动端响应式**：`hidden lg:block` 控制桌面侧边栏可见性
