/**
 * API Token CRUD client — proxies to the backend API via Next.js proxy routes.
 */

import type {
  ApiToken,
  CreateApiTokenRequest,
  UpdateApiTokenRequest,
  VerifyApiTokenResponse,
  ApiTokenListResponse,
  ApiTokenFilters,
} from "./apiTokens";

// Re-export types for convenience
export type {
  ApiToken,
  CreateApiTokenRequest,
  UpdateApiTokenRequest,
  VerifyApiTokenResponse,
  ApiTokenListResponse,
  ApiTokenFilters,
  ApiTokenProvider,
  ApiTokenStatus,
} from "./apiTokens";

export {
  API_TOKEN_PROVIDERS,
  API_TOKEN_STATUS_OPTIONS,
} from "./apiTokens";

// ============ API Client ============

const API_BASE = "/api/v1/admin/api-tokens";

function buildQuery(filters: ApiTokenFilters): string {
  const params = new URLSearchParams();
  if (filters.provider && filters.provider !== "all") params.set("provider", filters.provider);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  return params.toString() ? `?${params.toString()}` : "";
}

export const apiTokensApi = {
  /** List API tokens with optional filters */
  async list(filters: ApiTokenFilters = {}): Promise<ApiTokenListResponse> {
    const qs = buildQuery(filters);
    const res = await fetch(`${API_BASE}${qs}`);
    const data = await res.json();
    return data;
  },

  /** Get a single API token by ID */
  async get(id: string): Promise<{ data: ApiToken }> {
    const res = await fetch(`${API_BASE}/${id}`);
    const data = await res.json();
    return data;
  },

  /** Create a new API token */
  async create(body: CreateApiTokenRequest): Promise<{ data: ApiToken }> {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data;
  },

  /** Update an existing API token */
  async update(id: string, body: UpdateApiTokenRequest): Promise<{ data: ApiToken }> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data;
  },

  /** Delete an API token */
  async remove(id: string): Promise<void> {
    await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  },

  /** Verify an API token (test connectivity) */
  async verify(id: string): Promise<VerifyApiTokenResponse> {
    const res = await fetch(`${API_BASE}/${id}/verify`, { method: "POST" });
    const data = await res.json();
    return data;
  },
};

export default apiTokensApi;
