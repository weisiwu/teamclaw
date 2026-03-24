# ReactQueryProvider

React Query（TanStack Query）的 Provider 组件，包裹整个应用以启用全局查询缓存。

## 导入

```tsx
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
```

## 使用

```tsx
// app/layout.tsx 或顶级 Provider
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
```

## 说明

- 提供全局 `QueryClient` 实例
- 所有使用 `useQuery` / `useMutation` / `useQueryClient` 的组件共享同一缓存
- 通常放置在 `AppLayout` 或根布局的外层
