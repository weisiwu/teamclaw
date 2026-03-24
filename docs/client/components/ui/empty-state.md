# EmptyState 组件

## 功能说明

空状态组件，用于列表/内容为空时显示占位信息。

## 引入

```tsx
import { EmptyState } from '@/components/ui/empty-state';
```

## Props

| 属性        | 类型              | 说明       |
| ----------- | ----------------- | ---------- |
| icon        | `React.ReactNode` | 空状态图标 |
| title       | `string`          | 标题       |
| description | `string`          | 描述文字   |
| action      | `React.ReactNode` | 操作按钮   |

## 使用示例

```tsx
<EmptyState
  icon={<FolderOpenIcon className="w-12 h-12" />}
  title="暂无数据"
  description="还没有创建任何项目，请先创建一个项目"
  action={<Button onClick={createProject}>创建项目</Button>}
/>
```
