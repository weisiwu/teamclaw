# Tag 列表页

## 页面路由

```
/tags
```

## 功能概述

展示所有 Git Tag 记录的列表页，支持按前缀筛选、分页、搜索和删除。自动识别受保护 Tag（格式 `v\d+\.0\.0`）并禁止删除。

## 组件结构

| 组件 | 来源 | 说明 |
|------|------|------|
| `Tag` | `lucide-react` | Tag 图标 |
| `Search` | `lucide-react` | 搜索图标 |
| `Lock` | `lucide-react` | 保护锁图标 |
| `Trash2` | `lucide-react` | 删除图标 |
| `ChevronLeft/Right` | `lucide-react` | 分页图标 |
| `AlertTriangle` | `lucide-react` | 警告图标 |
| `Loader2` | `lucide-react` | 加载图标 |
| `EmptyState` | `@/components/ui/empty-state` | 空状态 |
| `Input` | `@/components/ui/input` | 输入框 |
| `Badge` | `@/components/ui/badge` | 标签 |
| `Link` | `next/link` | 链接 |
| `Button` | `@/components/ui/button` | 按钮 |

## 页面状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `tags` | `useState<TagRecord[]>` | Tag 列表 |
| `searchInput` | `useState<string>` | 搜索输入（实时） |
| `debouncedSearch` | `useState<string>` | 防抖后的搜索词 |
| `prefix` | `useState<string>` | 前缀筛选 |
| `page` | `useState<number>` | 当前页 |
| `totalPages` | `useState<number>` | 总页数 |
| `deleteId` | `useState<string \| null>` | 待删除的 Tag ID |
| `isDeleting` | `useState<boolean>` | 删除中状态 |
| `deleteError` | `useState<string \| null>` | 删除错误信息 |

## API 调用

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/tags` | GET | 获取 Tag 列表 |
| `/api/v1/tags/:id` | DELETE | 删除指定 Tag |

**GET 查询参数：**
| 参数 | 说明 |
|------|------|
| `page` | 页码（默认 1） |
| `pageSize` | 每页数量（默认 20） |
| `prefix` | Tag 名称前缀筛选 |

## 防抖机制

搜索输入经过 300ms 防抖后才触发列表筛选，避免频繁请求后端。

## 受保护 Tag

格式规则：`/^v\d+\.0\.0$/`，例如 `v1.0.0`、`v2.0.0`。受保护 Tag 显示 🔒 标记且无法被删除。

## 页面跳转关系

- 点击「创建 Tag」→ `/tags/new`
- 点击 Tag 名称 → `/tags/[name]`（Tag 详情页）
- 侧边栏「Tag 管理」→ `/tags`
