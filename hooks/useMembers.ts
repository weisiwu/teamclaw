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

// 批量删除成员 Mutation
export function useBatchDeleteMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => memberApi.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

// ============ 角色历史 & 委托 & 权限查询 ============

export const memberRoleKeys = {
  history: (userId: string) => ["members", "role-history", userId] as const,
  recentChanges: () => ["members", "role-changes"] as const,
  stats: () => ["members", "role-stats"] as const,
  delegations: (userId: string) => ["members", "delegations", userId] as const,
  delegationsBy: (userId: string) => ["members", "delegations-by", userId] as const,
  permissions: (userId: string) => ["members", "permissions", userId] as const,
};

// 角色变更历史
export function useRoleHistory(userId: string, limit = 20) {
  return useQuery({
    queryKey: memberRoleKeys.history(userId),
    queryFn: () => memberApi.getRoleHistory(userId, limit),
    enabled: !!userId,
  });
}

// 最近角色变更
export function useRecentRoleChanges(limit = 50) {
  return useQuery({
    queryKey: memberRoleKeys.recentChanges(),
    queryFn: () => memberApi.getRecentRoleChanges(limit),
  });
}

// 角色变更统计
export function useRoleChangeStats(days = 7) {
  return useQuery({
    queryKey: memberRoleKeys.stats(),
    queryFn: () => memberApi.getRoleChangeStats(days),
  });
}

// 收到的委托列表
export function useDelegationsForUser(userId: string) {
  return useQuery({
    queryKey: memberRoleKeys.delegations(userId),
    queryFn: () => memberApi.getDelegationsForUser(userId),
    enabled: !!userId,
  });
}

// 发出的委托列表
export function useDelegationsByUser(userId: string) {
  return useQuery({
    queryKey: memberRoleKeys.delegationsBy(userId),
    queryFn: () => memberApi.getDelegationsByUser(userId),
    enabled: !!userId,
  });
}

// 权限映射
export function usePermissionMap(userId: string) {
  return useQuery({
    queryKey: memberRoleKeys.permissions(userId),
    queryFn: () => memberApi.getPermissionMap(userId),
    enabled: !!userId,
  });
}

// 授予委托
export function useGrantDelegation() {
  return useMutation({
    mutationFn: ({ delegatorId, delegateId, permissions, expiresAt }: {
      delegatorId: string;
      delegateId: string;
      permissions: string[];
      expiresAt?: string;
    }) => memberApi.grantDelegation(delegatorId, delegateId, permissions, expiresAt),
  });
}

// 撤销委托
export function useRevokeDelegation() {
  return useMutation({
    mutationFn: ({ delegatorId, delegateId }: { delegatorId: string; delegateId: string }) =>
      memberApi.revokeDelegation(delegatorId, delegateId),
  });
}
