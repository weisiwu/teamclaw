# 首页（Dashboard）

## 页面路由

```
/
```

## 功能概述

首页是用户登录后的默认落地页，提供项目总览和最近活动入口。集成了多个 Tab 子面板，支持切换「最近项目」和「最近任务」两种视图。

## 组件结构

| 组件 | 来源 | 说明 |
|------|------|------|
| `Providers` | `@/components/providers` | 全局 Providers（Theme、Query 等） |
| `Sidebar` | `@/components/layout/Sidebar` | 侧边导航栏 |
| `Header` | `@/components/layout/Header` | 顶部 Header |
| `ProjectCard` | `@/components/projects/ProjectCard` | 项目卡片组件 |
| `TaskCard` | `@/components/tasks/TaskCard` | 任务卡片组件 |
| `Tabs` | `@/components/ui/tabs` | Tab 切换组件（shadcn/ui） |
| `Card` | `@/components/ui/card` | 卡片容器（shadcn/ui） |

## 页面状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `activeTab` | `useState<'projects' \| 'tasks'>` | 当前 Tab 视图 |
| `user` | `useAuth()` | 当前登录用户 |
| 项目列表 | React Query `useProjects()` | 最近项目数据 |
| 任务列表 | React Query `useTasks()` | 最近任务数据 |

## API 调用

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/projects` | GET | 获取最近项目列表 |
| `/api/v1/tasks` | GET | 获取最近任务列表 |

## 页面跳转关系

- 点击项目卡片 → `/projects/[id]`（项目详情页）
- 点击任务卡片 → `/tasks/[id]`（任务详情页）
- 侧边栏「首页」→ `/`（当前页）
- 侧边栏「项目」→ `/projects`（项目列表页）
- 侧边栏「任务」→ `/tasks`（任务列表页）

## 核心逻辑

- 集成 `next-themes` 实现明/暗主题切换
- 集成 `@tanstack/react-query` 管理服务端状态
- 项目和任务列表均只显示最近 10 条记录
- 支持响应式布局，在移动端隐藏侧边栏
