# 26【P1】Token 用量统计与监控看板

## 背景

当前 Token 消耗统计页（`app/tokens/page.tsx`）展示的是全局维度的 token 用量，没有按 API Token 和 Agent 维度拆分。完成任务 20-22 后，系统将支持多个 API Token 和 Agent-Token 绑定，需要对应的用量统计和监控能力。

## 目标

扩展 Token 用量统计，支持按 API Token 和 Agent 两个维度查看消耗，并增加预算预警能力。

## 功能清单

### 1. 按 API Token 维度统计

- 每个 Token 的：当月用量、累计用量、调用次数、成功率、平均响应时间
- 预算进度条（当月用量 / 月度预算）
- 超预算标红 + 系统通知

### 2. 按 Agent 维度统计

- 每个 Agent 的：调用次数、token 消耗、成本、使用的 Token 分布
- 按时间范围筛选（今日 / 本周 / 本月 / 自定义）

### 3. 预算预警机制

| 阈值 | 行为 |
|------|------|
| 80% 预算 | 黄色警告标识 |
| 100% 预算 | 红色标识 + Toast 通知 |
| 超预算 | 可选：自动禁用该 Token（需在 Token 配置中开启） |

### 4. 调用日志明细

- 表格：时间、Agent、Token（脱敏）、模型、输入/输出 token、耗时、状态
- 支持导出 CSV

## 后端接口扩展

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/api-tokens/:id/usage` | 单个 Token 用量详情 |
| GET | `/api/v1/admin/api-tokens/usage/summary` | 所有 Token 用量汇总 |
| GET | `/api/v1/admin/agents/:name/token-usage` | Agent 维度用量统计 |
| GET | `/api/v1/admin/llm-calls` | 调用日志明细（分页） |

## 前端文件

- `app/tokens/page.tsx` — 改造：新增 "按 Token" 和 "按 Agent" 视图 Tab
- `lib/api/tokenUsage.ts` — API 封装
- `hooks/useTokenUsage.ts` — React Query hooks

## 依赖关系

- 依赖任务 20（Token 数据模型）和任务 22（LLM 服务改造 — 用量记录）
- 可在任务 22 完成后开发
