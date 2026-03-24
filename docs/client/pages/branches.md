# 分支管理页

## 页面路由

```
/branches
```

## 功能概述

Git 分支管理页面，集成 `BranchManager` 组件。支持查看分支列表、创建分支、删除分支、设置主分支、保护分支、重命名等操作。

## 组件结构

| 组件 | 来源 | 说明 |
|------|------|------|
| `BranchManager` | `@/components/versions/BranchManager` | 全功能分支管理组件 |

## 页面状态

> 所有状态均在 `BranchManager` 组件内部管理，主要包括：
- `branches`: 分支列表
- `selectedBranch`: 当前选中的分支
- `isCreating`: 是否处于创建模式
- `isEditing`: 是否处于编辑模式
- 各种操作确认对话框状态

## API 调用

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/branches` | GET | 获取分支列表 |
| `/api/v1/branches` | POST | 创建新分支 |
| `/api/v1/branches/:name` | PUT | 更新分支（重命名、设置主分支） |
| `/api/v1/branches/:name` | DELETE | 删除分支 |

## 分支操作

| 操作 | 说明 |
|------|------|
| 创建分支 | 输入分支名和源分支 |
| 删除分支 | 需确认，受保护分支不可删除 |
| 设置主分支 | 将指定分支设为主分支 |
| 保护分支 | 保护分支不可删除（通常为 `main`） |
| 重命名 | 修改分支名称 |

## 页面跳转关系

- 侧边栏「分支管理」→ `/branches`
