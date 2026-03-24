/**
 * API Token types and constants.
 */

export type ApiTokenProvider = "openai" | "anthropic" | "deepseek" | "custom";

export type ApiTokenStatus = "active" | "disabled" | "expired";

export interface ApiToken {
  id: string;
  alias: string;
  provider: ApiTokenProvider;
  apiKey: string; // masked after creation
  baseUrl?: string;
  models: string[];
  monthlyBudget?: number; // USD
  monthlyUsage: number; // USD
  callCount: number;
  status: ApiTokenStatus;
  notes?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiTokenRequest {
  alias: string;
  provider: ApiTokenProvider;
  apiKey: string;
  baseUrl?: string;
  models: string[];
  monthlyBudget?: number;
  notes?: string;
}

export interface UpdateApiTokenRequest {
  alias?: string;
  provider?: ApiTokenProvider;
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  monthlyBudget?: number;
  status?: ApiTokenStatus;
  notes?: string;
}

export interface VerifyApiTokenResponse {
  success: boolean;
  message?: string;
  error?: string;
  latencyMs?: number;
}

export interface ApiTokenListResponse {
  data: ApiToken[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiTokenFilters {
  provider?: ApiTokenProvider | "all";
  status?: ApiTokenStatus | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}

export const API_TOKEN_PROVIDERS: { value: ApiTokenProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "custom", label: "自定义" },
];

export const API_TOKEN_STATUS_OPTIONS: { value: ApiTokenStatus | "all"; label: string }[] = [
  { value: "active", label: "活跃" },
  { value: "disabled", label: "禁用" },
  { value: "expired", label: "过期" },
  { value: "all", label: "全部" },
];
