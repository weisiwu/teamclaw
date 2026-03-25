# 39【P0】侧边栏精简 - Token 管理三合一

## 背景
「Token 管理」「Token 分配」「API Token」三个侧边栏入口本质都属于 Token 管理功能域，应合并为一个入口。

## 目标
- 将 `/tokens`、`/agent-tokens`、`/api-tokens` 三个页面合并为一个 `/tokens` 页面
- 侧边栏只保留一个「Token 管理」入口
- 使用 Tab 组件组织三个子功能：用量统计、Agent Token 分配、API Key 管理

## 技术方案
1. 重构 `/tokens/page.tsx`，使用 Tab 组件整合三个页面
2. 从 `Sidebar.tsx` 移除「Token 分配」和「API Token」两个 menuItem
3. 保留原路由做 redirect
4. 迁移 `components/tokens/` 中的组件

## 实现文件
- `components/layout/Sidebar.tsx` — 移除多余入口
- `app/tokens/page.tsx` — 重构为 Tab 页面
- `app/agent-tokens/page.tsx` — 改为 redirect
- `app/api-tokens/page.tsx` — 改为 redirect
- `components/tokens/*` — 组件整合

## 依赖关系
- 前置：—
- 后续：45【P1】非核心功能页面精简与合并

## 验证方式
1. 侧边栏只有一个「Token 管理」入口
2. 三个 Tab 分别展示用量统计、Agent 分配、API Key
3. 原 `/agent-tokens` 和 `/api-tokens` 自动跳转
4. 数据加载正常，CRUD 操作无丢失
5. **至少 5 轮修改验证**：每轮检查一个维度（布局→数据→交互→响应式→暗色模式）

## 状态
⏳ 待执行
