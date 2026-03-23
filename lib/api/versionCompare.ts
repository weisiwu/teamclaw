import { useQuery } from "@tanstack/react-query";
import { VersionSummary } from "./types";

// ========== Version Compare Types ==========

export interface VersionCompareResult {
  fromVersion: string;
  toVersion: string;
  commits: {
    onlyFrom: Array<{ hash: string; message: string; author: string; date: string }>;
    onlyTo: Array<{ hash: string; message: string; author: string; date: string }>;
    shared: Array<{ hash: string; message: string; author: string; date: string }>;
    totalFrom: number;
    totalTo: number;
  };
  files: {
    added: string[];
    removed: string[];
    modified: string[];
    totalFrom: number;
    totalTo: number;
  };
  changelogs: {
    from: VersionSummary | null;
    to: VersionSummary | null;
  };
  summary: {
    newerIsAhead: boolean;
    commitDelta: number;
    fileDelta: number;
    hasBreakingChanges: boolean;
    recommendation: string;
  };
}

export interface CompareQuickResult {
  hasDiff: boolean;
  summary: string;
}

// ========== Version Compare API ==========

export async function compareVersions(
  from: string,
  to: string,
  fromId?: string,
  toId?: string
): Promise<VersionCompareResult> {
  const params = new URLSearchParams({ from, to });
  if (fromId) params.set('fromId', fromId);
  if (toId) params.set('toId', toId);
  const res = await fetch(`/api/v1/versions/compare?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || '版本对比失败');
  return json.data;
}

export async function quickCompareVersions(
  from: string,
  to: string,
  fromId?: string,
  toId?: string
): Promise<CompareQuickResult> {
  const params = new URLSearchParams({ from, to });
  if (fromId) params.set('fromId', fromId);
  if (toId) params.set('toId', toId);
  const res = await fetch(`/api/v1/versions/compare/quick?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || '快速对比失败');
  return json.data;
}

// ========== Version Compare Hooks ==========

export function useCompareVersions(from: string, to: string, fromId?: string, toId?: string) {
  return useQuery({
    queryKey: ['versionCompare', from, to, fromId, toId],
    queryFn: () => compareVersions(from, to, fromId, toId),
    enabled: Boolean(from && to),
    staleTime: 5 * 60 * 1000,
  });
}
