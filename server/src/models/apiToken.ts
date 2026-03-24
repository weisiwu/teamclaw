/**
 * API Token 数据模型
 * 支持多 LLM Provider 的 API Key 管理
 */

export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'custom';

export type TokenStatus = 'active' | 'disabled' | 'expired';

export interface ApiToken {
  id: string;
  alias: string;
  provider: LLMProvider;
  apiKey: string;                 // 加密存储
  apiKeyMasked?: string;         // 脱敏后的 Key（前端展示用，不存DB）
  baseUrl?: string;
  models: string[];
  status: TokenStatus;
  monthlyBudgetUsd?: number;
  currentMonthUsageUsd: number;
  totalUsageUsd: number;
  callCount: number;
  lastUsedAt?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  note?: string;
}

// API 返回时脱敏的 Token
export type ApiTokenResponse = Omit<ApiToken, 'apiKey'> & {
  apiKeyMasked: string;  // 脱敏后的 key，如 "sk-***abc"
};

export interface CreateApiTokenRequest {
  alias: string;
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  models?: string[];
  status?: TokenStatus;
  monthlyBudgetUsd?: number;
  note?: string;
}

export interface UpdateApiTokenRequest {
  alias?: string;
  provider?: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  status?: TokenStatus;
  monthlyBudgetUsd?: number;
  note?: string;
}
