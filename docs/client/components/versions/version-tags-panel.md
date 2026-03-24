# VersionTagsPanel 组件

## 功能说明

版本标签管理面板组件。

## 引入

```tsx
import { VersionTagsPanel } from '@/components/versions/VersionTagsPanel';
```

## 位置

`components/versions/VersionTagsPanel.tsx`

## 主要功能

- 标签列表展示
- 标签搜索
- 标签创建
- 标签编辑
- 标签删除
- 标签分组

## Props

| 属性        | 类型                 | 说明         |
| ----------- | -------------------- | ------------ |
| versionId   | `string`             | 版本 ID      |
| onTagSelect | `(tag: Tag) => void` | 标签选择回调 |

## 关联组件

- VersionTagsListItem
- VersionTagsDetailDrawer
- VersionTagsSearchBar
- TagGroupManager
