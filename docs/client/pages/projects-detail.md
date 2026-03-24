# 项目详情页

## 页面路由

```
/projects/[id]
```

## 功能概述

展示单个项目的完整信息，包括基本信息、文件树、README 摘要、截图预览、版本历史、构建状态和关联 Agent 配置。是 TeamClaw 的核心详情页面。

## 组件结构

| 组件 | 来源 | 说明 |
|------|------|------|
| `ProjectHeader` | `@/components/projects/ProjectHeader` | 项目头部信息栏 |
| `FileTree` | `@/components/projects/FileTree` | 文件目录树 |
| `ProjectSummary` | `@/components/projects/ProjectSummary` | AI 生成的项目摘要 |
| `ScreenshotGallery` | `@/components/projects/ScreenshotGallery` | 截图画廊 |
| `VersionHistory` | `@/components/projects/VersionHistory` | 版本历史时间线 |
| `BuildStatus` | `@/components/projects/BuildStatus` | 构建状态指示器 |
| `AgentConfig` | `@/components/projects/AgentConfig` | Agent 配置面板 |
| `Tab` | `@/components/ui/tabs` | Tab 切换 |
| `Badge` | `@/components/ui/badge` | 状态标签 |

## 页面状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `activeTab` | `'overview' \| 'files' \| 'versions' \| 'builds'` | 当前 Tab |
| `project` | `useQuery` | 项目详情数据 |
| `selectedFile` | `string \| null` | 选中的文件路径 |
| `isEditing` | `boolean` | 是否处于编辑模式 |

## API 调用

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/projects/:id` | GET | 获取项目详情 |
| `/api/v1/projects/:id/summary` | GET | 获取 AI 摘要 |
| `/api/v1/projects/:id/screenshots` | GET | 获取截图列表 |
| `/api/v1/projects/:id/versions` | GET | 获取版本列表 |
| `/api/v1/projects/:id/files` | GET | 获取文件目录树 |
| `/api/v1/projects/:id/builds` | GET | 获取构建历史 |
| `/api/v1/projects/:id` | PUT | 更新项目信息 |

## Tab 面板说明

| Tab | 说明 |
|-----|------|
| `overview` | 项目总览，含 AI 摘要、截图、基本信息 |
| `files` | 文件目录树，支持文件预览 |
| `versions` | 版本历史时间线 |
| `builds` | 构建记录和状态 |

## 页面跳转关系

- 点击版本记录 → `/versions/[id]`（版本详情页）
- 点击「返回」→ `/projects`（项目列表页）
- 点击截图 → 放大查看（Lightbox）
