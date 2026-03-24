# Auth 组件

## 目录

`components/auth/`

| 组件        | 说明                   |
| ----------- | ---------------------- |
| RequireAuth | 需要登录验证的路由守卫 |

## RequireAuth

登录验证守卫组件，未登录用户会被重定向到登录页。

```tsx
import { RequireAuth } from '@/components/auth/RequireAuth';

// 在路由中使用
<RequireAuth>
  <ProtectedPage />
</RequireAuth>;
```

## Props

| 属性     | 类型              | 说明                     |
| -------- | ----------------- | ------------------------ |
| children | `React.ReactNode` | 受保护的内容             |
| fallback | `React.ReactNode` | 加载中显示的内容（可选） |
