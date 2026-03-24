# RequireAuth

客户端路由守卫组件，未登录用户自动重定向。

## 导入

```tsx
import { RequireAuth } from "@/components/auth/RequireAuth";
```

## Props

```tsx
interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;          // 加载中的自定义兜底 UI
  redirectTo?: string;          // 重定向目标，默认 "/"
  requireAdmin?: boolean;       // 是否需要管理员权限，默认 false
}
```

## 使用示例

```tsx
// 基础：需要登录
<RequireAuth>
  <Dashboard />
</RequireAuth>

// 需要管理员权限
<RequireAuth requireAdmin redirectTo="/login">
  <AdminPanel />
</RequireAuth>

// 自定义加载 UI
<RequireAuth fallback={<LoadingSpinner />}>
  <ProfilePage />
</RequireAuth>
```

## 重定向规则

| 状态 | 行为 |
|------|------|
| 未登录（`isAuthenticated === false`） | → `redirectTo` |
| 已登录但无管理员权限（`requireAdmin=true`） | → `redirectTo` |
| `requireAdmin=false` 且已登录 | ✅ 渲染 children |

可访问的管理员角色：`admin` | `vice_admin` | `owner`

## 设计细节

- **加载态**：显示 `Loader2` 旋转图标 + 全屏居中
- **认证状态**：从 `useAuth()` hook 获取
