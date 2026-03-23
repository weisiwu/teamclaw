import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./versionShared";

// Re-export types for convenience
export type { BatchDownloadRequest, BatchDownloadResponse, DownloadUrlVerification, DownloadStats, RollbackHistoryRecord } from './types';
import {
  Version,
  VersionListResponse,
  CreateVersionRequest,
  UpdateVersionRequest,
  VersionTag,
  CreateSnapshotRequest,
  GitBranch,
  VersionBumpType,
  BumpVersionResponse,
  CreateTagRequest,
  CreateTagResponse,
  DownloadUrlVerification,
  SnapshotListResponse,
} from "./types";

// ========== Re-export 所有子模块（向后兼容）==========
export * from "./versionSettings";
export * from "./versionBuild";
export * from "./versionRollback";
export * from "./versionTag";
export * from "./versionCompare";
export * from "./versionScreenshot";
export * from "./versionSummary";

// ========== 版本 CRUD API ==========

export async function getVersions(
  page: number = 1,
  pageSize: number = 10,
  status: string = "all"
): Promise<VersionListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status !== 'all') params.set('status', status);
  const res = await fetch(`${API_BASE}/versions?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取版本列表失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '获取版本列表失败');
}

export async function getVersion(id: string): Promise<Version | null> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取版本详情失败 (${res.status})`);
  }
  const json = await res.json();
  if ((json.code === 200 || json.code === 0) && json.data) {
    return json.data;
  }
  return null;
}

export async function createVersion(request: CreateVersionRequest): Promise<Version> {
  const res = await fetch(`${API_BASE}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `创建版本失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '创建版本失败');
}

export async function updateVersion(
  id: string,
  request: UpdateVersionRequest
): Promise<Version | null> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `更新版本失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '更新版本失败');
}

export async function deleteVersion(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `删除版本失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return true;
  }
  throw new Error(json.message || '删除版本失败');
}

// ========== Tag 管理 API ==========

export async function addVersionTag(versionId: string, tag: VersionTag): Promise<Version | null> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `添加版本标签失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '添加版本标签失败');
}

export async function removeVersionTag(versionId: string, tag: VersionTag): Promise<Version | null> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/tags/${encodeURIComponent(tag)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `移除版本标签失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '移除版本标签失败');
}

export async function setMainVersion(versionId: string): Promise<Version | null> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/main`, {
    method: 'PUT',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `设置主版本失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '设置主版本失败');
}

// ========== 手动创建 Git Tag ==========

export async function createGitTag(versionId: string, request?: CreateTagRequest): Promise<CreateTagResponse> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/git-tag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `创建 Git Tag 失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '创建 Git Tag 失败');
}

// ========== React Query Hooks ==========

export function useVersions(page: number = 1, pageSize: number = 10, status: string = "all") {
  return useQuery({
    queryKey: ["versions", page, pageSize, status],
    queryFn: () => getVersions(page, pageSize, status),
  });
}

export function useVersion(id: string) {
  return useQuery({
    queryKey: ["version", id],
    queryFn: () => getVersion(id),
    enabled: !!id,
  });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useUpdateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateVersionRequest }) =>
      updateVersion(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useDeleteVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useCreateBranchForVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, branchName }: { versionId: string; branchName: string }) =>
      createBranchAPI(branchName, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useSetMainVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setMainVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useAddVersionTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, tag }: { versionId: string; tag: VersionTag }) =>
      addVersionTag(versionId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useRemoveVersionTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, tag }: { versionId: string; tag: VersionTag }) =>
      removeVersionTag(versionId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useCreateGitTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, request }: { versionId: string; request?: CreateTagRequest }) =>
      createGitTag(versionId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

// ========== Build Hooks ==========

async function createBranchAPI(branchName: string, versionId?: string): Promise<GitBranch> {
  const res = await fetch(`${API_BASE}/branches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: branchName, versionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `创建分支失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0 || json.code === 201) {
    return json.data;
  }
  throw new Error(json.message || '创建分支失败');
}

export function useTriggerBuild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `触发构建失败 (${res.status})`);
      }
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        return json.data;
      }
      throw new Error(json.message || '触发构建失败');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useRebuildVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rebuild: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `重新构建失败 (${res.status})`);
      }
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        return json.data;
      }
      throw new Error(json.message || '重新构建失败');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useDownloadArtifact() {
  return useMutation({
    mutationFn: async ({ versionId, format = 'zip' }: { versionId: string; format?: string }) => {
      const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/artifacts?format=${format}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `获取下载链接失败 (${res.status})`);
      }
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        return json.data;
      }
      throw new Error(json.message || '获取下载链接失败');
    },
  });
}

// ========== Snapshot Hooks ==========

export function useVersionSnapshots(versionId: string) {
  return useQuery({
    queryKey: ["versionSnapshots", versionId],
    queryFn: async (): Promise<SnapshotListResponse> => {
      const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/snapshots`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `获取快照列表失败 (${res.status})`);
      }
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        return json.data;
      }
      throw new Error(json.message || '获取快照列表失败');
    },
    enabled: !!versionId,
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ versionId, request }: { versionId: string; request: CreateSnapshotRequest }) => {
      const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `创建快照失败 (${res.status})`);
      }
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        return json.data;
      }
      throw new Error(json.message || '创建快照失败');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versionSnapshots"] });
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useRestoreSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (snapshotId: string) => {
      const res = await fetch(`${API_BASE}/versions/snapshots/${encodeURIComponent(snapshotId)}/restore`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `恢复快照失败 (${res.status})`);
      }
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        return json.data;
      }
      throw new Error(json.message || '恢复快照失败');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

// ========== Bump Hook ==========

export async function bumpVersion(versionId: string, bumpType: VersionBumpType): Promise<BumpVersionResponse> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/bump`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bumpType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `版本递增失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return {
      success: true,
      previousVersion: json.data.previousVersion,
      newVersion: json.data.newVersion,
      bumpType: json.data.bumpType,
      gitTag: json.data.gitTag,
    };
  }
  throw new Error(json.message || '版本递增失败');
}

export function useBumpVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, bumpType }: { versionId: string; bumpType: VersionBumpType }) =>
      bumpVersion(versionId, bumpType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

// ========== 产物验证 API ==========

export async function verifyDownloadUrl(
  versionId: string,
  url: string
): Promise<DownloadUrlVerification> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/verify-url?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `验证下载链接失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '验证下载链接失败');
}
