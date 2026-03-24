# AppLayout 组件

## 功能说明

应用主布局组件，组合 Header、Sidebar 和内容区域。

## 引入

```tsx
import { AppLayout } from '@/components/layout/AppLayout';
```

## 位置

`components/layout/AppLayout.tsx`

## Props

| 属性     | 类型              | 说明     |
| -------- | ----------------- | -------- |
| children | `React.ReactNode` | 页面内容 |

## 结构

```
<AppLayout>
  <Header />
  <div className="flex">
    <Sidebar />
    <main>{children}</main>
  </div>
</AppLayout>
```

## 使用示例

```tsx
<AppLayout>
  <VersionPanel />
</AppLayout>
```
