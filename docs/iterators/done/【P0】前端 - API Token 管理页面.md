# 23【P0】前端 - API Token 管理页面

## 背景

后端完成 API Token CRUD 接口后（任务 20），需要在前端提供可视化管理界面，让用户可以在平台中录入、编辑、删除和验证 API Token。

## 页面位置

新增页面路由：`/settings/api-tokens`（作为设置页的子栏目）

或独立页面：`/api-tokens`（在 Sidebar 中添加入口，归属"系统配置"分组）

## 功能清单

### Token 列表视图

- 表格展示所有 Token，列：别名、Provider、模型列表、状态、月度用量/预算、调用次数、最后使用时间、操作
- 按 Provider 筛选（OpenAI / Anthropic / DeepSeek / 自定义）
- 按状态筛选（活跃 / 禁用 / 过期）
- 支持搜索（按别名）

### Token 创建/编辑弹窗

使用统一 Dialog 组件，表单字段：

| 字段 | 组件 | 说明 |
|------|------|------|
| 别名 | Input | 必填，如"公司 OpenAI 主账号" |
| Provider | Select | openai / anthropic / deepseek / custom |
| API Key | Input(password) | 必填，提交后脱敏显示 |
| Base URL | Input | 可选，Provider 为 custom 或 openai 时显示 |
| 可用模型 | Multi-Select/Tag Input | 手动输入或从预设列表选择 |
| 月度预算 | Input(number) | 可选，美元 |
| 备注 | Textarea | 可选 |

### Token 操作

- **验证**：调用 `/api/v1/admin/api-tokens/:id/verify`，显示验证结果（成功/失败+错误信息）
- **启用/禁用**：切换状态
- **删除**：二次确认弹窗，提示"该 Token 已绑定 N 个 Agent，删除后将解除绑定"

### 用量仪表盘（Token 卡片内）

- 当月用量进度条（用量/预算）
- 累计调用次数
- 超预算警告标识

## UI 组件使用

- `Card` — Token 卡片/列表项
- `Dialog` — 创建/编辑弹窗
- `Button` — 操作按钮
- `Input` — 表单输入
- `Select` — Provider 选择
- `Badge` — 状态标签（active=绿, disabled=灰, expired=红）
- `Switch` — 启用/禁用切换
- `Skeleton` — 加载态

## 前端文件

- `app/api-tokens/page.tsx` — 页面组件
- `lib/api/apiTokens.ts` — API 封装（CRUD + verify）
- `hooks/useApiTokens.ts` — React Query hooks
- `app/api/v1/admin/api-tokens/route.ts` — Next.js 代理路由（GET/POST）
- `app/api/v1/admin/api-tokens/[id]/route.ts` — Next.js 代理路由（GET/PUT/DELETE）
- `app/api/v1/admin/api-tokens/[id]/verify/route.ts` — Next.js 代理路由（POST）
- Sidebar 添加菜单项

## 依赖关系

- 依赖任务 20（后端 API Token CRUD）
- 可与任务 24（Agent Token 配置 UI）并行开发
