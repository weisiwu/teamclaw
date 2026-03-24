# PermissionGuard

前端权限守卫组件，用于在 UI 层控制页面/组件的访问权限。

> ⚠️ **注意**：真正的安全验证在**后端 API**（`requireAdmin` 中间件）。此组件仅为用户体验层面的防护。

## 导入

```tsx
import { PermissionGuard } from "@/components/layout/PermissionGuard";
```

## Props

```tsx
interface PermissionGuardProps {
  children: ReactNode;
  requiredRole?: "admin" | "sub_admin";  // 所需角色，默认 "admin"
  redirectTo?: string;                    // 无权限时重定向路径，默认 "/"
}
```

## 使用示例

```tsx
// 仅管理员可访问
<PermissionGuard requiredRole="admin">
  <AdminSettingsPanel />
</PermissionGuard>

// 副管理员及以上可访问
<PermissionGuard requiredRole="sub_admin">
  <TeamSettings />
</PermissionGuard>
```

## 权限模型

| localStorage 角色 | `admin` 要求 | `sub_admin` 要求 |
|-------------------|-------------|-----------------|
| `admin` | ✅ | ✅ |
| `sub_admin` | ❌ | ✅ |
| 其他/未登录 | ❌ | ❌ |

## 设计细节

- **加载态**：显示 `animate-pulse "检查权限..."`
- **无权限 UI**：盾牌图标 + 标题 + 描述 + 返回按钮
- **检测方式**：读取 `localStorage` 的 `tc_user_role` 键
