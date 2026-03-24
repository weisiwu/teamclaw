# 前端组件文档

> 📅 更新日期：2026-03-24
> 📁 路径：`components/` 目录

---

## 目录结构

```
docs/client/components/
├── README.md                  # 本索引文件
├── ui/                       # 基础 UI 组件
│   ├── README.md            # UI 组件汇总
│   ├── button.md
│   ├── card.md
│   ├── dialog.md
│   ├── input.md
│   └── ...
├── layout/                   # 布局组件
│   ├── README.md
│   ├── header.md
│   ├── sidebar.md
│   ├── app-layout.md
│   └── ...
├── versions/                 # 版本相关组件
│   ├── README.md
│   ├── version-card.md
│   ├── version-timeline.md
│   ├── changelog-panel.md
│   └── ...
├── business/                 # 业务组件
│   ├── README.md
│   ├── agent-card.md
│   ├── task-item.md
│   ├── project-card.md
│   └── ...
```

---

## 组件分类

### 基础 UI 组件 (`components/ui/`)

基于 Tailwind CSS 的基础组件库：

| 组件 | 文件 | 说明 |
|---|---|---|
| Button | `button.tsx` | 按钮，支持多种变体 |
| Card | `card.tsx` | 卡片容器 |
| Input | `input.tsx` | 文本输入框 |
| Dialog | `dialog.tsx` | 模态对话框 |
| DropdownMenu | `dropdown-menu.tsx` | 下拉菜单 |
| Badge | `badge.tsx` | 徽章标签 |
| Select | `select.tsx` | 下拉选择 |
| Tabs | `tabs.tsx` | 标签页 |
| Progress | `progress.tsx` | 进度条 |
| Switch | `switch.tsx` | 开关 |
| Checkbox | `checkbox.tsx` | 复选框 |
| RadioGroup | `radio-group.tsx` | 单选组 |
| Label | `label.tsx` | 表单标签 |
| Popover | `popover.tsx` | 弹出框 |
| Alert | `toast.tsx` | 轻提示 |
| EmptyState | `empty-state.tsx` | 空状态占位 |
| ErrorBoundary | `error-boundary.tsx` | 错误边界 |

### 布局组件 (`components/layout/`)

| 组件 | 文件 | 说明 |
|---|---|---|
| AppLayout | `AppLayout.tsx` | 应用主布局 |
| Header | `Header.tsx` | 顶部导航栏 |
| Sidebar | `Sidebar.tsx` | 侧边导航栏 |
| Breadcrumb | `Breadcrumb.tsx` | 面包屑导航 |
| PermissionGuard | `PermissionGuard.tsx` | 权限守卫 |

### 版本组件 (`components/versions/`)

| 组件 | 文件 | 说明 |
|---|---|---|
| VersionCard | `VersionCard.tsx` | 版本卡片 |
| VersionTimeline | `VersionTimeline.tsx` | 版本时间线 |
| ChangelogPanel | `ChangelogPanel.tsx` | 变更日志面板 |
| BuildLogViewer | `BuildLogViewer.tsx` | 构建日志查看器 |
| DiffViewer | — | 差异对比组件 |
| ScreenshotGallery | `ScreenshotGallery.tsx` | 截图画廊 |
| VersionSummaryPanel | `VersionSummaryPanel.tsx` | 版本摘要面板 |
| BuildHistoryPanel | `BuildHistoryPanel.tsx` | 构建历史面板 |
| TagGroupManager | `TagGroupManager.tsx` | 标签组管理 |
| BatchTagOperations | `BatchTagOperations.tsx` | 批量标签操作 |
| RollbackDialog | `RollbackDialog.tsx` | 回退对话框 |
| BuildTriggerDialog | `BuildTriggerDialog.tsx` | 构建触发对话框 |

### 业务组件

#### Agent 团队 (`components/agent-team/`)

| 组件 | 文件 | 说明 |
|---|---|---|
| AgentCard | `AgentCard.tsx` | Agent 卡片 |
| AgentStatusBadge | `AgentStatusBadge.tsx` | Agent 状态徽章 |
| AgentDetailPanel | `AgentDetailPanel.tsx` | Agent 详情面板 |
| HierarchyChart | `HierarchyChart.tsx` | Agent 层级图表 |
| PipelineStatusPanel | `PipelineStatusPanel.tsx` | 流水线状态面板 |

#### 成员管理 (`components/members/`)

| 组件 | 文件 | 说明 |
|---|---|---|
| MemberForm | `MemberForm.tsx` | 成员表单 |

#### Token 管理 (`components/tokens/`)

| 组件 | 文件 | 说明 |
|---|---|---|
| TokenSummaryCards | `TokenSummaryCards.tsx` | Token 统计卡片 |
| TokenDailyTable | `TokenDailyTable.tsx` | 每日使用表格 |
| TokenTrendChart | `TokenTrendChart.tsx` | 使用趋势图表 |
| TokenFilterBar | `TokenFilterBar.tsx` | 筛选栏 |

#### 分支管理 (`components/branch/`)

| 组件 | 文件 | 说明 |
|---|---|---|
| BranchPanel | `BranchPanel.tsx` | 分支面板 |
| BranchSelector | `BranchSelector.tsx` | 分支选择器 |
| BranchCompareDialog | `BranchCompareDialog.tsx` | 分支对比对话框 |
| BranchMergeDialog | `BranchMergeDialog.tsx` | 分支合并对话框 |
| MainBranchBadge | `MainBranchBadge.tsx` | 主分支徽章 |

#### 团队设置 (`components/team/`)

| 组件 | 文件 | 说明 |
|---|---|---|
| TeamSettings | `TeamSettings.tsx` | 团队设置 |

#### 消息 (`components/messages/`)

| 组件 | 文件 | 说明 |
|---|---|---|
| PriorityBadge | `PriorityBadge.tsx` | 优先级徽章 |

#### 认证 (`components/auth/`)

| 组件 | 文件 | 说明 |
|---|---|---|
| RequireAuth | `RequireAuth.tsx` | 认证守卫 |

### 提供者 (`components/providers/`)

| 组件 | 文件 | 说明 |
|---|---|---|
| ThemeProvider | — | 主题提供者 |
| QueryProvider | — | React Query 提供者 |

### 其他 (`components/` 根目录)

| 组件 | 文件 | 说明 |
|---|---|---|
| DocSearchBox | `DocSearchBox.tsx` | 文档搜索框 |
| DocViewer | `DocViewer.tsx` | 文档查看器 |
| FileTree | `FileTree.tsx` | 文件树 |

---

## 设计规范

### Tailwind CSS 配置

- 使用 `tailwind-merge` 和 `clsx` 管理类名
- 支持暗色模式（`dark:` 前缀）
- 自定义颜色变量定义在 `tailwind.config.ts`

### 组件变体模式

```typescript
// 使用 cn() 工具函数合并类名
import { cn } from '@/lib/utils';

function Button({ className, variant = 'default', ...props }) {
  return (
    <button
      className={cn(
        'base-classes',
        {
          'variant-default': variant === 'default',
          'variant-destructive': variant === 'destructive',
        },
        className
      )}
      {...props}
    />
  );
}
```

### 组件导出

组件通过 `index.ts` 统一导出：

```typescript
// 导出示例
export { Button } from './button';
export { Card, CardHeader, CardContent, CardTitle } from './card';
```
