/**
 * Builds API Client — Frontend API calls for build history and rebuild
 */

import { useMutation, useQuery } from "@tanstack/react-query";

const API_BASE = '/api/v1';

export interface BuildRecord {
  id: string;
  versionId: string;
  versionName: string;
  versionNumber: string;
  buildCommand?: string;
  projectPath?: string;
  projectType?: 'nextjs' | 'node' | 'react' | 'unknown';
  status: 'pending' | 'building' | 'success' | 'failed' | 'cancelled';
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  exitCode?: number;
  command?: string;
  output?: string;
  errorOutput?: string;
  artifactCount?: number;
  artifactPaths?: string[];
  artifactUrl?: string;
  triggeredBy: string;
  triggerType: 'manual' | 'auto' | 'rebuild';
  buildNumber: number;
  parentBuildId?: string;
}

export interface BuildStats {
  total: number;
  success: number;
  failed: number;
  building: number;
  averageDuration?: number;
}

export interface TriggerBuildRequest {
  versionId: string;
  versionName: string;
  versionNumber: string;
  buildCommand?: string;
  projectPath?: string;
  triggeredBy?: string;
  triggerType?: 'manual' | 'auto' | 'rebuild';
}

// List builds for a version
export async function listBuildsAPI(versionId: string, limit = 20, offset = 0): Promise<{
  builds: BuildRecord[];
  total: number;
  limit: number;
  offset: number;
}> {
  const res = await fetch(`${API_BASE}/builds?versionId=${versionId}&limit=${limit}&offset=${offset}`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || 'Failed to list builds');
}

// Get latest build for a version
export async function getLatestBuildAPI(versionId: string): Promise<BuildRecord> {
  const res = await fetch(`${API_BASE}/builds/latest/${versionId}`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || 'Failed to get latest build');
}

// Get build details
export async function getBuildAPI(buildId: string): Promise<BuildRecord> {
  const res = await fetch(`${API_BASE}/builds/${buildId}`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || 'Failed to get build');
}

// Get build output
export async function getBuildOutputAPI(buildId: string): Promise<{
  output: string;
  errorOutput: string;
  exitCode?: number;
  duration?: number;
}> {
  const res = await fetch(`${API_BASE}/builds/${buildId}/output`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || 'Failed to get build output');
}

// Get build stats
export async function getBuildStatsAPI(versionId: string): Promise<BuildStats> {
  const res = await fetch(`${API_BASE}/builds/stats/${versionId}`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || 'Failed to get build stats');
}

// Trigger a new build
export async function triggerBuildAPI(data: TriggerBuildRequest): Promise<{
  buildId: string;
  status: string;
}> {
  const res = await fetch(`${API_BASE}/builds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || 'Failed to trigger build');
}

// Cancel a build
export async function cancelBuildAPI(buildId: string): Promise<BuildRecord> {
  const res = await fetch(`${API_BASE}/builds/${buildId}/cancel`, { method: 'POST' });
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || 'Failed to cancel build');
}

// Rebuild from a previous build
export async function rebuildBuildAPI(buildId: string, triggeredBy = 'user'): Promise<{
  buildId: string;
  status: string;
}> {
  const res = await fetch(`${API_BASE}/builds/${buildId}/rebuild`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ triggeredBy }),
  });
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || 'Failed to rebuild');
}

// ========== React Query Hooks ==========

export function useBuilds(versionId: string, limit = 20) {
  return useQuery({
    queryKey: ['builds', versionId, limit],
    queryFn: () => listBuildsAPI(versionId, limit),
    enabled: !!versionId,
    refetchInterval: (query) => {
      // Auto-refresh if any build is in progress
      const data = query.state.data?.builds;
      if (!data) return false;
      const hasBuilding = data.some((b: BuildRecord) => b.status === 'building' || b.status === 'pending');
      return hasBuilding ? 5000 : false;
    },
  });
}

export function useLatestBuild(versionId: string) {
  return useQuery({
    queryKey: ['builds', versionId, 'latest'],
    queryFn: () => getLatestBuildAPI(versionId),
    enabled: !!versionId,
    refetchInterval: (query) => {
      const build = query.state.data;
      if (!build) return false;
      return build.status === 'building' || build.status === 'pending' ? 3000 : false;
    },
  });
}

export function useBuild(buildId: string) {
  return useQuery({
    queryKey: ['builds', 'detail', buildId],
    queryFn: () => getBuildAPI(buildId),
    enabled: !!buildId,
    refetchInterval: (query) => {
      const build = query.state.data;
      if (!build) return false;
      return build.status === 'building' || build.status === 'pending' ? 3000 : false;
    },
  });
}

export function useBuildStats(versionId: string) {
  return useQuery({
    queryKey: ['builds', versionId, 'stats'],
    queryFn: () => getBuildStatsAPI(versionId),
    enabled: !!versionId,
  });
}

export function useTriggerBuild() {
  return useMutation({
    mutationFn: (data: TriggerBuildRequest) => triggerBuildAPI(data),
  });
}

export function useCancelBuild() {
  return useMutation({
    mutationFn: (buildId: string) => cancelBuildAPI(buildId),
  });
}

export function useRebuildBuild() {
  return useMutation({
    mutationFn: ({ buildId, triggeredBy }: { buildId: string; triggeredBy?: string }) =>
      rebuildBuildAPI(buildId, triggeredBy),
  });
}
