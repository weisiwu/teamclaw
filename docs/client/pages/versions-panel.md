# 版本面板（Tag 视角）

## 页面路由

```
/versions/panel
```

## 页面功能描述

版本面板页面，以 **Tag 为视角** 展示所有版本标签，提供：
- Tag 网格视图和列表视图切换
- Tag 搜索（名称/版本号/提交信息/作者）
- 状态筛选（活跃/已归档/保护中）
- 元数据筛选（有截图 / 有变更日志）
- 排序（最新优先 / 最早优先）
- 键盘快捷键：按 `R` 刷新列表
- 展开 Tag 卡片查看更多信息（Commit Hash、作者邮箱等）

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `TagCard` | 内联组件 | 单个 Tag 卡片（网格视图） |
| `TagRow` | 内联组件 | 单个 Tag 行（列表视图） |
| `ViewModeToggle` | 内联 | 网格/列表切换按钮组 |
| `SortButton` | 内联 | 排序按钮 |
| `EmptyState` | `@/components/ui/empty-state` | 空状态提示 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `tags` | `useMemo<GitTag[]>` | 原始 Tag 数据（来自 useTags） |
| `filteredTags` | `useMemo<GitTag[]>` | 过滤+排序后结果 |
| `viewMode` | `useState<'grid' \| 'list'>` | 视图模式 |
| `searchQuery` | `useState<string>` | 搜索关键词 |
| `sortOrder` | `useState<'newest' \| 'oldest'>` | 排序顺序 |
| `statusFilter` | `useState<GitTag['status']>` | 状态筛选 |
| `metaFilter` | `useState<'all' \| 'hasScreenshot' \| 'hasChangelog'>` | 元数据筛选 |
| `expandedTags` | `useState<Set<string>>` | 展开的卡片集合 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `useTags` | `@/lib/api/tags` | 获取 Tag 列表（React Query Hook） |
| `refetch` | 来自 useTags | 刷新列表数据 |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/versions?tag=xxx` | 点击 Tag 卡片/行 | Tag 名称 |
| `/versions` | — | — |

## 特殊功能

- **键盘快捷键**：在非输入框状态下按 `R` 键触发刷新
- **列表视图**：紧凑的表格布局，适合大量 Tag
- **构建状态指示**：Tag 卡片右上角显示构建状态小圆点（成功/失败/构建中/待构建）
- **截图/变更日志标识**：卡片上显示 📎 和 📝 徽章指示
