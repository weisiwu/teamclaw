# 【P0】H7 消息→任务→Agent 流水线串联

> 优先级：P0（高）
> 前置依赖：H6（Agent 实际 LLM 执行接入）
> 关联模块：消息机制、任务机制、Agent 导入、协作机制

---

## 1. 问题描述

架构文档定义了完整的端到端流程：

```
用户消息 → 消息队列 → @Agent检测 → 权限校验 → 任务创建 → Agent执行 → 结果回复
```

代码中三大模块（消息 / 任务 / Agent）各自实现了丰富的内部逻辑，但 **模块之间完全断裂**：

| 断裂点 | 上游 | 下游 | 现状 |
|--------|------|------|------|
| 消息 → 任务 | `messageQueue.enqueue()` | `taskLifecycle.createTask()` | ❌ 消息入队后只改队列状态，从不创建任务 |
| 消息 → Agent | `channelAdapter.detectMentionedAgent()` | `agentExecution.dispatchToAgent()` | ❌ 检测到 @agent 后丢弃该信息，不触发执行 |
| 任务 → Agent | `taskLifecycle.transition('running')` | `dispatchService.dispatchTask()` | ❌ 任务状态变更不触发 Agent 派发 |
| Agent → 消息回复 | `agentExecution.updateExecution()` | 飞书/微信发送 | ❌ 执行完成后不回复消息通道 |
| 任务完成 → 版本 | `taskLifecycle.transition('done')` | `autoBump.bump()` | ❌ 任务完成不触发自动版本升级 |

**后果：**
- 消息进入队列后石沉大海，用户收不到任何响应
- 必须手动通过 API 创建任务和触发 Agent，无法通过聊天驱动
- 整个系统无法按架构文档预期的「消息驱动」模式运行

---

## 2. 改造目标

### 2.1 消息处理主管道

```
POST /messages (消息入口)
  ├── channelAdapter.adapt() → 统一格式
  ├── enrichMessagePriority() → 计算优先级
  ├── messageQueue.enqueue() → 入队
  │
  ├── 【新增】检测 mentionedAgent
  │     ├── @main → 权限校验 → 创建任务（pending）→ main Agent 开始讨论
  │     ├── @pm → 权限校验 → pm Agent 直接响应
  │     └── 无@：普通消息，存储 + 向量化
  │
  ├── 【新增】立即回复「消息已收到，稍后处理」
  └── 【新增】Agent 执行完成后 → 回复消息通道
```

### 2.2 任务生命周期联动

```
任务创建(pending)
  → main/pm 讨论确认
  → 老板确认 → 任务变为 running
  → main 派发给 coder → coder 执行 → reviewer 审查
  → 全部完成 → 任务变为 done
  → 【新增】触发 autoBump 版本升级
  → 【新增】触发群聊通知
```

### 2.3 Boss 消息抢占

架构文档要求：「老板说的话，清空前面所有任务，只做老板的」

```
admin 角色消息进入
  ├── preemptionService 检查优先级
  ├── 如果触发抢占
  │     ├── 暂停当前 Agent 执行
  │     ├── 暂停当前任务
  │     ├── 群聊通知：「xxx 的任务已被暂停」
  │     └── 开始处理 admin 消息
  └── 恢复机制：admin 任务完成后恢复被暂停的任务
```

---

## 3. 实施步骤

| # | 操作 | 涉及文件 |
|---|------|---------|
| 1 | 创建消息处理管道（MessagePipeline） | 新建 `server/src/services/messagePipeline.ts` |
| 2 | 在 POST /messages 路由中接入管道 | `server/src/routes/message.ts` |
| 3 | 管道检测 @agent → 调用 permissionService → 创建任务 | `messagePipeline.ts` + `permissionService.ts` + `taskLifecycle.ts` |
| 4 | 管道中触发 Agent 执行 | `messagePipeline.ts` + `agentExecution.ts` |
| 5 | Agent 执行完成回调 → 回复消息通道 | 新建 `server/src/services/messageReply.ts` |
| 6 | 注册 taskLifecycle onStatusChange 钩子 → autoBump | `server/src/services/taskLifecycleHooks.ts` |
| 7 | 注册 taskLifecycle onStatusChange 钩子 → 群聊通知 | `taskLifecycleHooks.ts` + `messageReply.ts` |
| 8 | 消息入队后立即发送「已收到」回复 | `messagePipeline.ts` + `messageReply.ts` |
| 9 | 抢占触发时暂停当前 Agent 执行 + 通知 | `preemptionService.ts` + `agentExecution.ts` |

---

## 4. 涉及文件

### 新建

| 文件 | 内容 |
|------|------|
| `server/src/services/messagePipeline.ts` | 消息处理主管道：@检测 → 权限 → 任务创建 → Agent 派发 |
| `server/src/services/messageReply.ts` | 消息回复服务：统一封装飞书/微信/Web 回复 |
| `server/src/services/taskLifecycleHooks.ts` | 任务生命周期钩子：完成→autoBump、完成→通知 |

### 修改

| 文件 | 改动 |
|------|------|
| `server/src/routes/message.ts` | POST / 中接入 messagePipeline |
| `server/src/services/preemptionService.ts` | 抢占时联动暂停 Agent 执行 |
| `server/src/services/agentExecution.ts` | 执行完成后触发回复回调 |
| `server/src/services/taskLifecycle.ts` | 注册 autoBump 和通知钩子 |

---

## 5. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 发送 @main 消息 → 自动创建任务 | 查询 /tasks 列表出现新任务 |
| 2 | 发送 @pm 消息 → pm Agent 实际执行并回复 | 检查 execution 记录和回复内容 |
| 3 | 消息入队后立即收到「已收到」回复 | 检查消息通道回复 |
| 4 | 普通员工 @main → 收到「正在忙」拒绝回复 | 检查权限校验和回复 |
| 5 | admin 消息触发抢占 → 当前任务暂停 + 通知 | 检查任务和 Agent 状态 |
| 6 | 任务完成 → 自动版本升级 | 检查 git tag 记录 |
| 7 | 任务完成 → 群聊通知 | 检查消息通道回复 |

---

## 6. 架构文档对应关系

| 架构文档要求 | 对应实现 |
|------------|---------|
| 「每个明确 AT 机器人的消息都算作任务的开始」 | messagePipeline @检测 → createTask |
| 「在 agent 可以做出响应前的信息，立刻给予回复，消息已收到」 | 入队后立即回复 |
| 「消息队列需要支持动态高优先级」 | preemptionService + Agent 暂停联动 |
| 「老板说的话，清空前面所有任务」 | admin 角色抢占 + 任务暂停 |
| 「任务完成后，自动版本升级」 | taskLifecycleHooks → autoBump |
| 「形成任务后，由 pm 同步任务信息」 | taskLifecycleHooks → messageReply |
