# 系统配置

## 页面路由

```
/admin/config
```

## 页面功能描述

系统配置页面（需要管理员权限），提供系统级配置的查看和修改：
- **LLM 模型配置**：默认模型、Temperature、最大输出 Token
- **功能开关**：文件上传、Webhook、自动备份、AI 摘要等
- **安全策略**：允许 IP 范围、删除审批、Session 超时
- **权限配置**：查看各角色的能力矩阵（只读）

支持配置导入/导出为 JSON，以及重置为默认值。

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `LLMConfigForm` | 内联组件 | LLM 模型配置表单 |
| `FeatureToggleList` | 内联组件 | 功能开关列表 |
| `SecuritySettings` | 内联组件 | 安全策略设置 |
| `PermissionsMatrix` | 内联组件 | 权限矩阵表格（只读） |
| `PermissionGuard` | `@/components/layout/PermissionGuard` | 权限守卫 |
| `Dialog` | `@/components/ui/dialog` | 重置确认弹窗 |
| `useToast` | `@/components/ui/toast` | Toast 通知 Hook |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `config` | `useState<SystemConfig \| null>` | 系统配置数据 |
| `loading` | `useState<boolean>` | 加载状态 |
| `saving` | `useState<boolean>` | 保存状态 |
| `activeTab` | `useState<'llm' \| 'features' \| 'security' \| 'permissions'>` | 当前 Tab |
| `abilities` | `useState<Ability[]>` | 能力列表（权限 Tab） |
| `abilitiesLoading` | `useState<boolean>` | 能力加载状态 |
| `showResetConfirm` | `useState<boolean>` | 重置确认弹窗 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `fetch GET` | `/api/v1/admin/config` | 获取系统配置 |
| `fetch PUT` | `/api/v1/admin/config` | 保存系统配置 |
| `fetch POST` | `/api/v1/admin/config/reset` | 重置为默认值 |
| `fetch GET` | `/api/v1/admin/config/export` | 导出配置为 JSON |
| `fetch POST` | `/api/v1/admin/config/import` | 导入配置 JSON |
| `fetch GET` | `/api/v1/abilities` | 获取能力列表（权限 Tab） |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/admin/audit` | — | 审计日志页面 |
| `/capabilities` | — | 辅助能力管理 |

## 配置 Tab 说明

### LLM 模型

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `defaultModel` | `string` | 默认使用的 LLM 模型 |
| `temperature` | `number` (0-2) | 生成随机性，0=确定性强，2=创意性强 |
| `maxTokens` | `number` | 模型最大输出 Token 数 |

### 功能开关

| 功能 | 默认 | 说明 |
|------|------|------|
| `fileUpload` | — | 允许上传文件和附件 |
| `webhook` | — | 启用 Webhook 通知 |
| `autoBackup` | — | 自动备份系统数据 |
| `aiSummary` | — | 自动生成版本摘要 |

### 安全策略

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `allowedIpRanges` | `string[]` | 允许访问的 IP 范围 |
| `requireApprovalForDelete` | `boolean` | 删除重要资源需审批 |
| `sessionTimeoutMinutes` | `number` | Session 超时时间（分钟） |
