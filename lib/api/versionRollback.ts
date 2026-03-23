import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./versionShared";
import { RollbackHistoryRecord } from "./types";

// ========== Version Rollback Types ==========

export interface RollbackRequest {
  versionId: string;
  targetVersion: string;
  mode: "revert" | "checkout";
  createBackup?: boolean;
  message?: string;
}

export interface RollbackResponse {
  success: boolean;
  rollbackId: string;
  newVersionId?: string;
  message: string;
  rollbackedAt?: string;
}

export interface RollbackTarget {
  name: string;
  type: "tag" | "branch";
  commit?: string;
  date?: string;
  isCurrent?: boolean;
  isRemote?: boolean;
}

export interface RollbackTargetsResponse {
  tags: Array<{ name: string; commit: string; date: string; message?: string }>;
  branches: Array<{ name: string; isCurrent: boolean; isRemote: boolean }>;
}

// ========== Version Rollback API ==========

export async function getRollbackTargetsAPI(versionId: string): Promise<RollbackTargetsResponse> {
  const res = await fetch(`${API_BASE}/versions/${versionId}/rollback-targets`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || 'Failed to fetch rollback targets');
}

export async function getRollbackPreviewAPI(versionId: string, ref: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/versions/${versionId}/rollback-preview?ref=${encodeURIComponent(ref)}`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || 'Failed to fetch rollback preview');
}

export async function rollbackVersion(request: RollbackRequest): Promise<RollbackResponse> {
  console.log("[Version Rollback] Initiating rollback:", request);

  const type = request.mode === "revert" ? "tag" : "branch";

  const res = await fetch(`${API_BASE}/versions/${request.versionId}/rollback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target: request.targetVersion,
      type,
      createBranch: request.createBackup ?? true,
    }),
  });

  const json = await res.json();
  if (!res.ok || (json.code !== 200 && json.code !== 0)) {
    throw new Error(json.message || "回退请求失败");
  }

  return {
    success: json.data?.success ?? true,
    rollbackId: `rb-${Date.now()}`,
    message: json.data?.message || `成功回退到 ${request.targetVersion}`,
    rollbackedAt: new Date().toISOString(),
  };
}

export async function getRollbackHistory(versionId?: string): Promise<RollbackHistoryRecord[]> {
  if (!versionId) return [];
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/rollback-history`);
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data || [];
    }
  } catch {
    // Fallback to empty
  }
  return [];
}

// ========== Version Rollback Hooks ==========

export function useRollbackTargets(versionId: string) {
  return useQuery({
    queryKey: ["rollbackTargets", versionId],
    queryFn: () => getRollbackTargetsAPI(versionId),
    enabled: !!versionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRollbackPreview(versionId: string, ref: string | null) {
  return useQuery({
    queryKey: ["rollbackPreview", versionId, ref],
    queryFn: () => getRollbackPreviewAPI(versionId, ref!),
    enabled: !!versionId && !!ref,
    staleTime: 60 * 1000,
  });
}

export function useRollbackVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RollbackRequest) => rollbackVersion(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
      queryClient.invalidateQueries({ queryKey: ["versionHistory"] });
    },
  });
}

export function useRollbackHistory(versionId?: string) {
  return useQuery({
    queryKey: ["rollbackHistory", versionId],
    queryFn: () => getRollbackHistory(versionId),
    staleTime: 60 * 1000,
  });
}
