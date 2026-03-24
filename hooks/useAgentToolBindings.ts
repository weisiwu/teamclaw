/**
 * useAgentToolBindings - React Query hooks for Agent-Tool Binding API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentToolBindingsApi } from '@/lib/api/agentToolBindings';

export const agentToolBindingKeys = {
  all: ['agentToolBindings'] as const,
  agentTools: (agentName: string) => [...agentToolBindingsKeys.all, 'agentTools', agentName] as const,
  toolAgents: (toolId: string) => [...agentToolBindingsKeys.all, 'toolAgents', toolId] as const,
  matrix: () => [...agentToolBindingsKeys.all, 'matrix'] as const,
  stats: () => [...agentToolBindingsKeys.all, 'stats'] as const,
};

/**
 * 获取 Agent 可用的 Tool 列表（含绑定状态）
 */
export function useAgentToolPermissions(agentName: string) {
  return useQuery({
    queryKey: agentToolBindingKeys.agentTools(agentName),
    queryFn: () => agentToolBindingsApi.getAgentTools(agentName),
    enabled: !!agentName,
    staleTime: 60_000,
  });
}

/**
 * 批量设置 Agent 的 Tool 权限
 */
export function useSetAgentToolBindings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      agentName,
      bindings,
    }: {
      agentName: string;
      bindings: Array<{ toolId: string; enabled: boolean; requiresApproval?: boolean }>;
    }) => agentToolBindingsApi.setAgentTools(agentName, bindings),
    onSuccess: (_, { agentName }) => {
      qc.invalidateQueries({ queryKey: agentToolBindingKeys.agentTools(agentName) });
      qc.invalidateQueries({ queryKey: agentToolBindingKeys.matrix() });
      qc.invalidateQueries({ queryKey: agentToolBindingKeys.stats() });
    },
  });
}

/**
 * 更新单个绑定
 */
export function useUpdateAgentToolBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      params,
    }: {
      id: string;
      params: { enabled?: boolean; requiresApproval?: boolean };
    }) => agentToolBindingsApi.updateBinding(id, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agentToolBindingKeys.all });
    },
  });
}

/**
 * 删除绑定
 */
export function useDeleteAgentToolBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentToolBindingsApi.deleteBinding(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agentToolBindingKeys.all });
    },
  });
}

/**
 * 全局绑定矩阵
 */
export function useAgentToolMatrix() {
  return useQuery({
    queryKey: agentToolBindingKeys.matrix(),
    queryFn: () => agentToolBindingsApi.getAgentToolMatrix(),
    staleTime: 60_000,
  });
}

/**
 * 绑定统计
 */
export function useAgentToolBindingStats() {
  return useQuery({
    queryKey: agentToolBindingKeys.stats(),
    queryFn: () => agentToolBindingsApi.getStats(),
    staleTime: 30_000,
  });
}
