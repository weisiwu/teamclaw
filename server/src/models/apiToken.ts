/**
 * API Token 数据模型
 * 管理 LLM Provider 的 API Token
 */

export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'custom';

export interface ApiToken {
  id: string;
  alias: string;
  provider: LLMProvider;
  apiKey: string;                // 加密存储，返回时脱敏
  baseUrl?: string;
  models: string[];
  status: 'active' | 'disabled' | 'expired';
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

// 数据库表结构映射（snake_case）
export interface ApiTokenRow {
  id: string;
  alias: string;
  provider: string;
  api_key: string;
  base_url: string | null;
  models: string;  // JSON string
  status: string;
  monthly_budget_usd: number | null;
  current_month_usage_usd: number;
  total_usage_usd: number;
  call_count: number;
  last_used_at: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  note: string | null;
}

// API Token 创建参数
export interface CreateApiTokenParams {
  alias: string;
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  models?: string[];
  status?: 'active' | 'disabled' | 'expired';
  monthlyBudgetUsd?: number;
  note?: string;
}

// API Token 更新参数
export interface UpdateApiTokenParams {
  alias?: string;
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  status?: 'active' | 'disabled' | 'expired';
  monthlyBudgetUsd?: number;
  note?: string;
}

// Token 使用量更新参数
export interface UpdateUsageParams {
  costUsd: number;
  incrementCalls?: number;
}

// 脱敏后的 Token（用于 API 返回）
export interface SanitizedApiToken extends Omit<ApiToken, 'apiKey'> {
  apiKey: string;  // 脱敏后的格式: "sk-xxx...xxx"
}
