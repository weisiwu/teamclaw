# Providers 组件

## 目录

`components/providers/`

| 组件               | 说明                          |
| ------------------ | ----------------------------- |
| ReactQueryProvider | React Query 数据获取 Provider |

## ReactQueryProvider

React Query 全局 Provider，提供数据请求和缓存管理。

```tsx
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider';

<ReactQueryProvider>
  <App />
</ReactQueryProvider>;
```

## 作用

- 统一管理 API 请求状态
- 自动缓存和重新获取
- Optimistic updates 支持
