/**
 * useSkills - React Query hooks for Skills API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillsApi } from '@/lib/api/skills';
import type {
  Skill,
  SkillsListResponse,
  CreateSkillInput,
  UpdateSkillInput,
  SkillCategory,
  SkillSource,
} from '@/lib/api/skills';

export const skillKeys = {
  all: ['skills'] as const,
  list: (filters?: { category?: SkillCategory | ''; source?: SkillSource | ''; search?: string }) =>
    [...skillKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...skillKeys.all, 'detail', id] as const,
};

export function useSkills(filters?: {
  category?: SkillCategory | '';
  source?: SkillSource | '';
  search?: string;
}) {
  return useQuery({
    queryKey: skillKeys.list(filters),
    queryFn: () => skillsApi.getAll(filters),
    staleTime: 30_000,
  });
}

export function useSkill(id: string) {
  return useQuery({
    queryKey: skillKeys.detail(id),
    queryFn: () => skillsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSkillInput) => skillsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSkillInput }) =>
      skillsApi.update(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: skillKeys.all });
      qc.invalidateQueries({ queryKey: skillKeys.detail(id) });
    },
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => skillsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}

export function useToggleSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      skillsApi.toggle(id, enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}

export function useSyncSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => skillsApi.sync(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}
