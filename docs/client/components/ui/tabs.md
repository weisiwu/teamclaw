# Tabs 组件

## 功能说明

标签页组件，用于在不同内容区域间切换。

## 引入

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
```

## 组件

| 组件        | 说明                 |
| ----------- | -------------------- |
| Tabs        | 根容器，管理选中状态 |
| TabsList    | 标签列表容器         |
| TabsTrigger | 单个标签触发器       |
| TabsContent | 标签对应的内容区     |

## Tabs Props

| 属性          | 类型                      | 说明                     |
| ------------- | ------------------------- | ------------------------ |
| defaultValue  | `string`                  | 默认选中的标签值         |
| value         | `string`                  | 当前选中的标签值（受控） |
| onValueChange | `(value: string) => void` | 变更回调                 |
| children      | `React.ReactNode`         | 子组件                   |

## TabsTrigger Props

| 属性     | 类型              | 说明         |
| -------- | ----------------- | ------------ |
| value    | `string`          | 标签唯一标识 |
| children | `React.ReactNode` | 标签内容     |

## TabsContent Props

| 属性     | 类型              | 说明           |
| -------- | ----------------- | -------------- |
| value    | `string`          | 对应的触发器值 |
| children | `React.ReactNode` | 内容           |

## 使用示例

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">概览</TabsTrigger>
    <TabsTrigger value="settings">设置</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <p>概览内容...</p>
  </TabsContent>
  <TabsContent value="settings">
    <p>设置内容...</p>
  </TabsContent>
</Tabs>
```
