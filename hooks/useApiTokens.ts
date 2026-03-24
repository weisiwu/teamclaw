/**
 * React Query hooks for API Token management.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiTokensApi } from "@/lib/api/apiTokensClient";
import type {
  ApiToken,
  CreateApiTokenRequest,
  UpdateApiTokenRequest,
  ApiTokenFilters,
} from "@/lib/api/apiTokens";

// ============ Query Keys ============

export const apiTokenKeys = {
  all: ["apiTokens"] as const,
  list: (filters?: ApiTokenFilters) => [...apiTokenKeys.all, "list", filters] as const,
  detail: (id: string) => [...apiTokenKeys.all, "detail", id] as const,
};

// ============ Queries ============

/** List API tokens with filters */
export function useApiTokenList(filters: ApiTokenFilters = {}) {
  return useQuery({
    queryKey: apiTokenKeys.list(filters),
    queryFn: () => apiTokensApi.list(filters),
    staleTime: 30_000,
  });
}

/** Get a single API token */
export function useApiToken(id: string) {
  return useQuery({
    queryKey: apiTokenKeys.detail(id),
    queryFn: () => apiTokensApi.get(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

// ============ Mutations ============

/** Create a new API token */
export function useCreateApiToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateApiTokenRequest) => apiTokensApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiTokenKeys.all });
    },
  });
}

/** Update an existing API token */
export function useUpdateApiToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateApiTokenRequest }) =>
      apiTokensApi.update(id, body),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: apiTokenKeys.all });
      queryClient.invalidateQueries({ queryKey: apiTokenKeys.detail(id) });
    },
  });
}

/** Delete an API token */
export function useDeleteApiToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiTokensApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiTokenKeys.all });
    },
  });
}

/** Verify an API token */
export function useVerifyApiToken() {
  return useMutation({
    mutationFn: (id: string) => apiTokensApi.verify(id),
  });
}
