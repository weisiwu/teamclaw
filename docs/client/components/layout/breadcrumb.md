# Breadcrumb 组件

## 功能说明

面包屑导航组件，显示当前位置的路径层级。

## 引入

```tsx
import { Breadcrumb } from '@/components/layout/Breadcrumb';
```

## 位置

`components/layout/Breadcrumb.tsx`

## 使用示例

```tsx
<Breadcrumb
  items={[{ label: '首页', href: '/' }, { label: '项目', href: '/projects' }, { label: '详情' }]}
/>
```

## Props

| 属性  | 类型                                      | 说明         |
| ----- | ----------------------------------------- | ------------ |
| items | `Array<{ label: string; href?: string }>` | 面包屑项列表 |
