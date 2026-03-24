# 24【P0】前端 - Agent Token 绑定配置 UI

## 背景

后端完成 Agent-Token 绑定接口后（任务 21），需要在前端提供配置界面，让用户可以为每个 Agent 指定使用哪些 API Token，并设置优先级和适用规则。

## 入口位置

两个入口：

1. **Agent 团队页**（`app/agent-team/page.tsx`）：点击 Agent 卡片 → 详情面板 → "Token 配置" Tab
2. **全局矩阵视图**：新增 `/agent-tokens` 页面，显示 Agent × Token 的绑定矩阵

## 功能清单

### 1. Agent 详情 - Token 绑定 Tab

在 Agent 详情面板中新增 "Token 配置" 选项卡：

- 显示当前 Agent 已绑定的 Token 列表，按优先级排序
- 每个绑定项显示：Token 别名、Provider 图标、优先级、层级限定、状态开关
- **添加绑定**按钮 → 弹窗选择 Token + 设置规则
- **拖拽排序**调整优先级
- **删除绑定**：移除该 Agent 与 Token 的关联

### 2. 绑定配置弹窗

| 字段 | 组件 | 说明 |
|------|------|------|
| Token | Select | 从已录入的 Token 列表中选择（显示别名 + Provider） |
| 优先级 | Input(number) | 1 最高，自动填入当前最大值+1 |
| 层级限定 | Multi-Select | light / medium / strong，为空则全部适用 |
| 模型限定 | Multi-Select | 从选中 Token 的 models 列表中选择 |
| 启用 | Switch | 默认开启 |

### 3. 全局绑定矩阵页（`/agent-tokens`）

矩阵视图：

```
              Token-A(OpenAI)  Token-B(Anthropic)  Token-C(DeepSeek)
  main        ✅ P1(strong)    ✅ P2(medium)        —
  pm          —                ✅ P1(strong)        ✅ P2(light)
  reviewer    ✅ P1(medium)    —                    —
  coder1      —                —                    ✅ P1(light)
  coder2      —                —                    ✅ P1(light)
```

- 点击单元格可快速添加/编辑/删除绑定
- 未绑定显示 "—"，已绑定显示优先级和层级限定
- 底部统计：每个 Token 被多少 Agent 使用

### 4. 无绑定提示

Agent 未绑定任何 Token 时，显示提示：
> 该 Agent 尚未配置专属 Token，将使用系统全局环境变量中的 API Key。
> [配置 Token →]

## UI 组件使用

- `Card` — Agent Token 绑定卡片
- `Dialog` — 绑定配置弹窗
- `Select` — Token 选择、层级选择
- `Switch` — 启用/禁用
- `Badge` — Provider 标签、优先级标签
- `Button` — 操作按钮
- `Table` — 矩阵视图

## 前端文件

- `app/agent-team/page.tsx` — 修改：Agent 详情面板添加 Token 配置 Tab
- `app/agent-tokens/page.tsx` — 新增：全局绑定矩阵页
- `lib/api/agentTokenBindings.ts` — API 封装
- `hooks/useAgentTokenBindings.ts` — React Query hooks
- `app/api/v1/admin/agents/[name]/token-bindings/route.ts` — Next.js 代理路由
- `app/api/v1/admin/agent-token-bindings/[id]/route.ts` — Next.js 代理路由
- Sidebar 添加 "Token 分配" 菜单项

## 依赖关系

- 依赖任务 21（后端绑定接口）
- 依赖任务 23（Token 管理页 — 需要 Token 列表数据）
