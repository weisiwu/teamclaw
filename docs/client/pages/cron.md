# 定时任务

## 页面路由

```
/cron
```

## 页面功能描述

定时任务（Cron）管理页面，支持：
- 展示所有定时任务列表
- 创建新定时任务（名称、Cron 表达式、Prompt）
- 编辑已有定时任务
- 启动/停止定时任务
- 查看任务运行日志
- 删除定时任务（需二次确认）
- 按名称搜索和按状态筛选

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `CronCard` | 内联组件 | 单个定时任务卡片 |
| `CronModal` | 内联组件 | 创建/编辑任务弹窗 |
| `CronRunLogModal` | 内联组件 | 运行日志弹窗 |
| `Dialog` | `@/components/ui/dialog` | 删除确认弹窗 |
| `Card` | `@/components/ui/card` | 卡片容器 |
| `CardContent` | `@/components/ui/card` | 卡片内容区 |
| `Badge` | `@/components/ui/badge` | 状态徽章 |
| `Button` | `@/components/ui/button` | 操作按钮 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `data` | 来自 `useCronList()` | 定时任务列表 |
| `isModalOpen` | `useState<boolean>` | 创建/编辑弹窗开关 |
| `editCron` | `useState<CronTask \| null>` | 当前编辑的任务 |
| `viewLogsCron` | `useState<CronTask \| null>` | 当前查看日志的任务 |
| `searchName` | `useState<string>` | 任务名称搜索 |
| `filterStatus` | `useState<'all' \| 'running' \| 'stopped'>` | 状态筛选 |
| `confirmDeleteId` | `useState<string \| null>` | 待删除的任务 ID |
| `pendingId` | `useState<string \| null>` | 当前进行中的操作 ID |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `useCronList` | `@/hooks/useCron` | 获取任务列表 |
| `useCreateCron` | `@/hooks/useCron` | 创建任务 |
| `useUpdateCron` | `@/hooks/useCron` | 更新任务 |
| `useDeleteCron` | `@/hooks/useCron` | 删除任务 |
| `useStartCron` | `@/hooks/useCron` | 启动任务 |
| `useStopCron` | `@/hooks/useCron` | 停止任务 |
| `useCronRuns` | `@/hooks/useCron` | 获取运行历史 |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/cron` | 刷新、任务操作后 | — |

## Cron 表达式说明

| 表达式 | 含义 |
|--------|------|
| `0 2 * * *` | 每天 02:00 执行 |
| `*/15 * * * *` | 每 15 分钟执行 |
| `0 9 * * 1-5` | 每周一至周五 09:00 |

## 任务状态

| 状态 | 含义 |
|------|------|
| `running` | 运行中 |
| `stopped` | 已停止 |

## 删除确认流程

1. 点击删除图标 → 弹出确认 Dialog
2. 确认后执行 `deleteCron.mutateAsync()`
3. 操作完成后自动关闭 Dialog
