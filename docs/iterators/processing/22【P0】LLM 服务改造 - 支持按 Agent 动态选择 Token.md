# 22【P0】LLM 服务改造 - 支持按 Agent 动态选择 Token

## 背景

当前 `server/src/services/llmService.ts` 的 LLM 调用逻辑：

```typescript
// 全局写死：一个 provider 一个 env key
const modelTiers: Record<ModelTier, ModelConfig> = {
  light:  { name: '...', apiKeyEnv: 'DEEPSEEK_API_KEY', ... },
  medium: { name: '...', apiKeyEnv: 'OPENAI_API_KEY', ... },
  strong: { name: '...', apiKeyEnv: 'ANTHROPIC_API_KEY', ... },
};

// 调用时直接读环境变量
async function callDeepSeek(...) {
  const apiKey = process.env.DEEPSEEK_API_KEY; // ← 写死
}
```

Agent 执行任务时（`agentExecution.ts`），调用 `llmAutoRoute(messages)` 没有传入 Agent 身份信息，无法区分不同 Agent 应该使用哪个 Token。

## 目标

改造 LLM 调用链路，使其支持按 Agent 身份动态解析 Token，同时保持向后兼容（无绑定时回退到环境变量）。

## 改造方案

### 1. 扩展 LLMRequest 类型

```typescript
export interface LLMRequest {
  tier: ModelTier;
  messages: LLMMessages[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  agentName?: string;  // 新增：调用方 Agent 名称
}
```

### 2. 改造调用入口 `llmCall()`

```typescript
export async function llmCall(request: LLMRequest, fallbackTiers: ModelTier[] = []): Promise<LLMResponse> {
  const { tier, messages, maxTokens, temperature, agentName } = request;

  for (const t of allTiers) {
    // 新增：按 Agent + tier 解析 Token
    const resolvedToken = agentName
      ? await tokenResolver.resolve(agentName, t)
      : null;

    // 如果有绑定 Token，使用绑定的配置
    const apiKey = resolvedToken?.apiKey || process.env[cfg.apiKeyEnv];
    const baseUrl = resolvedToken?.baseUrl || cfg.baseUrl;
    const modelName = resolvedToken?.preferredModel || cfg.name;

    // 调用 LLM（传入动态 key/url/model）
    response = await callProvider(provider, modelName, messages, opts, apiKey, baseUrl);
  }
}
```

### 3. 改造 provider 调用函数

将 `callDeepSeek`、`callOpenAI`、`callAnthropic` 的 API Key 参数从硬编码环境变量改为函数入参：

```typescript
// Before:
async function callOpenAI(modelName, messages, opts) {
  const apiKey = process.env.OPENAI_API_KEY; // 写死
}

// After:
async function callOpenAI(modelName, messages, opts, apiKey: string, baseUrl?: string) {
  // apiKey 由调用方传入（来自 Token 绑定或环境变量回退）
}
```

### 4. 改造 Agent 执行入口

```typescript
// server/src/services/agentExecution.ts
async function executeAgentTask(context: ExecutionContext, timeoutMs: number) {
  // 传入 agentName，让 llmCall 知道是谁在调用
  const response = await llmAutoRoute(messages, undefined, context.targetAgent);
}
```

## 向后兼容策略

| 场景 | 行为 |
|------|------|
| Agent 有绑定 Token 且 Token 有效 | 使用绑定的 Token |
| Agent 有绑定但 Token 无效/超预算 | 按优先级尝试下一个绑定 |
| Agent 无任何绑定 | 回退到 `process.env` 环境变量（现有逻辑） |
| 直接调用 `/api/v1/llm/call`（无 agentName） | 回退到环境变量 |

## 用量记录

每次调用成功后，更新对应 Token 的用量：

```typescript
if (resolvedToken) {
  await apiTokenService.recordUsage(resolvedToken.id, {
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    costUsd: estimateCost(...),
    agentName,
  });
}
```

## 修改文件

- `server/src/services/llmService.ts` — 核心改造：动态 Token 注入
- `server/src/services/agentExecution.ts` — 传入 agentName 到 LLM 调用
- `server/src/services/tokenResolver.ts` — Token 解析器（任务 21 创建）
- `server/src/services/apiTokenService.ts` — 用量记录方法

## 依赖关系

- 依赖任务 20（Token 数据模型）和任务 21（绑定规则）
- 后续任务 23/24（前端 UI）可在此任务完成后并行开发
