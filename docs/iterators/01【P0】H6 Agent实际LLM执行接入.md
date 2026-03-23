# 【P0】H6 Agent 实际 LLM 执行接入

> 优先级：P0（高）
> 前置依赖：无（可独立执行）
> 关联模块：Agent 导入、协作机制

---

## 1. 问题描述

架构文档定义了 5 个 Agent 角色（main/pm/coder1/coder2/reviewer），各自有明确分工。代码中已实现完整的 Agent 管理框架：

| 已实现 | 文件 | 状态 |
|--------|------|------|
| Agent 运行时管理 | `agentService.ts` | ✅ 配置查询、状态追踪、负载均衡 |
| 执行引擎 | `agentExecution.ts` | ⚠️ 只创建执行记录，**不调用 LLM** |
| 派发规则 | `dispatchService.ts` | ✅ 等级校验、权限检查 |
| 健康监控 | `agentHealth.ts` | ✅ 心跳、自动恢复 |
| LLM 服务 | `llmService.ts` | ✅ 三级模型（light/medium/strong）+ 自动路由 |
| API 路由 | `routes/agent.ts` | ✅ 完整的 CRUD + 执行 + 健康 API |

**核心断点：** `agentExecution.ts` 的 `dispatchToAgent()` 函数创建 `ExecutionContext` 后立即返回，状态永远停留在 `pending`。它从未调用 `llmService.ts` 的 `llmCall()` 或任何外部 LLM/OpenClaw 接口。

```typescript
// agentExecution.ts:44-89（当前行为）
export function dispatchToAgent(req: DispatchRequest): ExecutionContext | { error: string } {
  // ... 权限校验 ...
  // ... 创建 context ...
  executionLogs.set(executionId, context);  // ← 存储记录
  updateAgentStatus(targetAgent, "running", taskId);  // ← 更新状态
  return context;  // ← 直接返回，从未执行 LLM 调用
}
```

**后果：**
- Agent 永远不会真正执行任务
- coder 无法写代码、reviewer 无法审代码、pm 无法整理需求
- 整个 Agent 协作只是状态管理的空壳

---

## 2. 改造目标

### 2.1 dispatchToAgent 真正执行 LLM

```
dispatchToAgent()
  ├── 权限校验 ✅（已有）
  ├── 状态更新 ✅（已有）
  ├── 立即返回 executionId（异步执行）
  └── 后台异步：
        ├── 构建 system prompt（注入角色定义 + 项目记忆 + 任务上下文）
        ├── 调用 llmService.llmAutoRoute()（自动选择模型层级）
        ├── 处理 LLM 响应
        ├── 更新 execution 状态（completed/failed）
        └── 触发后续钩子（通知、任务进度更新）
```

### 2.2 为每个 Agent 角色定义 System Prompt

| Agent | 核心 Prompt |
|-------|-----------|
| main | 你是项目主管，负责任务分配和进度管理。不做具体编码工作。分析需求后决定派发给哪个 coder 或 reviewer。 |
| pm | 你是产品经理，负责需求拆分、细化和收集整理消息。先提出不多于 N 个问题，等待回复后推进。 |
| coder1/coder2 | 你是程序员，负责代码编写。根据任务描述、项目架构和 Skills 完成代码实现。 |
| reviewer | 你是代码审查员，负责代码审查和问题修复。检查代码质量、安全性、一致性。 |

### 2.3 集成项目记忆

在 LLM 调用前注入：
- 项目摘要（来自 `summaryGenerator`）
- 相关 Skills（来自 `skillGenerator`）
- 任务上下文（来自 `taskMemory`）
- 向量检索结果（来自 `vectorStore`）

---

## 3. 实施步骤

| # | 操作 | 涉及文件 |
|---|------|---------|
| 1 | 为每个 Agent 角色创建 system prompt 模板 | 新建 `server/src/prompts/agentPrompts.ts` |
| 2 | 重写 `dispatchToAgent` 为异步执行 + 真实 LLM 调用 | `server/src/services/agentExecution.ts` |
| 3 | 在 LLM 调用前注入项目记忆和任务上下文 | `agentExecution.ts` + `taskMemory.ts` + `vectorStore.ts` |
| 4 | 处理 LLM 响应：解析结果、更新执行状态、记录 token 用量 | `agentExecution.ts` + `llmCostTracker.ts` |
| 5 | 添加执行超时机制 | `agentExecution.ts` |
| 6 | main Agent 响应后自动派发子任务给 coder/reviewer | `agentExecution.ts` + `dispatchService.ts` |

---

## 4. 涉及文件

### 修改

| 文件 | 改动 |
|------|------|
| `server/src/services/agentExecution.ts` | 核心改造：dispatchToAgent 增加真实 LLM 调用 |
| `server/src/services/agentService.ts` | 完善 getAgentSessions 返回真实数据（非模拟） |

### 新建

| 文件 | 内容 |
|------|------|
| `server/src/prompts/agentPrompts.ts` | 5 个 Agent 角色的 system prompt 模板 |

---

## 5. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | POST /agents/execute 后 LLM 被实际调用 | 检查 token 消耗记录 |
| 2 | execution 状态从 pending → running → completed 正常流转 | 轮询 GET /agents/executions/:id |
| 3 | LLM 响应内容写入 execution.result | API 查询验证 |
| 4 | 超时时 execution 标记为 timeout | 设置短超时测试 |
| 5 | main Agent 能自动派发子任务给 coder | 日志验证 |
| 6 | 不同复杂度任务自动选择不同模型层级 | 检查 execution.model 字段 |
