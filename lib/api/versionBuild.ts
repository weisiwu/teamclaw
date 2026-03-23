import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./versionShared";
import {
  Version,
  VersionSnapshot,
  SnapshotListResponse,
  CreateSnapshotRequest,
  GitBranch,
  CreateBranchRequest,
  RenameBranchRequest,
  BranchProtectionRequest,
  BranchListResponse,
  VersionBumpType,
  BumpVersionResponse,
  ReleaseLog,
  BuildArtifact,
  BatchDownloadRequest,
  BatchDownloadResponse,
  DownloadStats,
  BuildEnhancementSettings,
  BuildNotificationSettings,
  BuildEnvironment,
  BUILD_ENVIRONMENTS,
  DEFAULT_BUILD_RETRY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "./types";

// Re-export autoBumpVersion
export { autoBumpVersion } from "./versionShared";

// ========== 构建相关 API ==========

export async function triggerBuild(versionId: string): Promise<{ success: boolean; buildId: string }> {
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
}

export async function rebuildVersion(versionId: string): Promise<{ success: boolean; buildId: string }> {
  return triggerBuild(versionId);
}

export async function downloadArtifact(versionId: string, format: string = 'zip'): Promise<{ success: boolean; url: string }> {
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
}

export async function getDownloadHistory(): Promise<Array<{
  id: string;
  versionId: string;
  version: string;
  format: string;
  url: string;
  downloadedAt: string;
}>> {
  const res = await fetch(`${API_BASE}/builds/download-history`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取下载历史失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data || [];
  }
  throw new Error(json.message || '获取下载历史失败');
}

export async function addDownloadRecord(record: {
  versionId: string;
  version: string;
  format: string;
  url: string;
}): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/builds/download-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `记录下载失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '记录下载失败');
}

// ========== 快照管理 API ==========

export async function getVersionSnapshots(versionId: string): Promise<SnapshotListResponse> {
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
}

export async function createSnapshot(
  versionId: string,
  request: CreateSnapshotRequest
): Promise<VersionSnapshot> {
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
}

export async function restoreSnapshot(snapshotId: string): Promise<Version> {
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
}

// ========== 分支管理 API ==========

export async function getBranches(): Promise<BranchListResponse> {
  const res = await fetch(`${API_BASE}/branches`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取分支列表失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '获取分支列表失败');
}

export async function createBranch(request: CreateBranchRequest): Promise<GitBranch> {
  const res = await fetch(`${API_BASE}/branches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
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

export async function deleteBranch(branchId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/branches/${encodeURIComponent(branchId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `删除分支失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return true;
  }
  throw new Error(json.message || '删除分支失败');
}

export async function setMainBranch(branchId: string): Promise<GitBranch | null> {
  const res = await fetch(`${API_BASE}/branches/${encodeURIComponent(branchId)}/main`, {
    method: 'PUT',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `设置主分支失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '设置主分支失败');
}

export async function renameBranch(request: RenameBranchRequest): Promise<GitBranch | null> {
  const res = await fetch(`${API_BASE}/branches/${encodeURIComponent(request.branchId)}/rename`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newName: request.newName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `重命名分支失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '重命名分支失败');
}

export async function toggleBranchProtection(request: BranchProtectionRequest): Promise<GitBranch | null> {
  const res = await fetch(`${API_BASE}/branches/${encodeURIComponent(request.branchId)}/protect`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ protected: request.protected }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `设置分支保护失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '设置分支保护失败');
}

// ========== Version Bump API ==========

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

export async function getReleaseLogs(versionId?: string): Promise<ReleaseLog[]> {
  const params = versionId ? `?versionId=${encodeURIComponent(versionId)}` : '';
  const res = await fetch(`${API_BASE}/versions/release-logs${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取发布记录失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data || [];
  }
  throw new Error(json.message || '获取发布记录失败');
}

// ========== 构建增强功能 API ==========

const BUILD_SETTINGS_KEY = 'teamclaw_build_settings';

export function getBuildEnhancementSettings(): BuildEnhancementSettings {
  if (typeof window === 'undefined') {
    return { retry: DEFAULT_BUILD_RETRY_SETTINGS, notification: DEFAULT_NOTIFICATION_SETTINGS };
  }
  const stored = localStorage.getItem(BUILD_SETTINGS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }
  return { retry: DEFAULT_BUILD_RETRY_SETTINGS, notification: DEFAULT_NOTIFICATION_SETTINGS };
}

export function saveBuildEnhancementSettings(settings: Partial<BuildEnhancementSettings>): void {
  if (typeof window === 'undefined') return;
  const current = getBuildEnhancementSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(BUILD_SETTINGS_KEY, JSON.stringify(updated));
}

export async function sendBuildNotification(
  version: string,
  status: 'success' | 'failed',
  settings: BuildNotificationSettings
): Promise<void> {
  if (settings.notifyOn === 'never') return;
  if (settings.notifyOn === 'failure' && status === 'success') return;

  const message = `版本 ${version} 构建${status === 'success' ? '成功' : '失败'}`;

  for (const channel of settings.notifyChannels) {
    if (channel === 'feishu') {
      console.log(`[飞书通知] ${message}`);
    } else if (channel === 'email') {
      console.log(`[邮件通知] ${message} to ${settings.notifyEmails?.join(', ')}`);
    }
  }
}

export async function triggerBuildWithRetry(
  versionId: string,
  onRetry?: (attempt: number, maxRetries: number) => void
): Promise<{ success: boolean; buildId: string; attempts: number }> {
  const settings = getBuildEnhancementSettings();
  const { maxRetries, retryDelays } = settings.retry;

  let attempts = 0;

  for (let i = 0; i <= maxRetries; i++) {
    attempts = i + 1;

    try {
      const result = await triggerBuild(versionId);
      if (result.success) {
        sendBuildNotification(versionId, 'success', settings.notification);
        return { ...result, attempts };
      }
    } catch (error) {
      console.error('Build attempt failed:', error);
    }

    if (i < maxRetries && onRetry) {
      onRetry(i + 1, maxRetries);
      const retryDelay = retryDelays[Math.min(i, retryDelays.length - 1)] * 1000;
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  sendBuildNotification(versionId, 'failed', settings.notification);
  return { success: false, buildId: '', attempts };
}

export function getBuildEnvironments(): BuildEnvironment[] {
  return BUILD_ENVIRONMENTS;
}

// ========== 产物下载增强 API ==========

export async function batchDownloadArtifacts(request: BatchDownloadRequest): Promise<BatchDownloadResponse> {
  const res = await fetch(`${API_BASE}/builds/batch-download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `批量下载失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '批量下载失败');
}

export async function getDownloadStats(): Promise<DownloadStats> {
  const res = await fetch(`${API_BASE}/builds/download-stats`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取下载统计失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '获取下载统计失败');
}

// ========== Build Artifacts API ==========

const ARTIFACTS_API = "/api/v1/build/artifacts";

export interface ArtifactsResponse {
  code: number;
  data: { artifacts: BuildArtifact[]; total: number };
}

export async function getBuildArtifacts(versionName?: string): Promise<BuildArtifact[]> {
  const params = versionName ? `?versionName=${encodeURIComponent(versionName)}` : "";
  const res = await fetch(`${ARTIFACTS_API}${params}`);
  const json: ArtifactsResponse = await res.json();
  if (json.code === 0 || json.code === 200) {
    return json.data?.artifacts || [];
  }
  throw new Error('获取构建产物列表失败');
}

export async function uploadBuildArtifact(
  file: File,
  versionName: string,
  env = "production",
  platform = "unknown",
  arch = "unknown"
): Promise<BuildArtifact> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("versionName", versionName);
  formData.append("env", env);
  formData.append("platform", platform);
  formData.append("arch", arch);
  const res = await fetch(ARTIFACTS_API, { method: "POST", body: formData });
  const json = await res.json();
  if (json.code === 0 || json.code === 200) {
    return json.data as BuildArtifact;
  }
  throw new Error(json.message || '上传构建产物失败');
}

// ========== Server Artifacts API ==========

const SERVER_ARTIFACTS_API = "/api/v1/build/artifacts";

export interface ServerArtifact {
  path: string;
  name: string;
  size: number;
  sizeFormatted: string;
  url: string;
  type: string;
  modifiedAt: string;
}

export interface ServerArtifactsResponse {
  code: number;
  data: {
    versionId: string;
    buildId: string;
    buildNumber: number;
    buildStatus: string;
    projectPath: string;
    artifacts: ServerArtifact[];
    totalSize: number;
    totalSizeFormatted: string;
  };
}

export async function getVersionArtifacts(versionId: string, buildNumber?: number): Promise<ServerArtifact[]> {
  const params = buildNumber ? `?buildNumber=${buildNumber}` : "";
  const res = await fetch(`${SERVER_ARTIFACTS_API}/${encodeURIComponent(versionId)}${params}`);
  const json: ServerArtifactsResponse = await res.json();
  if (json.code !== 0) return [];
  return json.data?.artifacts || [];
}

// ========== React Query Hooks ==========

export function useDownloadHistory() {
  return useQuery({
    queryKey: ["downloadHistory"],
    queryFn: () => getDownloadHistory(),
  });
}

export function useAddDownloadRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (record: { versionId: string; version: string; format: string; url: string }) =>
      addDownloadRecord(record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloadHistory"] });
    },
  });
}

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: () => getBranches(),
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateBranchRequest) => createBranch(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (branchId: string) => deleteBranch(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useSetMainBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (branchId: string) => setMainBranch(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["mainBranch"] });
    },
  });
}

export function useRenameBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RenameBranchRequest) => renameBranch(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useToggleBranchProtection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BranchProtectionRequest) => toggleBranchProtection(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useReleaseLogs(versionId?: string) {
  return useQuery({
    queryKey: ["releaseLogs", versionId],
    queryFn: () => getReleaseLogs(versionId),
  });
}

export function useBuildArtifacts(versionName?: string) {
  return useQuery({
    queryKey: ["buildArtifacts", versionName],
    queryFn: () => getBuildArtifacts(versionName),
    staleTime: 30 * 1000,
  });
}

export function useVersionArtifacts(versionId: string, buildNumber?: number) {
  return useQuery({
    queryKey: ["versionArtifacts", versionId, buildNumber],
    queryFn: () => getVersionArtifacts(versionId, buildNumber),
    staleTime: 30 * 1000,
    enabled: !!versionId,
  });
}
