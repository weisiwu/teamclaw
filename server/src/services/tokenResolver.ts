/**
 * Token 调度器
 * 按 AgentName + tier 查询可用 Token，遍历绑定尝试，成功记录用量，失败尝试下一个
 * 全部失败则回退到全局环境变量 Key
 */

import { getAvailableBindingsForAgent } from './agentTokenBindingService.js';
import { apiTokenService } from './apiTokenService.js';
import { updateTokenUsage } from './apiTokenService.js';
import { llmService, llmCall, type LLMRequest, type LLMResponse } from './llmService.js';
import type { ModelTier } from '../models/agentTokenBinding.js';
import type { ApiToken } from '../models/apiToken.js';

export interface ResolveOptions {
  agentName: string;
  tier: ModelTier;
  modelName?: string;
  messages: LLMRequest['messages'];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ResolveResult {
  success: boolean;
  response?: LLMResponse;
  error?: string;
  usedFallback: boolean;
  bindingId?: string;
  tokenId?: string;
}

/**
 * 从绑定中获取 Token 信息（完整版，包含解密后的 Key）
 */
async function getTokenWithKey(tokenId: string): Promise<ApiToken | null> {
  return apiTokenService.getFullTokenById(tokenId);
}

/**
 * 验证 Token 是否可用（active 且未超预算）
 */
function isTokenUsable(token: ApiToken): boolean {
  if (token.status !== 'active') return false;
  if (token.monthlyBudgetUsd && token.currentMonthUsageUsd >= token.monthlyBudgetUsd) {
    return false;
  }
  return true;
}

/**
 * 估算本次调用的成本（USD）
 * 粗略估算：按 token 数量 * provider 单价
 */
function estimateCallCost(provider: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    deepseek: { input: 0.1, output: 0.1 },
    openai: { input: 0.15, output: 0.6 },
    anthropic: { input: 3.0, output: 15 },
    custom: { input: 0.5, output: 1.0 },
  };
  const p = pricing[provider] || pricing.custom;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

/**
 * 判断 LLM 错误是否可重试
 */
function isRetryableError(statusCode: number | undefined): boolean {
  if (!statusCode) return false;
  // 429 Rate Limit, 5xx Server Error
  return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
}

/**
 * Token 调度核心逻辑
 * @param options 调度选项
 * @returns 解析结果
 */
export async function resolveToken(options: ResolveOptions): Promise<ResolveResult> {
  const { agentName, tier, modelName, messages, maxTokens, temperature, stream } = options;

  // 1. 查询该 Agent 的所有有效绑定（按 priority 排序）
  const bindings = await getAvailableBindingsForAgent(agentName, tier, modelName);

  // 2. 遍历匹配的绑定
  for (const binding of bindings) {
    // 获取 Token 完整信息（包含解密的 API Key）
    const token = await getTokenWithKey(binding.tokenId);
    if (!token) continue;

    // 检查 Token 状态
    if (!isTokenUsable(token)) continue;

    try {
      // 构建 LLM 请求
      const request: LLMRequest = {
        tier,
        messages,
        maxTokens,
        temperature,
        stream: stream ?? false,
      };

      // 直接调用 llmService（内部使用 token 中的配置）
      const response = await callLLMWithToken(token, request);

      if (response) {
        // 成功：记录用量
        const cost = estimateCallCost(
          token.provider,
          response.usage.inputTokens,
          response.usage.outputTokens
        );
        await updateTokenUsage(binding.tokenId, {
          costUsd: cost,
          incrementCalls: 1,
        });

        return {
          success: true,
          response,
          usedFallback: false,
          bindingId: binding.id,
          tokenId: binding.tokenId,
        };
      }
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      // 如果是不可重试错误（4xx 非 429），跳过当前绑定
      if (!isRetryableError(error.statusCode)) {
        // 非重试错误，跳过此绑定继续下一个
        console.warn(
          `[tokenResolver] Non-retryable error for binding ${binding.id}:`,
          error.message
        );
        continue;
      }
      // 429 或 5xx 重试下一个绑定
      console.warn(
        `[tokenResolver] Retryable error for binding ${binding.id}:`,
        error.message
      );
      continue;
    }
  }

  // 3. 全部失败，回退到全局环境变量 Key
  console.log(`[tokenResolver] All bindings failed for agent=${agentName}, tier=${tier}, falling back to global key`);
  return resolveWithFallback(options);
}

/**
 * 使用全局环境变量 Key 进行 LLM 调用（兼容现有逻辑）
 */
async function resolveWithFallback(options: ResolveOptions): Promise<ResolveResult> {
  const { tier, messages, maxTokens, temperature, stream } = options;

  try {
    const request: LLMRequest = {
      tier,
      messages,
      maxTokens,
      temperature,
      stream: stream ?? false,
    };

    // 调用 llmCall 不带 token 参数，使用环境变量中的 Key
    const response = await llmCall(request);

    return {
      success: true,
      response,
      usedFallback: true,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: false,
      error: error.message,
      usedFallback: true,
    };
  }
}

/**
 * 使用指定 Token 调用 LLM
 * 这个函数需要改造 llmService 以支持传入自定义 token 配置
 * 目前作为占位，等任务 09 llmService 改造后完善
 */
async function callLLMWithToken(
  token: ApiToken,
  request: LLMRequest
): Promise<LLMResponse | null> {
  // TODO: 等任务 09（LLM 服务改造）时，需要扩展 llmService.call()
  // 支持传入自定义 apiKey/baseUrl/provider
  // 目前暂时通过环境变量方式调用，后续改造后完善
  try {
    // 临时方案：设置环境变量后调用
    const originalKeys: Record<string, string | undefined> = {};
    if (token.provider === 'openai') {
      originalKeys.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      originalKeys.OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
      process.env.OPENAI_API_KEY = token.apiKey;
      if (token.baseUrl) process.env.OPENAI_BASE_URL = token.baseUrl;
    } else if (token.provider === 'anthropic') {
      originalKeys.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = token.apiKey;
    } else if (token.provider === 'deepseek') {
      originalKeys.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
      originalKeys.DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL;
      process.env.DEEPSEEK_API_KEY = token.apiKey;
      if (token.baseUrl) process.env.DEEPSEEK_BASE_URL = token.baseUrl;
    } else if (token.provider === 'custom' && token.baseUrl) {
      originalKeys.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      originalKeys.OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
      process.env.OPENAI_API_KEY = token.apiKey;
      process.env.OPENAI_BASE_URL = token.baseUrl;
    }

    const response = await llmCall(request);

    // 恢复环境变量
    if (originalKeys.OPENAI_API_KEY !== undefined) process.env.OPENAI_API_KEY = originalKeys.OPENAI_API_KEY;
    if (originalKeys.OPENAI_BASE_URL !== undefined) process.env.OPENAI_BASE_URL = originalKeys.OPENAI_BASE_URL;
    if (originalKeys.ANTHROPIC_API_KEY !== undefined) process.env.ANTHROPIC_API_KEY = originalKeys.ANTHROPIC_API_KEY;
    if (originalKeys.DEEPSEEK_API_KEY !== undefined) process.env.DEEPSEEK_API_KEY = originalKeys.DEEPSEEK_API_KEY;
    if (originalKeys.DEEPSEEK_BASE_URL !== undefined) process.env.DEEPSEEK_BASE_URL = originalKeys.DEEPSEEK_BASE_URL;

    return response;
  } catch (err) {
    // 恢复环境变量
    throw err;
  }
}

// ========== 导出 ==========

export const tokenResolver = {
  resolveToken,
  resolveWithFallback,
  isTokenUsable,
  isRetryableError,
};

export default tokenResolver;
