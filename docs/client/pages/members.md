# 成员管理页

## 页面路由

```
/members
```

## 功能概述

团队成员管理页面，支持成员列表展示、搜索/筛选/排序、添加/编辑/删除、批量操作、导入/导出 Excel，以及内联编辑成员权重。

## 组件结构

| 组件 | 来源 | 说明 |
|------|------|------|
| `MemberForm` | `@/components/members/MemberForm` | 添加/编辑成员表单弹窗 |
| `MembersSkeleton` | `@/components/ui/projects-skeleton` | 加载骨架屏 |
| `EmptyState` | `@/components/ui/empty-state` | 空状态 |
| `Select` | `@/components/ui/select` | 角色/状态选择器 |
| `Badge` | `@/components/ui/badge` | 角色徽章 |
| `Button` | `@/components/ui/button` | 按钮 |
| `Input` | `@/components/ui/input` | 输入框 |

## 页面状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `isFormOpen` | `boolean` | 表单弹窗开关 |
| `editingMember` | `Member \| null` | 编辑中的成员 |
| `deleteConfirmId` | `string \| null` | 待删除成员 ID |
| `searchQuery` | `string` | 搜索关键词 |
| `roleFilter` | `MemberRole \| 'all'` | 角色筛选 |
| `statusFilter` | `MemberStatus \| 'all'` | 状态筛选 |
| `sortBy` | `'name' \| 'role' \| 'weight' \| 'createdAt'` | 排序字段 |
| `sortOrder` | `'asc' \| 'desc'` | 排序方向 |
| `selectedIds` | `Set<string>` | 批量选中的成员 ID |
| `batchDeleteConfirm` | `boolean` | 批量删除确认弹窗 |
| `importFile` | `File \| null` | 待导入的 Excel 文件 |
| `viewingMember` | `Member \| null` | 正在查看详情的成员 |
| `editingWeightId` | `string \| null` | 正在内联编辑权重的成员 ID |
| `editingWeightValue` | `string` | 内联编辑的权重值 |

## API 调用

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/members` | GET | 获取成员列表 |
| `/api/v1/members` | POST | 创建成员 |
| `/api/v1/members/:id` | PUT | 更新成员信息 |
| `/api/v1/members/:id` | DELETE | 删除成员 |
| `/api/v1/members/batch-delete` | POST | 批量删除成员 |
| `/api/v1/members/:id/toggle-status` | POST | 启用/禁用成员 |

## 成员角色

| 角色 | 说明 |
|------|------|
| `admin` | 管理员 |
| `sub_admin` | 副管理员 |
| `member` | 普通成员 |

## 权限控制

- **添加/编辑/权重编辑**：仅 `admin` 和 `sub_admin` 可操作
- **删除**：通过 `canDeleteMembers()` 权限函数控制
- **批量删除/角色修改**：管理员及以上

## 导入/导出

- **导出**：使用 `xlsx` 库生成 `.xlsx` 文件（懒加载）
- **导入**：读取 Excel 文件逐行创建成员（懒加载 `xlsx`）

## 页面跳转关系

- 侧边栏「成员管理」→ `/members`
