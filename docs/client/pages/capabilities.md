# 辅助能力管理

## 页面路由

```
/capabilities
```

## 页面功能描述

辅助能力（Abilities）管理页面，允许管理员配置系统能力的启用/禁用状态：
- 展示所有能力列表（名称、描述、所需角色、当前状态）
- 管理员可切换每个能力的开关状态
- 非管理员用户只能查看，无法修改

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `AbilityCard` | 内联组件 | 单个能力卡片 |
| `RoleBadge` | 内联组件 | 角色徽章展示 |
| `ToggleSwitch` | 内联组件 | 开关切换按钮 |
| `Card` | `@/components/ui/card` | 卡片容器 |
| `CardContent` | `@/components/ui/card` | 卡片内容区 |
| `Button` | `@/components/ui/button` | 重试按钮 |
| `EmptyState` | `@/components/ui/empty-state` | 空状态 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `abilities` | `useState<Ability[]>` | 能力列表数据 |
| `loading` | `useState<boolean>` | 初始加载状态 |
| `error` | `useState<string \| null>` | 错误信息 |
| `toggling` | `useState<string \| null>` | 当前正在切换的能力 ID |
| `userRole` | 本地变量 | 当前用户角色（从 localStorage 读取） |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `fetch GET` | `/api/v1/abilities` | 获取能力列表 |
| `fetch PUT` | `/api/v1/abilities/[id]/toggle` | 切换能力状态 |

```typescript
// PUT /api/v1/abilities/[id]/toggle
{ enabled: boolean }
```

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/admin/config` | — | 相关配置页面 |

## 权限控制

- 切换能力开关需要 `admin` 或 `sub_admin` 角色
- 普通用户（`user` 角色）只能查看，切换按钮显示 `cursor-not-allowed` 状态
- 页面底部显示警告提示非管理员无法修改

## 角色类型

| 角色 | 权限 |
|------|------|
| `admin` | 完全控制（红色徽章） |
| `sub_admin` | 受限管理权限（橙色徽章） |
| `all` | 全体成员可见（灰色徽章） |
