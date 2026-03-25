# 22【P2】API 限流与缓存优化

## 任务目标

优化 API 性能，添加缓存和限流。

## 详细说明

### 22.1 React Query 配置

配置缓存策略：
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      gcTime: 30 * 60 * 1000, // 30 分钟
    },
  },
})
```

### 22.2 ISR 静态生成

对不常变化的页面使用 ISR：
```typescript
export async function generateStaticParams() {
  const poems = await fetchPoems()
  return poems.map((p) => ({ id: p.id.toString() }))
}

export const revalidate = 3600 // 每小时重新验证
```

### 22.3 API 限流

添加速率限制：
- 未登录：60 请求/分钟
- 已登录：300 请求/分钟

## 验收标准

- [ ] 缓存正常
- [ ] 性能提升明显
- [ ] 限流正常

## 依赖

任务 04

## 预计工作量

0.5 人天
