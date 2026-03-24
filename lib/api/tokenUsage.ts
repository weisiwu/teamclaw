import {
  ApiTokenUsageSummary,
  AgentTokenUsage,
  LLMCallLog,
  TokenUsageFilters,
  PaginatedResponse,
} from "./types";

const API_BASE = "/api/v1";

export const tokenUsageApi = {
  /**
   * GET /api/v1/admin/api-tokens/usage/summary
   * 获取所有 API Token 的用量汇总
   */
  async getTokenSummary(): Promise<{ data: ApiTokenUsageSummary[] }> {
    const res = await fetch(`${API_BASE}/admin/api-tokens/usage/summary`);
    const json = await res.json();
    return { data: json.data || [] };
  },

  /**
   * GET /api/v1/admin/api-tokens/:id/usage
   * 获取单个 Token 的用量详情
   */
  async getTokenUsageDetail(tokenId: string): Promise<{ data: ApiTokenUsageSummary }> {
    const res = await fetch(`${API_BASE}/admin/api-tokens/${tokenId}/usage`);
    const json = await res.json();
    return { data: json.data };
  },

  /**
   * GET /api/v1/admin/agents/token-usage
   * 获取 Agent 维度的用量统计
   */
  async getAgentTokenUsage(
    agentName?: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<{ data: AgentTokenUsage[] }> {
    const params = new URLSearchParams();
    if (agentName) params.set("agent", agentName);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    const qs = params.toString();
    const res = await fetch(`${API_BASE}/admin/agents/token-usage${qs ? `?${qs}` : ""}`);
    const json = await res.json();
    return { data: json.data || [] };
  },

  /**
   * GET /api/v1/admin/llm-calls
   * 获取 LLM 调用日志明细
   */
  async getLLMCalls(
    filters?: TokenUsageFilters
  ): Promise<PaginatedResponse<LLMCallLog>> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    if (filters?.agent) params.set("agent", filters.agent);
    if (filters?.tokenId) params.set("tokenId", filters.tokenId);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));
    const qs = params.toString();
    const res = await fetch(`${API_BASE}/admin/llm-calls${qs ? `?${qs}` : ""}`);
    const json = await res.json();
    return {
      data: json.data || [],
      total: json.total || 0,
      page: json.page || 1,
      pageSize: json.pageSize || 20,
      totalPages: json.totalPages || 1,
    };
  },

  /**
   * GET /api/v1/admin/llm-calls/export
   * 导出 LLM 调用日志 CSV
   */
  async exportLLMCalls(filters?: TokenUsageFilters): Promise<string> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    if (filters?.agent) params.set("agent", filters.agent);
    if (filters?.tokenId) params.set("tokenId", filters.tokenId);
    params.set("export", "csv");
    const qs = params.toString();
    return `${API_BASE}/admin/llm-calls?${qs}`;
  },
};

export default tokenUsageApi;
