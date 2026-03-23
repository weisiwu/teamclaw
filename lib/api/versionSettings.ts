import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./versionShared";
import { VersionSettings, Version, VersionBumpType, BumpHistoryRecord } from "./types";

// ========== 模块级状态（版本设置）==========
let versionSettings: VersionSettings = {
  autoBump: true,
  bumpType: 'patch',
  autoTag: true,
  tagPrefix: 'v',
  tagOnStatus: ['published'],
};

// ========== 版本设置 API ==========

export async function getVersionSettingsAPI(): Promise<VersionSettings> {
  const res = await fetch(`${API_BASE}/versions/settings`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || 'Failed to fetch version settings');
}

export async function updateVersionSettingsAPI(settings: Partial<VersionSettings>): Promise<VersionSettings> {
  const res = await fetch(`${API_BASE}/versions/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || 'Failed to update version settings');
}

export function getVersionSettings(): VersionSettings {
  return { ...versionSettings };
}

export function updateVersionSettings(settings: Partial<VersionSettings>): VersionSettings {
  versionSettings = { ...versionSettings, ...settings };

  if (settings.autoBump !== undefined || settings.bumpType !== undefined ||
      settings.autoTag !== undefined || settings.tagPrefix !== undefined) {
    versionSettings.lastBumpedAt = new Date().toISOString();
  }

  console.log('[Version Settings] Updated:', versionSettings);
  return { ...versionSettings };
}

export async function syncUpdateVersionSettings(settings: Partial<VersionSettings>): Promise<VersionSettings> {
  try {
    const updated = await updateVersionSettingsAPI(settings);
    versionSettings = updated;
    return updated;
  } catch (err) {
    console.warn('[Version Settings] Server unavailable, using local settings:', err);
    return updateVersionSettings(settings);
  }
}

// ========== Bump Preview ==========

export interface BumpPreview {
  bumpType: 'major' | 'minor' | 'patch';
  currentVersion: string;
  newVersion: string;
  isDefault: boolean;
  changelog: {
    features: string[];
    fixes: string[];
    improvements: string[];
    breaking: string[];
    docs: string[];
  } | null;
}

export async function getBumpPreview(
  versionId: string,
  taskType?: string
): Promise<{ currentVersion: string; taskType: string | null; previews: BumpPreview[] }> {
  const params = taskType ? new URLSearchParams({ taskType }) : '';
  const url = `/api/v1/versions/${versionId}/bump-preview${params ? '?' + params : ''}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || '预览失败');
  return json.data;
}

// ========== Auto-Bump API ==========

export interface AutoBumpResponse {
  previousVersion: string;
  newVersion: Version;
  bumpType: VersionBumpType;
  tagName: string;
  autoBumped: boolean;
}

export async function triggerAutoBump(
  versionId: string,
  bumpType?: VersionBumpType
): Promise<AutoBumpResponse> {
  const res = await fetch(`${API_BASE}/versions/${versionId}/auto-bump`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bumpType }),
  });
  const json = await res.json();
  if ((json.code === 200 || json.code === 0) && json.data) {
    return json.data;
  }
  throw new Error(json.message || 'Auto-bump failed');
}

// ========== Bump History API ==========
// BumpHistoryRecord is imported from ./types

export interface BumpHistoryResponse {
  data: BumpHistoryRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getVersionBumpHistory(
  versionId: string,
  page = 1,
  pageSize = 50
): Promise<BumpHistoryResponse> {
  const url = `${API_BASE}/versions/${versionId}/bump-history?page=${page}&pageSize=${pageSize}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || '获取 bump 历史失败');
}

// ========== Task Bump API ==========

export async function triggerTaskBump(taskId: string): Promise<{
  success: boolean;
  previousVersion: string;
  newVersion: string;
  newVersionId: string;
  bumpType: string;
  gitTag?: string;
  bumpHistoryId: string;
  summary: string;
}> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/trigger-bump`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (json.success) return json.data;
  throw new Error(json.error || '触发 bump 失败');
}

// ========== Change Stats API ==========

export interface ChangeStats {
  tagName: string;
  commitCount: number;
  fileCount: number;
  totalAdditions: number;
  totalDeletions: number;
  changeTypes: {
    feat: number;
    fix: number;
    docs: number;
    style: number;
    refactor: number;
    perf: number;
    ci: number;
    test: number;
    chore: number;
    other: number;
  };
  topFiles: Array<{ path: string; additions: number; deletions: number }>;
}

export async function getVersionChangeStats(tagName: string): Promise<ChangeStats | null> {
  try {
    const res = await fetch(`${API_BASE}/versions/change-stats?tag=${encodeURIComponent(tagName)}`);
    const json = await res.json();
    if ((json.code === 200 || json.code === 0) && json.data) return json.data;
    return null;
  } catch {
    return null;
  }
}

// ========== Version Head Status API ==========

export interface VersionHeadStatus {
  isCurrentHead: boolean;
  currentCommit: string;
  versionCommit: string;
  canRollback: boolean;
}

export async function getVersionHeadStatus(versionId: string): Promise<VersionHeadStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/head-status`);
    const json = await res.json();
    if ((json.code === 200 || json.code === 0) && json.data) return json.data;
    return null;
  } catch {
    return null;
  }
}

// ========== React Query Hooks ==========

export function useVersionSettings() {
  return useQuery({
    queryKey: ["versionSettings"],
    queryFn: async () => {
      try {
        return await getVersionSettingsAPI();
      } catch {
        return getVersionSettings();
      }
    },
    staleTime: 1000 * 60,
  });
}

export function useUpdateVersionSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSettings: Partial<VersionSettings>) => {
      return syncUpdateVersionSettings(newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versionSettings"] });
    },
  });
}

export function useBumpPreview(versionId: string, taskType?: string) {
  return useQuery({
    queryKey: ['bumpPreview', versionId, taskType],
    queryFn: () => getBumpPreview(versionId, taskType),
    enabled: Boolean(versionId),
    staleTime: 60 * 1000,
  });
}

export function useAutoBump() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, bumpType }: { versionId: string; bumpType?: VersionBumpType }) =>
      triggerAutoBump(versionId, bumpType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
      queryClient.invalidateQueries({ queryKey: ['versionSettings'] });
    },
  });
}

export function useVersionBumpHistory(versionId: string | null, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['versionBumpHistory', versionId, page, pageSize],
    queryFn: () => getVersionBumpHistory(versionId!, page, pageSize),
    enabled: Boolean(versionId),
    staleTime: 30 * 1000,
  });
}

export function useTriggerTaskBump() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => triggerTaskBump(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
      queryClient.invalidateQueries({ queryKey: ['versionSettings'] });
      queryClient.invalidateQueries({ queryKey: ['versionBumpHistory'] });
    },
  });
}

export function useVersionChangeStats(tagName: string | null) {
  return useQuery({
    queryKey: ['versionChangeStats', tagName],
    queryFn: () => getVersionChangeStats(tagName!),
    enabled: Boolean(tagName),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVersionHeadStatus(versionId: string | null) {
  return useQuery({
    queryKey: ['versionHeadStatus', versionId],
    queryFn: () => getVersionHeadStatus(versionId!),
    enabled: Boolean(versionId),
    staleTime: 30 * 1000,
  });
}
