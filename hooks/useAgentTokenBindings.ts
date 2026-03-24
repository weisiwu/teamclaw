/**
 * useAgentTokenBindings - React Query hooks for Agent-Token Bindings API.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentTokenBindingsApi } from "@/lib/api/agentTokenBindings";
import type {
  CreateBindingRequest,
  UpdateBindingRequest,
} from "@/lib/api/agentTokenBindings";

// ============ Query Keys ============

export const bindingKeys = {
  all: ["agentTokenBindings"] as const,
  byAgent: (agentName: string) => [...bindingKeys.all, "agent", agentName] as const,
  overview: () => [...bindingKeys.all, "overview"] as const,
};

// ============ Queries ============

/** List bindings for a specific agent */
export function useBindingsByAgent(agentName: string) {
  return useQuery({
    queryKey: bindingKeys.byAgent(agentName),
    queryFn: () => agentTokenBindingsApi.getByAgent(agentName),
    enabled: Boolean(agentName),
    staleTime: 30_000,
  });
}

/** Get the full binding overview matrix */
export function useBindingsOverview() {
  return useQuery({
    queryKey: bindingKeys.overview(),
    queryFn: () => agentTokenBindingsApi.getOverview(),
    staleTime: 30_000,
  });
}

// ============ Mutations ============

/** Create a new binding for an agent */
export function useCreateBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentName, body }: { agentName: string; body: CreateBindingRequest }) =>
      agentTokenBindingsApi.create(agentName, body),
    onSuccess: (_data, { agentName }) => {
      qc.invalidateQueries({ queryKey: bindingKeys.byAgent(agentName) });
      qc.invalidateQueries({ queryKey: bindingKeys.overview() });
    },
  });
}

/** Update an existing binding */
export function useUpdateBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBindingRequest }) =>
      agentTokenBindingsApi.update(id, body),
    onSuccess: () => {
      // Invalidate all agent bindings and overview since we don't know which agent
      qc.invalidateQueries({ queryKey: bindingKeys.all });
    },
  });
}

/** Delete a binding */
export function useDeleteBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentTokenBindingsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bindingKeys.all });
    },
  });
}
