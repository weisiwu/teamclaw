import { useQuery } from "@tanstack/react-query";
import { tokenUsageApi } from "@/lib/api/tokenUsage";
import { TokenUsageFilters } from "@/lib/api/types";

// Query Keys
export const tokenUsageKeys = {
  all: ["tokenUsage"] as const,
  tokenSummary: () => [...tokenUsageKeys.all, "tokenSummary"] as const,
  tokenDetail: (tokenId: string) => [...tokenUsageKeys.all, "tokenDetail", tokenId] as const,
  agentUsage: (agentName?: string) => [...tokenUsageKeys.all, "agentUsage", agentName] as const,
  llmCalls: (filters?: TokenUsageFilters) => [...tokenUsageKeys.all, "llmCalls", filters] as const,
};

/**
 * 获取所有 API Token 的用量汇总
 */
export function useTokenUsageSummary() {
  return useQuery({
    queryKey: tokenUsageKeys.tokenSummary(),
    queryFn: () => tokenUsageApi.getTokenSummary(),
    staleTime: 60000,
  });
}

/**
 * 获取单个 Token 的用量详情
 */
export function useTokenUsageDetail(tokenId: string) {
  return useQuery({
    queryKey: tokenUsageKeys.tokenDetail(tokenId),
    queryFn: () => tokenUsageApi.getTokenUsageDetail(tokenId),
    enabled: !!tokenId,
    staleTime: 60000,
  });
}

/**
 * 获取 Agent 维度的用量统计
 */
export function useAgentTokenUsage(agentName?: string) {
  return useQuery({
    queryKey: tokenUsageKeys.agentUsage(agentName),
    queryFn: () => tokenUsageApi.getAgentTokenUsage(agentName),
    staleTime: 60000,
  });
}

/**
 * 获取 LLM 调用日志明细
 */
export function useLLMCallLogs(filters?: TokenUsageFilters) {
  return useQuery({
    queryKey: tokenUsageKeys.llmCalls(filters),
    queryFn: () => tokenUsageApi.getLLMCalls(filters),
    staleTime: 30000,
  });
}
