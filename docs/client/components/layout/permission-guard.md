# PermissionGuard 组件

## 功能说明

权限守卫组件，用于控制页面的访问权限。

## 引入

```tsx
import { PermissionGuard } from '@/components/layout/PermissionGuard';
```

## 位置

`components/layout/PermissionGuard.tsx`

## Props

| 属性       | 类型              | 说明         |
| ---------- | ----------------- | ------------ |
| permission | `string`          | 所需权限标识 |
| children   | `React.ReactNode` | 受保护的内容 |

## 使用示例

```tsx
<PermissionGuard permission="project:admin">
  <ProjectSettings />
</PermissionGuard>

// 无权限时显示降级内容
<PermissionGuard
  permission="project:write"
  fallback={<ReadOnlyView />}
>
  <EditableView />
</PermissionGuard>
```
