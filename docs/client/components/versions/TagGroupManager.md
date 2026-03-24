# TagGroupManager

Tag 分组管理器，支持创建分组、分配 Tag、自由组合显示。

## 导入

```tsx
import { TagGroupManager, useTagGroups, useFavoriteTags } from "@/components/versions/TagGroupManager";
```

## TagGroup 类型

```tsx
interface TagGroup {
  id: string;
  name: string;
  color: string;       // 十六进制颜色
  tagNames: string[];  // 属于该分组的 Tag 名数组
}
```

## Props

```tsx
interface TagGroupManagerProps {
  groups: TagGroup[];                      // 分组列表
  onGroupsChange: (groups: TagGroup[]) => void;  // 分组变更回调
  availableTags: string[];                 // 可分配的 Tag 名列表
}
```

## 颜色选项

```tsx
const COLOR_OPTIONS = [
  "#3B82F6", // 蓝
  "#10B981", // 绿
  "#F59E0B", // 黄
  "#EF4444", // 红
  "#8B5CF6", // 紫
  "#EC4899", // 粉
  "#06B6D4", // 青
  "#F97316", // 橙
];
```

## 使用示例

```tsx
import { TagGroupManager, useTagGroups } from "@/components/versions/TagGroupManager";

function TagGroupsSection({ availableTags }: { availableTags: string[] }) {
  const { groups, updateGroups } = useTagGroups();

  return (
    <TagGroupManager
      groups={groups}
      onGroupsChange={updateGroups}
      availableTags={availableTags}
    />
  );
}
```

## Hook

### useTagGroups

```tsx
const { groups, updateGroups } = useTagGroups();
// 数据持久化到 localStorage（key: "tagGroups"）
```

### useFavoriteTags

```tsx
const { favorites, addFavorite, removeFavorite, isFavorite } = useFavoriteTags();
// 收藏的 Tag，持久化到 localStorage（key: "favoriteTags"）
```

## 功能

- **新建分组**：输入名称 + 选择颜色
- **添加 Tag**：从下拉菜单选择可用 Tag
- **移除 Tag**：点击 Tag 右侧 X
- **删除分组**：点击垃圾桶图标
