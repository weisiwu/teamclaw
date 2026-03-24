/**
 * Token 调度器
 * 核心调度逻辑：为 Agent 选择合适的 API Token
 */

import { agentTokenBindingService } from './agentTokenBindingService.js';
import { apiTokenService } from './apiTokenService.js';
import type { ResolvedToken, TokenResolutionContext } from '../models/agentTokenBinding.js';
import type { LLMProvider } from '../models/apiToken.js';

/**
 * Token 调度结果
 */
export interface TokenScheduleResult {
  success: boolean;
  token?: ResolvedToken;
  error?: string;
  fallback?: boolean;
}

/**
 * Token 使用量记录
 */
export interface TokenUsageRecord {
  bindingId: string;
  tokenId: string;
  agentName: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
  timestamp: string;
}

/**
 * Token 调度配置
 */
export interface TokenResolverConfig {
  // 是否允许回退到环境变量
  allowEnvFallback: boolean;
  // 最大尝试次数
  maxRetries: number;
  // 重试间隔（毫秒）
  retryDelay: number;
  // 预算缓冲比例（如 0.9 表示预算的 90%时触发警告）
  budgetThreshold: number;
}

// 默认配置
const DEFAULT_CONFIG: TokenResolverConfig = {
  allowEnvFallback: true,
  maxRetries: 3,
  retryDelay: 1000,
  budgetThreshold: 0.9,
};

// 当前配置
let currentConfig: TokenResolverConfig = { ...DEFAULT_CONFIG };

/**
 * 更新调度器配置
 * @param config 新配置
 */
export function updateConfig(config: Partial<TokenResolverConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * 获取当前配置
 * @returns 当前配置
 */
export function getConfig(): TokenResolverConfig {
  return { ...currentConfig };
}

/**
 * 重置为默认配置
 */
export function resetConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG };
}

// ========== 核心调度逻辑 ==========

/**
 * 调度 Token
 * 根据 Agent 和层级选择最合适的 Token
 * @param context 调度上下文
 * @returns 调度结果
 */
export async function scheduleToken(
  context: TokenResolutionContext
): Promise<TokenScheduleResult> {
  const { agentName, tier, preferredModel } = context;

  console.log(`[tokenResolver] Scheduling token for agent=${agentName}, tier=${tier}, model=${preferredModel || 'any'}`);

  // 1. 查询该 Agent 的所有绑定
  const resolvedTokens = await agentTokenBindingService.resolveTokens(context);

  if (resolvedTokens.length === 0) {
    console.log(`[tokenResolver] No bindings found for agent ${agentName}`);

    // 尝试回退到全局环境变量
    if (currentConfig.allowEnvFallback) {
      return await fallbackToEnvVar(context);
    }

    return {
      success: false,
      error: `No available tokens for agent ${agentName}`,
    };
  }

  console.log(`[tokenResolver] Found ${resolvedTokens.length} candidate tokens`);

  // 2. 按优先级遍历候选 Token
  for (const token of resolvedTokens) {
    const validation = await validateToken(token);

    if (validation.valid) {
      console.log(`[tokenResolver] Selected token: ${token.tokenId} (priority=${token.priority})`);
      return {
        success: true,
        token,
      };
    } else {
      console.log(`[tokenResolver] Token ${token.tokenId} validation failed: ${validation.reason}`);
    }
  }

  // 3. 所有候选都失败，尝试回退
  console.log(`[tokenResolver] All candidate tokens failed`);

  if (currentConfig.allowEnvFallback) {
    return await fallbackToEnvVar(context);
  }

  return {
    success: false,
    error: 'All available tokens failed validation',
  };
}

/**
 * 验证 Token 是否可用
 * @param token Token 信息
 * @returns 验证结果
 */
async function validateToken(token: ResolvedToken): Promise<{ valid: boolean; reason?: string }> {
  // 检查 API Key 是否有效
  if (!token.apiKey || token.apiKey.length < 10) {
    return { valid: false, reason: 'Invalid API key' };
  }

  // 检查 Provider 是否支持
  const supportedProviders: LLMProvider[] = ['openai', 'anthropic', 'deepseek', 'custom'];
  if (!supportedProviders.includes(token.provider as LLMProvider)) {
    return { valid: false, reason: `Unsupported provider: ${token.provider}` };
  }

  return { valid: true };
}

/**
 * 回退到环境变量 Token
 * @param context 调度上下文
 * @returns 调度结果
 */
async function fallbackToEnvVar(
  context: TokenResolutionContext
): Promise<TokenScheduleResult> {
  console.log(`[tokenResolver] Falling back to environment variable`);

  const envKey = getEnvApiKey(context.preferredModel);

  if (!envKey) {
    return {
      success: false,
      error: 'No environment variable API key configured',
    };
  }

  const provider = inferProviderFromKey(envKey);

  return {
    success: true,
    token: {
      bindingId: 'env_fallback',
      tokenId: 'env_fallback',
      apiKey: envKey,
      provider,
      models: [],
      priority: 999, // 最低优先级
    },
    fallback: true,
  };
}

/**
 * 从环境变量获取 API Key
 * @param preferredModel 首选模型（用于推断 provider）
 * @returns API Key，不存在返回 null
 */
function getEnvApiKey(preferredModel?: string): string | null {
  // 根据模型推断 provider
  if (preferredModel) {
    const lowerModel = preferredModel.toLowerCase();

    if (lowerModel.includes('claude')) {
      return process.env.ANTHROPIC_API_KEY || null;
    }

    if (lowerModel.includes('gpt') || lowerModel.includes('openai')) {
      return process.env.OPENAI_API_KEY || null;
    }

    if (lowerModel.includes('deepseek')) {
      return process.env.DEEPSEEK_API_KEY || null;
    }
  }

  // 按优先级返回环境变量
  return (
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    null
  );
}

/**
 * 从 API Key 推断 Provider
 * @param apiKey API Key
 * @returns Provider 名称
 */
function inferProviderFromKey(apiKey: string): string {
  // 基于 key 前缀推断
  if (apiKey.startsWith('sk-ant-') || apiKey.startsWith('sk-ant-api03-')) {
    return 'anthropic';
  }

  if (apiKey.startsWith('sk-proj-') || apiKey.startsWith('sk-')) {
    // OpenAI 和 DeepSeek 都可能使用 sk- 前缀
    // 需要通过其他方式区分，这里默认 openai
    return 'openai';
  }

  return 'custom';
}

// ========== 使用量记录 ==========

/**
 * 记录 Token 使用量
 * 更新数据库中的用量统计
 * @param record 使用记录
 */
export async function recordTokenUsage(record: TokenUsageRecord): Promise<void> {
  try {
    // 更新 API Token 的使用量
    await apiTokenService.updateTokenUsage(record.tokenId, {
      costUsd: record.costUsd,
      incrementCalls: 1,
    });

    console.log(
      `[tokenResolver] Recorded usage: token=${record.tokenId}, cost=$${record.costUsd.toFixed(4)}`
    );

    // TODO: 可以在这里添加更详细的使用日志记录
    // 例如：记录到 token_usage_logs 表用于审计和分析

  } catch (error) {
    console.error(`[tokenResolver] Failed to record token usage:`, error);
    // 记录失败不影响主流程，仅记录日志
  }
}

/**
 * 检查 Token 预算是否即将超限
 * @param tokenId Token ID
 * @returns 是否接近预算上限
 */
export async function isNearBudgetLimit(tokenId: string): Promise<boolean> {
  const token = await apiTokenService.getTokenById(tokenId);

  if (!token || !token.monthlyBudgetUsd) {
    return false;
  }

  const usageRatio = token.currentMonthUsageUsd / token.monthlyBudgetUsd;
  return usageRatio >= currentConfig.budgetThreshold;
}

// ========== 批量调度 ==========

/**
 * 批量调度多个 Token（用于负载均衡）
 * @param context 调度上下文
 * @param count 需要的 Token 数量
 * @returns Token 列表
 */
export async function scheduleMultipleTokens(
  context: TokenResolutionContext,
  count: number
): Promise<ResolvedToken[]> {
  const tokens = await agentTokenBindingService.resolveTokens(context);
  return tokens.slice(0, count);
}

// ========== 健康检查 ==========

/**
 * 检查 Token 健康状态
 * @param tokenId Token ID
 * @returns 健康状态
 */
export async function checkTokenHealth(tokenId: string): Promise<{
  healthy: boolean;
  status: string;
  budgetRemaining?: number;
  budgetPercentage?: number;
}> {
  const token = await apiTokenService.getTokenById(tokenId);

  if (!token) {
    return { healthy: false, status: 'not_found' };
  }

  if (token.status !== 'active') {
    return { healthy: false, status: `status_${token.status}` };
  }

  let budgetRemaining: number | undefined;
  let budgetPercentage: number | undefined;

  if (token.monthlyBudgetUsd) {
    budgetRemaining = token.monthlyBudgetUsd - token.currentMonthUsageUsd;
    budgetPercentage = (token.currentMonthUsageUsd / token.monthlyBudgetUsd) * 100;

    if (budgetRemaining <= 0) {
      return {
        healthy: false,
        status: 'budget_exceeded',
        budgetRemaining: 0,
        budgetPercentage: 100,
      };
    }
  }

  return {
    healthy: true,
    status: 'healthy',
    budgetRemaining,
    budgetPercentage,
  };
}

// ========== 便捷方法：llmService 专用 ==========

/**
 * 解析 Token（llmService 专用便捷方法）
 * 根据 Agent 名称和 tier 返回可用的 Token 配置
 * @param agentName Agent 名称
 * @param tier 模型层级
 * @param preferredModel 首选模型（可选）
 * @returns ResolvedToken 或 null（无绑定时）
 */
export async function resolve(
  agentName: string,
  tier: 'light' | 'medium' | 'strong',
  preferredModel?: string
): Promise<ResolvedToken | null> {
  const result = await scheduleToken({ agentName, tier, preferredModel });
  if (result.success && result.token) {
    return result.token;
  }
  return null;
}

// ========== 导出 ==========

export const tokenResolver = {
  scheduleToken,
  resolve,
  scheduleMultipleTokens,
  recordTokenUsage,
  isNearBudgetLimit,
  checkTokenHealth,
  updateConfig,
  getConfig,
  resetConfig,
};

export default tokenResolver;
