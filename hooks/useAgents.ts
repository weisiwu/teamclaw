/**
 * useAgents - React Query hooks for Agent API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentApi } from "@/lib/api/agents";
import type { DispatchRequest } from "@/lib/api/agents";

export const agentKeys = {
  all: ["agents"] as const,
  list: () => [...agentKeys.all, "list"] as const,
  detail: (name: string) => [...agentKeys.all, "detail", name] as const,
  team: () => [...agentKeys.all, "team"] as const,
  sessions: (name: string) => [...agentKeys.all, "sessions", name] as const,
};

export function useAgentList() {
  return useQuery({
    queryKey: agentKeys.list(),
    queryFn: () => agentApi.getAll(),
    staleTime: 30_000,
  });
}

export function useAgent(name: string) {
  return useQuery({
    queryKey: agentKeys.detail(name),
    queryFn: () => agentApi.getByName(name),
    enabled: !!name,
  });
}

export function useTeamOverview() {
  return useQuery({
    queryKey: agentKeys.team(),
    queryFn: () => agentApi.getTeamOverview(),
    staleTime: 30_000,
  });
}

export function useAgentSessions(name: string) {
  return useQuery({
    queryKey: agentKeys.sessions(name),
    queryFn: () => agentApi.getSessions(name),
    enabled: !!name,
  });
}

export function useUpdateAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, updates }: { name: string; updates: { defaultModel?: string; capabilities?: string[] } }) =>
      agentApi.updateConfig(name, updates),
    onSuccess: (_, { name }) => {
      qc.invalidateQueries({ queryKey: agentKeys.detail(name) });
      qc.invalidateQueries({ queryKey: agentKeys.list() });
    },
  });
}

export function useDispatchTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: DispatchRequest) => agentApi.dispatch(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agentKeys.list() });
      qc.invalidateQueries({ queryKey: agentKeys.team() });
    },
  });
}
