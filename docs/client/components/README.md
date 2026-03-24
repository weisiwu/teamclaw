# 前端组件文档

本文档详细描述 teamclaw 前端所有 UI 组件、业务组件和布局组件。

## 目录结构

```
docs/client/components/
├── README.md           # 本文件
├── index.md            # 组件总览
├── ui/                 # 基础 UI 组件
│   ├── button.md
│   ├── badge.md
│   ├── input.md
│   ├── card.md
│   ├── dialog.md
│   ├── dropdown-menu.md
│   ├── tabs.md
│   ├── select.md
│   ├── toast.md
│   ├── progress.md
│   ├── switch.md
│   ├── checkbox.md
│   ├── label.md
│   ├── popover.md
│   ├── radio-group.md
│   ├── empty-state.md
│   ├── error-boundary.md
│   └── projects-skeleton.md
├── layout/             # 布局组件
│   ├── header.md
│   ├── sidebar.md
│   ├── applayout.md
│   ├── breadcrumb.md
│   └── permission-guard.md
├── versions/           # 版本管理组件（40+）
│   ├── index.md
│   ├── version-panel.md
│   ├── build-log-viewer.md
│   ├── build-trigger-dialog.md
│   ├── version-tags-panel.md
│   ├── rollback-dialog.md
│   ├── snapshot-compare-dialog.md
│   └── ...             # 更多组件文档
├── branch/             # 分支管理组件
│   └── index.md
├── agent-team/         # Agent 团队组件
│   └── index.md
├── messages/           # 消息组件
│   └── index.md
├── tokens/            # Token 统计组件
│   └── index.md
├── members/           # 成员管理组件
│   └── index.md
├── team/              # 团队设置组件
│   └── index.md
├── theme/             # 主题组件
│   └── index.md
├── providers/         # Context Providers
│   └── index.md
├── auth/             # 认证组件
│   └── index.md
└── root-components.md # 根级组件
```

## 组件分类

### UI 基础组件 (ui/)

基于 shadcn/ui 和 Radix UI 封装的通用组件：

- **Button**: 按钮，支持多种变体和加载状态
- **Badge**: 状态标签
- **Input**: 文本输入框
- **Card**: 卡片容器
- **Dialog**: 模态对话框
- **DropdownMenu**: 下拉菜单
- **Tabs**: 标签页
- **Select**: 选择器
- **Toast**: 轻量提示
- **Progress**: 进度条
- **Switch**: 开关
- **Checkbox**: 复选框
- **Label**: 表单标签
- **Popover**: 弹出框
- **RadioGroup**: 单选组
- **EmptyState**: 空状态占位
- **ErrorBoundary**: 错误边界

### 布局组件 (layout/)

- **Header**: 顶部导航栏
- **Sidebar**: 侧边导航栏
- **AppLayout**: 主布局容器
- **Breadcrumb**: 面包屑导航
- **PermissionGuard**: 权限守卫

### 版本管理组件 (versions/)

40+ 个组件，覆盖版本管理的所有功能：

- **VersionPanel**: 版本主面板
- **BuildLogViewer**: 构建日志查看器
- **BuildTriggerDialog**: 触发构建
- **VersionTagsPanel**: 标签管理
- **RollbackDialog**: 回滚确认
- **SnapshotCompareDialog**: 版本对比
- **UpgradeConfigDialog**: 升级配置
- 等等...

### 分支管理组件 (branch/)

- **BranchPanel**: 分支主面板
- **BranchSelector**: 分支选择器
- **BranchMergeDialog**: 分支合并
- **BranchCompareDialog**: 分支对比

### Agent 团队组件 (agent-team/)

- **AgentCard**: Agent 卡片
- **AgentStatusBadge**: Agent 状态
- **HierarchyChart**: 层级关系图
- **PipelineStatusPanel**: 流水线状态

### Token 统计组件 (tokens/)

- **TokenSummaryCards**: 用量汇总
- **TokenDailyTable**: 每日明细
- **TokenTrendChart**: 趋势图表

## 设计原则

1. **组合优于继承**: 使用 Props 组合而非继承
2. **受控与非受控**: 支持受控（value + onChange）和非受控（defaultValue）两种模式
3. **可访问性**: 遵循 ARIA 规范
4. **一致性**: 统一的 Props 命名和组件结构
5. **类型安全**: 完整的 TypeScript 类型定义

## 组件开发规范

### 命名规范

- 组件文件: `PascalCase.tsx`
- Props 接口: `ComponentNameProps`
- 样式工具: 使用 `cn()` 合并类名

### Props 设计

```tsx
interface ComponentProps {
  // 必填属性
  requiredProp: string;

  // 可选属性
  optionalProp?: boolean;

  // 回调
  onChange?: (value: string) => void;

  // children
  children?: React.ReactNode;
}
```

### 状态管理

- 简单状态: useState
- 服务器状态: React Query (via ReactQueryProvider)
- 全局状态: React Context

## 相关文档

- [页面文档](../pages/)
- [Hooks 文档](../hooks/) (待完成)
- [API 层文档](../api/) (待完成)
