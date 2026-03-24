# 布局组件

> `components/layout/` — 应用布局组件

---

## AppLayout

**文件**: `AppLayout.tsx`

### 功能

应用主布局容器，包含侧边栏、顶部导航栏和主内容区域。

### Props

```typescript
interface AppLayoutProps {
  children: React.ReactNode;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}
```

### 布局结构

```
┌──────────────────────────────────────────────────────┐
│  Header (固定高度 64px)                              │
├──────────┬─────────────────────────────────────────┤
│          │                                         │
│ Sidebar  │           Main Content                   │
│ (可折叠)  │                                         │
│          │                                         │
└──────────┴─────────────────────────────────────────┘
```

### 使用示例

```tsx
import { AppLayout } from '@/components/layout/AppLayout';

<AppLayout>
  <YourPageContent />
</AppLayout>
```

---

## Header

**文件**: `Header.tsx`

### 功能

顶部导航栏，显示Logo、导航菜单、用户信息、通知。

### Props

```typescript
interface HeaderProps {
  title?: string;
  showBreadcrumb?: boolean;
  actions?: React.ReactNode;
  user?: {
    name: string;
    avatar?: string;
    role: string;
  };
}
```

### 布局结构

```
┌──────────────────────────────────────────────────────┐
│ Logo │ 导航菜单                    │ 通知 │ 用户 │
└──────────────────────────────────────────────────────┘
```

### 使用示例

```tsx
import { Header } from '@/components/layout/Header';

<Header
  title="版本管理"
  actions={<Button>新建版本</Button>}
  user={{ name: '张三', role: 'admin' }}
/>
```

---

## Sidebar

**文件**: `Sidebar.tsx`

### 功能

侧边导航栏，支持折叠/展开，显示主导航菜单。

### Props

```typescript
interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  activePath?: string;
}
```

### 导航菜单

```typescript
const menuItems = [
  { href: '/', label: '首页', icon: HomeIcon },
  { href: '/tasks', label: '任务管理', icon: LayersIcon },
  { href: '/versions', label: '版本管理', icon: GitBranchIcon },
  { href: '/projects', label: '项目管理', icon: FolderIcon },
  { href: '/agent-team', label: 'Agent 团队', icon: BotIcon },
  { href: '/capabilities', label: '能力配置', icon: ZapIcon },
  { href: '/cron', label: '定时任务', icon: ClockIcon },
  { href: '/tokens', label: 'Token 管理', icon: KeyIcon },
  { href: '/members', label: '成员管理', icon: UsersIcon },
  { href: '/settings', label: '设置', icon: SettingsIcon },
];
```

### 使用示例

```tsx
import { Sidebar } from '@/components/layout/Sidebar';

<Sidebar
  collapsed={isCollapsed}
  onCollapsedChange={setIsCollapsed}
  activePath={pathname}
/>
```

---

## Breadcrumb

**文件**: `Breadcrumb.tsx`

### 功能

面包屑导航，显示当前页面路径。

### Props

```typescript
interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
  }>;
  separator?: React.ReactNode;
}
```

### 使用示例

```tsx
import { Breadcrumb } from '@/components/layout/Breadcrumb';

<Breadcrumb
  items={[
    { label: '首页', href: '/' },
    { label: '版本管理', href: '/versions' },
    { label: 'v1.0.0' },
  ]}
/>
```

### 渲染效果

```
首页 / 版本管理 / v1.0.0
```

---

## PermissionGuard

**文件**: `PermissionGuard.tsx`

### 功能

权限守卫，控制页面元素的显示/访问权限。

### Props

```typescript
interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission?: string | string[];
  fallback?: React.ReactNode;
  mode?: 'hide' | 'disable';
}
```

### 使用示例

```tsx
import { PermissionGuard } from '@/components/layout/PermissionGuard';

// 隐藏
<PermissionGuard requiredPermission="project:write" fallback={<div>无权限</div>}>
  <Button>删除项目</Button>
</PermissionGuard>

// 禁用
<PermissionGuard requiredPermission="project:write" mode="disable">
  <Button>删除项目</Button>
</PermissionGuard>
```

### 权限类型

| 权限 | 说明 |
|---|---|
| `project:read` | 读取项目 |
| `project:write` | 写入项目 |
| `version:read` | 读取版本 |
| `version:write` | 写入版本 |
| `agent:manage` | 管理 Agent |
| `user:manage` | 管理用户 |
| `system:admin` | 系统管理 |
