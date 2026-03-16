import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memberApi } from "@/lib/api/members";
import { CreateMemberRequest, UpdateMemberRequest } from "@/lib/api/types";

// Query Keys
export const memberKeys = {
  all: ["members"] as const,
  lists: () => [...memberKeys.all, "list"] as const,
  list: () => [...memberKeys.lists()] as const,
  details: () => [...memberKeys.all, "detail"] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
};

// 成员列表 Hook
export function useMemberList() {
  return useQuery({
    queryKey: memberKeys.list(),
    queryFn: () => memberApi.getList(),
    staleTime: 30000,
  });
}

// 成员详情 Hook
export function useMemberDetail(id: string) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => memberApi.getById(id),
    enabled: !!id,
  });
}

// 创建成员 Mutation
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMemberRequest) => memberApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

// 更新成员 Mutation
export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMemberRequest }) =>
      memberApi.update(id, data),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      queryClient.setQueryData(memberKeys.detail(member.id), member);
    },
  });
}

// 删除成员 Mutation
export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => memberApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}
