# 项目列表页

## 页面路由

```
/projects
```

## 功能概述

展示所有项目，支持搜索、分页、项目创建和管理操作。集成了项目导入入口和项目卡片网格视图。

## 组件结构

| 组件 | 来源 | 说明 |
|------|------|------|
| `ProjectCard` | `@/components/projects/ProjectCard` | 项目卡片 |
| `ProjectFilter` | `@/components/projects/ProjectFilter` | 筛选工具栏 |
| `ProjectForm` | `@/components/projects/ProjectForm` | 创建/编辑表单弹窗 |
| `ProjectSkeleton` | `@/components/ui/projects-skeleton` | 加载骨架屏 |
| `EmptyState` | `@/components/ui/empty-state` | 空状态占位 |
| `Button` | `@/components/ui/button` | shadcn/ui 按钮 |
| `Input` | `@/components/ui/input` | shadcn/ui 输入框 |
| `Badge` | `@/components/ui/badge` | shadcn/ui 标签 |

## 页面状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `viewMode` | `'grid' \| 'list'` | 视图模式切换 |
| `searchQuery` | `string` | 搜索关键词 |
| `statusFilter` | `ProjectStatus \| 'all'` | 状态筛选 |
| `isFormOpen` | `boolean` | 表单弹窗开关 |
| `editingProject` | `Project \| null` | 编辑中的项目 |
| `selectedIds` | `Set<string>` | 批量选择 ID 集合 |

## API 调用

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/projects` | GET | 获取项目列表（支持分页、搜索） |
| `/api/v1/projects` | POST | 创建新项目 |
| `/api/v1/projects/:id` | PUT | 更新项目信息 |
| `/api/v1/projects/:id` | DELETE | 删除项目 |

## 筛选参数

- `search`: 搜索项目名称或描述
- `status`: `active` | `archived` | `all`
- `page`: 页码
- `pageSize`: 每页数量（默认 20）

## 页面跳转关系

- 点击项目卡片 → `/projects/[id]`（项目详情页）
- 侧边栏「项目」→ `/projects`
- 侧边栏「导入」→ `/import`（项目导入向导）
