import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { capabilityApi } from "@/lib/api/capabilities";

// Query Keys
export const capabilityKeys = {
  all: ["capabilities"] as const,
  lists: () => [...capabilityKeys.all, "list"] as const,
  list: () => [...capabilityKeys.lists()] as const,
};

// 能力列表 Hook
export function useCapabilityList() {
  return useQuery({
    queryKey: capabilityKeys.list(),
    queryFn: () => capabilityApi.getList(),
    staleTime: 30000,
  });
}

// 更新能力状态 Mutation
export function useUpdateCapability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      capabilityApi.update(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: capabilityKeys.lists() });
    },
  });
}
