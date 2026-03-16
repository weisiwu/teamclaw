import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tokenApi } from "@/lib/api/tokens";
import { TokenFilters } from "@/lib/api/types";

// Query Keys
export const tokenKeys = {
  all: ["tokens"] as const,
  summary: () => [...tokenKeys.all, "summary"] as const,
  daily: () => [...tokenKeys.all, "daily"] as const,
  dailyList: (filters?: TokenFilters) => [...tokenKeys.daily(), filters] as const,
  task: () => [...tokenKeys.all, "task"] as const,
  taskList: (filters?: TokenFilters & { page?: number; pageSize?: number }) => [...tokenKeys.task(), filters] as const,
  trend: (days?: number) => [...tokenKeys.all, "trend", days] as const,
};

// Token 汇总 Hook
export function useTokenSummary() {
  return useQuery({
    queryKey: tokenKeys.summary(),
    queryFn: () => tokenApi.getSummary(),
    staleTime: 60000, // 1分钟内数据视为新鲜
  });
}

// 每日 Token 使用列表 Hook
export function useTokenDailyList(filters?: TokenFilters) {
  return useQuery({
    queryKey: tokenKeys.dailyList(filters),
    queryFn: () => tokenApi.getDailyList(filters),
    staleTime: 60000,
  });
}

// 任务 Token 列表 Hook
export function useTokenTaskList(filters?: TokenFilters & { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: tokenKeys.taskList(filters),
    queryFn: () => tokenApi.getTaskList(filters),
    staleTime: 60000,
  });
}

// Token 趋势 Hook
export function useTokenTrend(days: number = 30) {
  return useQuery({
    queryKey: tokenKeys.trend(days),
    queryFn: () => tokenApi.getTrend(days),
    staleTime: 60000,
  });
}

// 刷新所有 Token 数据
export function useRefreshTokens() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: tokenKeys.all });
    },
  });
}
