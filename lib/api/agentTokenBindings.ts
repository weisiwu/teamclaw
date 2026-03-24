/**
 * Agent-Token Bindings API client.
 * Proxies to backend via Next.js routes: /api/v1/admin/agents/[name]/token-bindings
 */

import type { ApiToken } from "./apiTokens";

// ============ Types ============

export type BindingLevel = "light" | "medium" | "strong";

export interface AgentTokenBinding {
  id: string;
  agentName: string;
  tokenId: string;
  priority: number; // 1 = highest
  levels: BindingLevel[]; // empty = all levels
  models: string[]; // empty = all models
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined token info
  token?: ApiToken;
}

export interface CreateBindingRequest {
  tokenId: string;
  priority: number;
  levels?: BindingLevel[];
  models?: string[];
  enabled?: boolean;
}

export interface UpdateBindingRequest {
  priority?: number;
  levels?: BindingLevel[];
  models?: string[];
  enabled?: boolean;
}

export interface BindingOverview {
  agents: string[];
  tokens: Array<{
    token: ApiToken;
    boundAgentCount: number;
    bindings: AgentTokenBinding[];
  }>;
  totalBindings: number;
}

// ============ API Client ============

const API_BASE = "/api/v1/admin/agent-token-bindings";

export const agentTokenBindingsApi = {
  /** List bindings for a specific agent */
  async getByAgent(agentName: string): Promise<{ data: AgentTokenBinding[] }> {
    const res = await fetch(`/api/v1/admin/agents/${encodeURIComponent(agentName)}/token-bindings`);
    const data = await res.json();
    return data;
  },

  /** Create a new binding for an agent */
  async create(agentName: string, body: CreateBindingRequest): Promise<{ data: AgentTokenBinding }> {
    const res = await fetch(`/api/v1/admin/agents/${encodeURIComponent(agentName)}/token-bindings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create binding");
    return data;
  },

  /** Update an existing binding */
  async update(id: string, body: UpdateBindingRequest): Promise<{ data: AgentTokenBinding }> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update binding");
    return data;
  },

  /** Delete a binding */
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to delete binding");
    }
  },

  /** Get overview matrix (all agents × all tokens) */
  async getOverview(): Promise<{ data: BindingOverview }> {
    const res = await fetch(`${API_BASE}/overview`);
    const data = await res.json();
    return data;
  },
};

export default agentTokenBindingsApi;
