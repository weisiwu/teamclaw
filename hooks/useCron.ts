import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cronApi } from "@/lib/api/cron";
import { CreateCronRequest, UpdateCronRequest } from "@/lib/api/types";

// Query Keys
export const cronKeys = {
  all: ["cron"] as const,
  lists: () => [...cronKeys.all, "list"] as const,
  list: () => [...cronKeys.lists()],
  details: () => [...cronKeys.all, "detail"] as const,
  detail: (id: string) => [...cronKeys.details(), id] as const,
};

// 定时任务列表 Hook
export function useCronList() {
  return useQuery({
    queryKey: cronKeys.list(),
    queryFn: () => cronApi.getList(),
    staleTime: 30000,
  });
}

// 定时任务详情 Hook
export function useCronDetail(id: string) {
  return useQuery({
    queryKey: cronKeys.detail(id),
    queryFn: () => cronApi.getById(id),
    enabled: !!id,
  });
}

// 创建定时任务 Mutation
export function useCreateCron() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCronRequest) => cronApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cronKeys.lists() });
    },
  });
}

// 更新定时任务 Mutation
export function useUpdateCron() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCronRequest }) =>
      cronApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cronKeys.lists() });
    },
  });
}

// 删除定时任务 Mutation
export function useDeleteCron() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cronApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cronKeys.lists() });
    },
  });
}

// 启动定时任务 Mutation
export function useStartCron() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cronApi.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cronKeys.lists() });
    },
  });
}

// 停止定时任务 Mutation
export function useStopCron() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cronApi.stop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cronKeys.lists() });
    },
  });
}

// 运行日志 Hook
export function useCronRuns(cronId: string) {
  return useQuery({
    queryKey: [...cronKeys.all, "runs", cronId] as const,
    queryFn: () => cronApi.getRuns(cronId),
    enabled: !!cronId,
  });
}
