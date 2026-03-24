# 业务组件

> `components/agent-team/`, `components/members/`, `components/tokens/`, `components/branch/`, `components/team/`, `components/messages/`, `components/auth/`

---

## Agent 团队组件

### `components/agent-team/`

---

#### AgentCard

**文件**: `AgentCard.tsx`

### 功能

Agent 卡片组件，显示 Agent 状态、负载、能力信息。

### Props

```typescript
interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    status: 'idle' | 'busy' | 'offline';
    loadScore?: number;
    capabilities?: string[];
    currentTask?: {
      id: string;
      name: string;
    };
  };
  onView?: (id: string) => void;
  onConfigure?: (id: string) => void;
}
```

### 使用示例

```tsx
import { AgentCard } from '@/components/agent-team';

<AgentCard
  agent={agent}
  onView={(id) => router.push(`/agent-team/${id}`)}
/>
```

---

#### AgentStatusBadge

**文件**: `AgentStatusBadge.tsx`

### 功能

Agent 状态徽章，显示在线/忙碌/离线状态。

### Props

```typescript
interface AgentStatusBadgeProps {
  status: 'idle' | 'busy' | 'offline';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}
```

### 状态颜色

| 状态 | 颜色 | 说明 |
|---|---|---|
| `idle` | 绿色 | 空闲 |
| `busy` | 黄色 | 忙碌 |
| `offline` | 灰色 | 离线 |

### 使用示例

```tsx
import { AgentStatusBadge } from '@/components/agent-team';

<AgentStatusBadge status="busy" showLabel />
```

---

#### AgentDetailPanel

**文件**: `AgentDetailPanel.tsx`

### 功能

Agent 详情面板，展示完整 Agent 信息。

### Props

```typescript
interface AgentDetailPanelProps {
  agentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

---

#### HierarchyChart

**文件**: `HierarchyChart.tsx`

### 功能

Agent 层级关系图表。

### Props

```typescript
interface HierarchyChartProps {
  agents: Array<{
    id: string;
    name: string;
    parentId?: string;
  }>;
  onSelect?: (id: string) => void;
}
```

---

#### PipelineStatusPanel

**文件**: `PipelineStatusPanel.tsx`

### 功能

流水线状态面板，展示 Agent 执行流水线状态。

### Props

```typescript
interface PipelineStatusPanelProps {
  pipelines: Array<{
    id: string;
    name: string;
    status: 'running' | 'completed' | 'failed';
    progress: number;
    agents: string[];
  }>;
  loading?: boolean;
}
```

---

## 成员管理组件

### `components/members/`

---

#### MemberForm

**文件**: `MemberForm.tsx`

### 功能

成员信息表单，支持添加/编辑成员。

### Props

```typescript
interface MemberFormProps {
  member?: {
    id?: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'viewer';
    status: 'active' | 'inactive';
  };
  onSubmit: (data: MemberFormData) => void;
  onCancel?: () => void;
  loading?: boolean;
}

interface MemberFormData {
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
}
```

### 使用示例

```tsx
import { MemberForm } from '@/components/members';

<MemberForm
  onSubmit={handleSubmit}
  onCancel={() => setShowForm(false)}
/>
```

---

## Token 管理组件

### `components/tokens/`

---

#### TokenSummaryCards

**文件**: `TokenSummaryCards.tsx`

### 功能

Token 使用统计卡片组。

### Props

```typescript
interface TokenSummaryCardsProps {
  stats: {
    todayUsed: number;
    weekUsed: number;
    monthUsed: number;
    estimatedCost: number;
  };
  loading?: boolean;
}
```

### 使用示例

```tsx
import { TokenSummaryCards } from '@/components/tokens';

<TokenSummaryCards stats={stats} />
```

---

#### TokenDailyTable

**文件**: `TokenDailyTable.tsx`

### 功能

每日 Token 使用量表格。

### Props

```typescript
interface TokenDailyTableProps {
  data: Array<{
    date: string;
    used: number;
    cost: number;
  }>;
  loading?: boolean;
  onPageChange?: (page: number) => void;
}
```

---

#### TokenTrendChart

**文件**: `TokenTrendChart.tsx`

### 功能

Token 使用趋势图表。

### Props

```typescript
interface TokenTrendChartProps {
  data: Array<{
    date: string;
    used: number;
  }>;
  period?: '7d' | '30d' | '90d';
  onPeriodChange?: (period: '7d' | '30d' | '90d') => void;
}
```

---

#### TokenFilterBar

**文件**: `TokenFilterBar.tsx`

### 功能

Token 筛选工具栏。

### Props

```typescript
interface TokenFilterBarProps {
  filters: {
    project?: string;
    agent?: string;
    dateRange?: [string, string];
  };
  onFilterChange?: (filters: TokenFilterBarProps['filters']) => void;
  projects?: Array<{ id: string; name: string }>;
  agents?: Array<{ id: string; name: string }>;
}
```

---

## 分支管理组件

### `components/branch/`

---

#### BranchPanel

**文件**: `BranchPanel.tsx`

### 功能

分支操作主面板。

### Props

```typescript
interface BranchPanelProps {
  branches: Array<{
    id: string;
    name: string;
    isMain: boolean;
    latestCommit: string;
    latestCommitAt: string;
  }>;
  onSelect?: (id: string) => void;
  onCreate?: () => void;
  onDelete?: (id: string) => void;
  onMerge?: (id: string) => void;
}
```

---

#### BranchSelector

**文件**: `BranchSelector.tsx`

### 功能

分支选择下拉组件。

### Props

```typescript
interface BranchSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  branches: Array<{
    id: string;
    name: string;
  }>;
  placeholder?: string;
  disabled?: boolean;
}
```

---

#### BranchCompareDialog

**文件**: `BranchCompareDialog.tsx`

### 功能

分支对比对话框。

### Props

```typescript
interface BranchCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceBranch?: { id: string; name: string };
  targetBranch?: { id: string; name: string };
  onCompare?: (source: string, target: string) => void;
}
```

---

#### BranchMergeDialog

**文件**: `BranchMergeDialog.tsx`

### 功能

分支合并确认对话框。

### Props

```typescript
interface BranchMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceBranch?: { id: string; name: string };
  targetBranch?: { id: string; name: string };
  onConfirm?: () => void;
  loading?: boolean;
}
```

---

#### MainBranchBadge

**文件**: `MainBranchBadge.tsx`

### 功能

主分支徽章。

### Props

```typescript
interface MainBranchBadgeProps {
  branchName: string;
  size?: 'sm' | 'md';
}
```

### 使用示例

```tsx
import { MainBranchBadge } from '@/components/branch';

<MainBranchBadge branchName="main" />
```

---

## 消息组件

### `components/messages/`

---

#### PriorityBadge

**文件**: `PriorityBadge.tsx`

### 功能

消息/任务优先级徽章。

### Props

```typescript
interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  showLabel?: boolean;
  size?: 'sm' | 'md';
}
```

### 优先级颜色

| 优先级 | 颜色 | 说明 |
|---|---|---|
| `low` | 灰色 | 低 |
| `medium` | 蓝色 | 中 |
| `high` | 橙色 | 高 |
| `urgent` | 红色 | 紧急 |

---

## 认证组件

### `components/auth/`

---

#### RequireAuth

**文件**: `RequireAuth.tsx`

### 功能

认证守卫，未登录用户重定向到登录页。

### Props

```typescript
interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}
```

### 使用示例

```tsx
import { RequireAuth } from '@/components/auth';

<RequireAuth redirectTo="/login">
  <ProtectedPage />
</RequireAuth>
```

---

## 团队设置组件

### `components/team/`

---

#### TeamSettings

**文件**: `TeamSettings.tsx`

### 功能

团队设置主面板。

### Props

```typescript
interface TeamSettingsProps {
  teamId: string;
  settings: {
    name: string;
    description?: string;
    defaultRole: 'admin' | 'user' | 'viewer';
    allowMemberInvite: boolean;
    requireApproval: boolean;
  };
  onUpdate?: (settings: TeamSettingsProps['settings']) => void;
}
```

---

## 其他根目录组件

### `components/` 根目录

---

#### DocSearchBox

**文件**: `DocSearchBox.tsx`

### 功能

文档搜索框组件。

### Props

```typescript
interface DocSearchBoxProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}
```

---

#### DocViewer

**文件**: `DocViewer.tsx`

### 功能

Markdown 文档渲染查看器。

### Props

```typescript
interface DocViewerProps {
  content: string;
  onHeadingClick?: (id: string) => void;
}
```

---

#### FileTree

**文件**: `FileTree.tsx`

### 功能

文件树组件，用于代码浏览器。

### Props

```typescript
interface FileTreeProps {
  files: Array<{
    id: string;
    name: string;
    type: 'file' | 'folder';
    children?: FileTreeProps['files'];
  }>;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onFolderToggle?: (id: string) => void;
}
```
