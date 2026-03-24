# Header

应用顶部导航栏组件。

## 导入

```tsx
import { Header } from "@/components/layout/Header";
```

## Props

```tsx
interface HeaderProps {
  onMenuClick?: () => void;    // 移动端菜单按钮点击回调
  showBreadcrumb?: boolean;    // 是否显示面包屑导航，默认 true
}
```

## 使用示例

```tsx
// 在 AppLayout 中使用
<Header onMenuClick={() => setSidebarOpen(true)} />

// 不显示面包屑
<Header showBreadcrumb={false} />
```

## 设计细节

- **高度**：`h-14 sm:h-16`（移动端 56px，桌面端 64px）
- **背景**：`bg-white dark:bg-slate-800`
- **左侧**：Logo 文字 "TeamClaw" + 面包屑导航
- **右侧**：通知铃铛（有红点）+ 用户头像
- **移动端**：左侧额外显示汉堡菜单按钮
- **面包屑**：`hidden md:block` 仅在大屏显示
