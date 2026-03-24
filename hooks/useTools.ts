/**
 * useTools - React Query hooks for Tools API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toolsApi } from '@/lib/api/tools';
import type {
  Tool,
  ToolsListResponse,
  CreateToolInput,
  UpdateToolInput,
  ToolCategory,
  ToolSource,
} from '@/lib/api/tools';

export const toolKeys = {
  all: ['tools'] as const,
  list: (filters?: { category?: ToolCategory | ''; source?: ToolSource | ''; search?: string }) =>
    [...toolKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...toolKeys.all, 'detail', id] as const,
};

export function useTools(filters?: {
  category?: ToolCategory | '';
  source?: ToolSource | '';
  search?: string;
}) {
  return useQuery({
    queryKey: toolKeys.list(filters),
    queryFn: () => toolsApi.getAll(filters),
    staleTime: 30_000,
  });
}

export function useTool(id: string) {
  return useQuery({
    queryKey: toolKeys.detail(id),
    queryFn: () => toolsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateToolInput) => toolsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toolKeys.all });
    },
  });
}

export function useUpdateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateToolInput }) =>
      toolsApi.update(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: toolKeys.all });
      qc.invalidateQueries({ queryKey: toolKeys.detail(id) });
    },
  });
}

export function useDeleteTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toolsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toolKeys.all });
    },
  });
}

export function useToggleTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toolsApi.toggle(id, enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toolKeys.all });
    },
  });
}
