# ErrorBoundary 组件

## 功能说明

错误边界组件，用于捕获子组件渲染错误，防止整个应用崩溃。

## 引入

```tsx
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
```

## Props

| 属性     | 类型                                                                        | 说明                |
| -------- | --------------------------------------------------------------------------- | ------------------- |
| children | `React.ReactNode`                                                           | 子组件              |
| fallback | `React.ReactNode \| ((error: Error, reset: () => void) => React.ReactNode)` | 错误时显示的降级 UI |

## 使用示例

```tsx
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <p>出错了: {error.message}</p>
      <Button onClick={reset}>重试</Button>
    </div>
  )}
>
  <MyComponent />
</ErrorBoundary>
```

## 注意事项

- 只捕获渲染阶段的 JavaScript 错误
- 不捕获事件处理器、异步代码错误
- 不捕获 ErrorBoundary 本身的错误
