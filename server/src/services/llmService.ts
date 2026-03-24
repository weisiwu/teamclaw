/**
 * LLM 调用服务 - 统一封装轻量/中等/强力三级模型
 * 支持 DeepSeek / OpenAI / Anthropic 兼容接口
 */

// Inline model config (avoid cross-module import from server/src)
type ModelTier = 'light' | 'medium' | 'strong';
interface ModelConfig {
  name: string;
  apiKeyEnv: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}
const modelTiers: Record<ModelTier, ModelConfig> = {
  light: { name: process.env.LIGHT_MODEL || 'deepseek-chat', apiKeyEnv: 'DEEPSEEK_API_KEY', maxTokens: 4096, temperature: 0.7 },
  medium: { name: process.env.MEDIUM_MODEL || 'gpt-4o-mini', apiKeyEnv: 'OPENAI_API_KEY', baseUrl: process.env.OPENAI_BASE_URL, maxTokens: 16384, temperature: 0.5 },
  strong: { name: process.env.STRONG_MODEL || 'claude-sonnet-4-20250514', apiKeyEnv: 'ANTHROPIC_API_KEY', maxTokens: 81920, temperature: 0.3 },
};
function getModelConfig(tier: ModelTier): ModelConfig { return modelTiers[tier]; }

// ============ 类型定义 ============

export interface LLMMessages {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  tier: ModelTier;
  messages: LLMMessages[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: 'deepseek' | 'openai' | 'anthropic';
  raw?: Record<string, unknown>; // 原始响应
}

export interface LLMError extends Error {
  tier: ModelTier;
  provider: string;
  statusCode?: number;
  retryable: boolean;
}

// ============ Token 估算工具 ============

const TOKEN_RATIO = {
  // 中文：1 token ≈ 1.5-2 字符（粗略估算）
  zh: 1.8,
  // 英文：1 token ≈ 4 字符
  en: 4,
  // 代码：1 token ≈ 3 字符
  code: 3,
};

export function estimateTokens(text: string): number {
  let total = 0;
  // 中文字符
  const zhMatches = text.match(/[\u4e00-\u9fff]/g);
  if (zhMatches) total += zhMatches.length * TOKEN_RATIO.zh;
  // 移除中文后估算英文/代码
  const rest = text.replace(/[\u4e00-\u9fff]/g, '');
  total += Math.ceil(rest.length / TOKEN_RATIO.code);
  return Math.ceil(total);
}

export function estimateMessageTokens(messages: LLMMessages[]): number {
  // 每个消息有约4 token的 overhead（role/content标签）
  return messages.reduce((sum, m) => sum + 4 + estimateTokens(m.content), 0);
}

// ============ 成本估算 ============

// 参考价格（每1M tokens）
export const MODEL_PRICING = {
  deepseek: { input: 0.1, output: 0.1 },    // $0.1/M
  'openai-gpt4o-mini': { input: 0.15, output: 0.6 },
  'openai-gpt4o': { input: 2.5, output: 10 },
  'anthropic-sonnet': { input: 3.0, output: 15 },
};

export function estimateCost(provider: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[provider as keyof typeof MODEL_PRICING];
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

// ============ 核心调用逻辑 ============

async function callDeepSeek(
  modelName: string,
  messages: LLMMessages[],
  opts: { maxTokens?: number; temperature?: number }
): Promise<LLMResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: opts.maxTokens || 4096,
      temperature: opts.temperature ?? 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    },
    model: data.model || modelName,
    provider: 'deepseek',
    raw: data,
  };
}

async function callOpenAI(
  modelName: string,
  messages: LLMMessages[],
  opts: { maxTokens?: number; temperature?: number }
): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: opts.maxTokens || 16384,
      temperature: opts.temperature ?? 0.5,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    },
    model: data.model || modelName,
    provider: 'openai',
    raw: data,
  };
}

async function callAnthropic(
  modelName: string,
  messages: LLMMessages[],
  opts: { maxTokens?: number; temperature?: number }
): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  // Anthropic 使用不同的 API 格式
  const systemMsg = messages.find(m => m.role === 'system');
  const nonSystemMsgs = messages.filter(m => m.role !== 'system');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: opts.maxTokens || 4096,
      temperature: opts.temperature ?? 0.3,
      system: systemMsg?.content || '',
      messages: nonSystemMsgs.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    content: data.content?.[0]?.text || '',
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
    model: data.model || modelName,
    provider: 'anthropic',
    raw: data,
  };
}

// ============ 主入口：统一调用接口 ============

/**
 * 统一 LLM 调用入口
 * @param request - LLM 请求
 * @param fallbackTiers - 降级模型层级（按优先级尝试）
 */
export async function llmCall(
  request: LLMRequest,
  fallbackTiers: ModelTier[] = []
): Promise<LLMResponse> {
  const { tier, messages, maxTokens, temperature } = request;
  const allTiers = [tier, ...fallbackTiers].filter((v, i, a) => a.indexOf(v) === i); // 去重

  const errors: LLMError[] = [];

  for (const t of allTiers) {
    const cfg = getModelConfig(t);
    const opts = {
      maxTokens: maxTokens || cfg.maxTokens,
      temperature: temperature ?? cfg.temperature,
    };

    try {
      let response: LLMResponse;

      if (t === 'light') {
        // DeepSeek
        response = await callDeepSeek(cfg.name, messages, opts);
      } else if (t === 'medium') {
        // OpenAI compatible
        response = await callOpenAI(cfg.name, messages, opts);
      } else {
        // strong - Anthropic
        response = await callAnthropic(cfg.name, messages, opts);
      }

      return response;
    } catch (err: unknown) {
      const error: LLMError = {
        name: 'LLMError',
        message: (err instanceof Error ? err.message : String(err)),
        tier: t,
        provider: t === 'light' ? 'deepseek' : t === 'medium' ? 'openai' : 'anthropic',
        statusCode: err.statusCode,
        retryable: err.statusCode === 429 || err.statusCode >= 500,
      };
      errors.push(error);
      // 只有 retryable 错误才继续尝试下一个 tier
      if (!error.retryable) break;
    }
  }

  // 所有 tier 都失败
  const lastError = errors[errors.length - 1];
  throw lastError || new Error('All LLM tiers failed');
}

// ============ 快捷方法 ============

export async function llmCallLight(
  messages: LLMMessages[],
  fallback = true
): Promise<LLMResponse> {
  return llmCall(
    { tier: 'light', messages },
    fallback ? ['medium', 'strong'] : []
  );
}

export async function llmCallMedium(
  messages: LLMMessages[],
  fallback = true
): Promise<LLMResponse> {
  return llmCall(
    { tier: 'medium', messages },
    fallback ? ['strong'] : []
  );
}

export async function llmCallStrong(
  messages: LLMMessages[]
): Promise<LLMResponse> {
  return llmCall({ tier: 'strong', messages }, []);
}

// ============ 任务复杂度判断 ============

export type TaskComplexity = 'simple' | 'medium' | 'complex';

/**
 * 根据输入文本估算任务复杂度，决定使用哪个模型层级
 */
export function estimateComplexity(text: string): TaskComplexity {
  const length = text.length;
  const codeBlocks = (text.match(/```[\s\S]*?```/g) || []).length;
  const hasArchitecture = /架构|设计|架构图|组件|模块划分/i.test(text);
  const hasReview = /review|审查|优化|重构|性能/i.test(text);

  if (length < 200 && codeBlocks === 0 && !hasArchitecture) return 'simple';
  if (length > 2000 || codeBlocks > 3 || hasArchitecture || hasReview) return 'complex';
  return 'medium';
}

/**
 * 根据复杂度自动选择模型层级
 */
export function selectTierByComplexity(complexity: TaskComplexity): ModelTier {
  switch (complexity) {
    case 'simple': return 'light';
    case 'medium': return 'medium';
    case 'complex': return 'strong';
  }
}

/**
 * 自动路由：基于任务复杂度选择模型
 */
export async function llmAutoRoute(
  messages: LLMMessages[],
  overrideTier?: ModelTier
): Promise<LLMResponse> {
  const userText = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
  const complexity = estimateComplexity(userText);
  const tier = overrideTier || selectTierByComplexity(complexity);

  const fallbackMap: Record<TaskComplexity, ModelTier[]> = {
    simple: ['medium', 'strong'],
    medium: ['strong'],
    complex: [],
  };

  return llmCall({ tier, messages }, fallbackMap[complexity]);
}

// Facade for backward-compatible imports
export const llmService = {
  chat: (opts: { tier?: string; messages: LLMMessages[] }) =>
    llmAutoRoute(opts.messages, opts.tier as ModelTier | undefined),
};
