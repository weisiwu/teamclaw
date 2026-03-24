# Tag 详情

## 页面路由

```
/tags/[name]
```

其中 `[name]` 为动态路由参数，代表 Tag 的名称（如 `v1.0.0`）。

## 页面功能描述

展示单个 Git Tag 的完整信息：
- Tag 基本信息（名称、Commit Hash、作者、时间）
- 关联版本（Version）信息
- Commit 提交信息（Message / Annotation）
- Tag 重命名操作（受保护 Tag 不可重命名）
- Tag 删除操作（受保护 Tag `^v\d+\.0\.0$` 不可删除）

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `TagInfoCard` | 内联组件 | Tag 信息展示卡片 |
| `CommitMessageBox` | 内联组件 | Commit 信息展示 |
| `RenameDialog` | 内联组件 | 重命名弹窗 |
| `DeleteConfirmDialog` | 内联组件 | 删除确认弹窗 |
| `Button` | `@/components/ui/button` | 操作按钮 |
| `Input` | `@/components/ui/input` | 重命名输入框 |
| `Badge` | `@/components/ui/badge` | 保护状态徽章 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `tag` | `useState<TagDetail \| null>` | Tag 详情数据 |
| `isLoading` | `useState<boolean>` | 加载状态 |
| `isRenaming` | `useState<boolean>` | 重命名请求中 |
| `newName` | `useState<string>` | 重命名输入值 |
| `isDeleteConfirm` | `useState<boolean>` | 删除确认弹窗 |
| `isDeleting` | `useState<boolean>` | 删除请求中 |
| `actionMsg` | `useState<{type, text} \| null>` | 操作提示消息 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `fetch` | 原生 `/api/v1/tags/[name]` | 获取 Tag 详情 |
| `fetch PUT` | `/api/v1/tags/[id]/rename` | 重命名 Tag |
| `fetch DELETE` | `/api/v1/tags/[id]` | 删除 Tag |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/tags` | 点击返回按钮 / 删除成功 | 面包屑导航 |
| `/tags/[新名称]` | 重命名成功 | 自动替换 URL |
| `/versions?tag=xxx` | 点击版本链接 | Tag 关联版本 |

## 保护规则

以下 Tag 受保护，无法删除：
- 匹配正则表达式 `^v\d+\.0\.0$` 的 Tag（如 `v1.0.0`、`v2.0.0`）
- 标记了 `protected: true` 的 Tag

## 关键交互

- `isProtectedTag(name)` 函数判断是否为受保护 Tag
- 重命名时输入框自动填充当前名称，支持 Enter 确认、Escape 取消
- 删除前需二次确认，确认弹窗显示 Tag 名称
