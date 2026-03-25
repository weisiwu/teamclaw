# 【Feature】F1 Agent 实际 LLM 执行与协作流程

> 优先级：高
> 前置依赖：【P0】H2 JWT 认证、【P0】H1 数据存储统一
> 关联模块：[Agent编排模块](../modules/Agent编排模块.md)

---

## 1. 现状分析

### 1.1 已有代码

| 文件 | 状态 | 说明 |
|------|------|------|
| `server/src/services/agentExecution.ts` | 骨架已有 | 创建执行记录，但不调用真实 LLM |
| `server/src/services/agentService.ts` | 已实现 | Agent CRUD、状态管理（内存存储） |
| `server/src/services/agentWorkspace.ts` | 已实现 | Agent 工作目录创建/清理 |
| `server/src/services/agentInit.ts` | 已实现 | 5 个 Agent 目录和默认配置初始化 |
| `server/src/services/agentHealth.ts` | 已实现 | Agent 健康检查 |
| `server/src/services/dispatchService.ts` | 已实现 | 等级校验、负载均衡选择 |
| `server/src/services/llmService.ts` | 骨架已有 | 多模型抽象，但未与 Agent 执行集成 |
| `server/src/constants/agents.ts` | 已实现 | 5 个 Agent 默认配置、等级矩阵 |

### 1.2 缺失功能

- **真实 LLM 调用**：`agentExecution.ts` 的 `dispatchToAgent()` 创建了 ExecutionContext，但没有真正调用 `llmService` 发送 Prompt 并获取结果
- **协作流水线**：main → pm → coder → reviewer 的完整协作链路未实现
- **PM 交互协议**：pm 结构化问答（不超过 N 个澄清问题）未实现
- **Reviewer 代码审查循环**：reviewer 与 coder 之间的对话修复循环未实现
- **执行结果处理**：LLM 返回结果后的解析、文件操作、Git 提交等未实现
- **共享资源锁**：`resourceLock.ts` 尚未创建，多 Agent 并发写入共享 workspace 可能冲突

---

## 2. 目标

实现 Agent 团队的真实 LLM 驱动协作流程：

```
用户消息 → main 对话确认需求
         → main 指派 pm
         → pm 结构化问答细化需求
         → pm 生成需求文档
         → main 指派 coder
         → coder 调用 LLM 生成代码
         → main 指派 reviewer
         → reviewer 审查代码
         → 有问题 → reviewer-coder 对话修复
         → 无问题 → main 通知完成
```

---

## 3. 实现步骤

### Step 1：LLM 执行器封装

在 `agentExecution.ts` 中集成真实 LLM 调用。

**改造 `dispatchToAgent()`**：

```typescript
// server/src/services/agentExecution.ts

import { llmService } from './llmService.js';

export async function executeAgent(context: ExecutionContext): Promise<ExecutionContext> {
  const agent = getAgent(context.targetAgent);
  if (!agent) throw new Error(`Agent ${context.targetAgent} not found`);

  context.status = 'running';
  context.startedAt = new Date().toISOString();
  updateAgentStatus(context.targetAgent, 'busy');

  try {
    // 1. 构建 Prompt（系统提示 + 角色提示 + 任务提示）
    const systemPrompt = buildSystemPrompt(agent);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: context.prompt },
    ];

    // 2. 选择模型等级
    const modelTier = getModelTierForAgent(agent.name);

    // 3. 调用 LLM
    const response = await llmService.chat({
      tier: modelTier,
      messages,
      maxTokens: 4096,
    });

    // 4. 解析结果
    context.result = response.content;
    context.status = 'completed';
    context.model = response.model;
  } catch (err) {
    context.status = 'failed';
    context.error = (err as Error).message;
  } finally {
    context.completedAt = new Date().toISOString();
    context.durationMs = Date.now() - new Date(context.startedAt!).getTime();
    updateAgentStatus(context.targetAgent, 'idle');
    releaseAgent(context.targetAgent);
  }

  return context;
}
```

### Step 2：Agent Prompt 模板系统

为每个 Agent 角色创建专用 Prompt 模板。

**新建 `server/src/services/agentPrompts.ts`**：

```typescript
export interface AgentPromptTemplate {
  role: string;
  systemPrompt: string;
  taskTemplate: string;
}

const AGENT_PROMPTS: Record<string, AgentPromptTemplate> = {
  main: {
    role: '主管',
    systemPrompt: `你是项目主管 main，职责：
    1. 与用户对话，理解和确认需求
    2. 将任务分配给合适的 Agent
    3. 审查最终结果，决定是否通过
    你不做具体开发工作。`,
    taskTemplate: '用户需求：{{prompt}}\n\n请分析需求并确认任务要求。',
  },
  pm: {
    role: '产品经理',
    systemPrompt: `你是产品经理 pm，职责：
    1. 细化用户需求，提出不超过 {{maxQuestions}} 个澄清问题
    2. 收到所有回复后，生成结构化需求文档
    3. 将需求同步给开发团队
    输出格式严格遵循 JSON。`,
    taskTemplate: '原始需求：{{prompt}}\n\n请提出澄清问题。',
  },
  coder1: {
    role: '程序员',
    systemPrompt: `你是程序员 coder1，职责：
    1. 根据需求文档编写代码
    2. 创建、修改文件
    3. 运行自测
    输出格式：JSON，包含 files（文件路径和内容）和 summary。`,
    taskTemplate: '需求文档：{{prompt}}\n\n项目上下文：{{context}}\n\n请编写代码。',
  },
  // ... coder2, reviewer 类似
};
```

### Step 3：PM 交互协议实现

**新建 `server/src/services/pmProtocol.ts`**：

```typescript
export interface ClarificationSession {
  sessionId: string;
  taskId: string;
  questions: string[];
  answers: Map<number, string>;
  totalQuestions: number;
  status: 'asking' | 'waiting' | 'completed';
  requirementDoc?: string; // 生成的需求文档
}

export class PMProtocol {
  private sessions: Map<string, ClarificationSession> = new Map();

  // 1. PM 生成澄清问题
  async generateQuestions(taskId: string, requirement: string): Promise<ClarificationSession>;

  // 2. 接收用户回答
  async submitAnswer(sessionId: string, questionIndex: number, answer: string): Promise<{
    remaining: number;
    isComplete: boolean;
  }>;

  // 3. 所有问题回答完毕后，生成需求文档
  async generateRequirementDoc(sessionId: string): Promise<string>;
}
```

### Step 4：协作流水线编排

**新建 `server/src/services/agentPipeline.ts`**：

```typescript
export interface PipelineStage {
  agent: string;
  action: 'confirm' | 'clarify' | 'code' | 'review' | 'notify';
  status: 'pending' | 'running' | 'completed' | 'failed';
  input?: string;
  output?: string;
}

export class AgentPipeline {
  // 完整协作流水线
  async execute(taskId: string, requirement: string): Promise<void> {
    // Stage 1: main 确认需求
    const confirmed = await this.runStage('main', 'confirm', requirement);

    // Stage 2: pm 细化需求
    const reqDoc = await this.runStage('pm', 'clarify', confirmed);

    // Stage 3: 选择 coder 执行
    const coder = await this.selectCoder();
    const codeResult = await this.runStage(coder, 'code', reqDoc);

    // Stage 4: reviewer 审查
    const reviewResult = await this.runStage('reviewer', 'review', codeResult);

    // Stage 5: 审查不通过则循环
    if (reviewResult.needsFix) {
      await this.reviewFixLoop(coder, 'reviewer', reviewResult, maxRetries: 3);
    }

    // Stage 6: main 通知完成
    await this.runStage('main', 'notify', reviewResult);
  }
}
```

### Step 5：Reviewer-Coder 对话修复循环

**新建 `server/src/services/reviewLoop.ts`**：

```typescript
export interface ReviewResult {
  approved: boolean;
  issues: Array<{
    file: string;
    line: number;
    severity: 'error' | 'warning' | 'suggestion';
    message: string;
    suggestedFix?: string;
  }>;
}

export async function reviewFixLoop(
  coderId: string,
  reviewerId: string,
  initialReview: ReviewResult,
  maxRounds: number = 3
): Promise<{ finalResult: ReviewResult; rounds: number }> {
  let currentReview = initialReview;
  let round = 0;

  while (!currentReview.approved && round < maxRounds) {
    round++;
    // 1. 将 review 意见发给 coder
    const fixResult = await executeAgent({
      targetAgent: coderId,
      prompt: `请根据以下审查意见修复代码：\n${JSON.stringify(currentReview.issues)}`,
    });

    // 2. reviewer 重新审查
    currentReview = await executeAgent({
      targetAgent: reviewerId,
      prompt: `请审查修复后的代码：\n${fixResult.result}`,
    });
  }

  return { finalResult: currentReview, rounds: round };
}
```

### Step 6：共享资源锁

**新建 `server/src/services/resourceLock.ts`**：

```typescript
export class ResourceLock {
  private locks: Map<string, { holder: string; acquiredAt: number }> = new Map();

  async acquire(resource: string, holder: string, timeoutMs: number = 30000): Promise<boolean>;
  async release(resource: string, holder: string): Promise<void>;
  async isLocked(resource: string): Promise<boolean>;
}

// 使用示例：
// await resourceLock.acquire('workspace/project-a', 'coder1');
// ... 执行文件操作 ...
// await resourceLock.release('workspace/project-a', 'coder1');
```

### Step 7：LLM 结果解析与文件操作

**新建 `server/src/services/codeApplicator.ts`**：

```typescript
export interface CodeChange {
  filePath: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  diff?: string;
}

export class CodeApplicator {
  // 解析 LLM 返回的代码变更
  parseChanges(llmOutput: string): CodeChange[];

  // 应用变更到工作目录
  async applyChanges(projectPath: string, changes: CodeChange[]): Promise<{
    applied: string[];
    failed: Array<{ file: string; error: string }>;
  }>;

  // 提交到 Git
  async commitChanges(projectPath: string, message: string): Promise<string>; // commit hash
}
```

---

## 4. 涉及文件

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `server/src/services/agentExecution.ts` | 集成真实 LLM 调用 |
| 修改 | `server/src/services/llmService.ts` | 补充 chat 方法的完整实现 |
| 新建 | `server/src/services/agentPrompts.ts` | Agent 角色 Prompt 模板 |
| 新建 | `server/src/services/pmProtocol.ts` | PM 结构化问答协议 |
| 新建 | `server/src/services/agentPipeline.ts` | 协作流水线编排 |
| 新建 | `server/src/services/reviewLoop.ts` | Reviewer-Coder 修复循环 |
| 新建 | `server/src/services/resourceLock.ts` | 共享资源文件锁 |
| 新建 | `server/src/services/codeApplicator.ts` | LLM 代码变更解析与应用 |
| 修改 | `server/src/routes/agent.ts` | 新增 pipeline 触发 API |
| 修改 | `app/agent-team/page.tsx` | 前端展示协作流水线状态 |

---

## 5. API 新增

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/agents/pipeline/start` | 启动完整协作流水线 |
| `GET` | `/api/v1/agents/pipeline/:pipelineId` | 查询流水线执行状态 |
| `POST` | `/api/v1/agents/pm/answer` | 提交 PM 澄清问题的回答 |
| `GET` | `/api/v1/agents/pm/session/:sessionId` | 查询 PM 问答会话状态 |
| `GET` | `/api/v1/agents/:name/executions` | 获取 Agent 执行历史 |

---

## 6. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 启动协作流水线后，main 成功调用 LLM 进行需求确认 | 日志 + API 验证 |
| 2 | pm 生成澄清问题，用户回答后生成结构化需求文档 | API 全流程验证 |
| 3 | coder 接收需求文档后调用 LLM 生成代码变更 | 检查 LLM 返回结果 |
| 4 | reviewer 审查代码并输出结构化审查意见 | 审查结果 JSON 校验 |
| 5 | reviewer-coder 修复循环最多 3 轮，循环终止正确 | 日志计数验证 |
| 6 | 代码变更正确应用到项目工作目录 | 文件系统检查 |
| 7 | Git commit 自动生成，commit message 有意义 | `git log` 验证 |
| 8 | 共享资源锁防止并发冲突 | 并发测试 |
| 9 | Token 消耗正确记录到 `llmCostTracker` | 统计 API 验证 |
| 10 | 前端 Agent 团队页面展示流水线执行进度 | 浏览器截图 |
