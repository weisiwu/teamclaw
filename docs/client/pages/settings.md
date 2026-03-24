# 设置页

## 页面路由

```
/settings
```

## 功能概述

系统设置页，包含「外观设置」和「团队管理」两个功能区域。外观设置提供浅色/深色/跟随系统三种主题切换；团队管理由 `TeamSettings` 组件提供。

## 组件结构

| 组件 | 来源 | 说明 |
|------|------|------|
| `TeamSettings` | `@/components/team/TeamSettings` | 团队设置面板 |
| `Monitor` / `Moon` / `Sun` | `lucide-react` | 主题图标 |
| `Users` | `lucide-react` | 团队图标 |
| `useTheme` | `next-themes` | 主题管理 Hook |
| `useAuth` | `@/lib/hooks/useAuth` | 认证 Hook |

## 页面状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `activeSection` | `'appearance' \| 'team'` | 当前功能区 |
| `theme` | `useTheme()` | 当前主题值 |
| `resolvedTheme` | `useTheme()` | 解析后的实际主题 |
| `mounted` | `useState<boolean>` | 主题挂载状态（防止 SSR 水合不匹配） |
| `user` | `useAuth()` | 当前登录用户 |

## 主题选项

| 值 | 标签 | 图标 | 说明 |
|-----|------|------|------|
| `light` | 浅色 | ☀️ Sun | 明亮主题 |
| `dark` | 深色 | 🌙 Moon | 暗黑主题 |
| `system` | 跟随系统 | 💻 Monitor | 自动匹配设备设置 |

## 主题状态同步

使用 `localStorage` 存储用户偏好，`next-themes` 自动处理主题切换和系统偏好监听。

## 角色映射

| Auth 角色 | TeamSettings 角色 |
|-----------|------------------|
| `admin` | `admin` |
| `vice_admin` | `owner` |
| `member` | `developer` |
| `viewer` | `viewer` |

## 页面跳转关系

- 侧边栏「设置」→ `/settings`
