/**
 * Artifacts API Client — Frontend API calls for build artifact downloads
 */

import { useQuery } from "@tanstack/react-query";

const API_BASE = '/api/v1';

export interface ArtifactInfo {
  path: string;
  name: string;
  size: number;
  sizeFormatted: string;
  url: string;
  type: string;
  modifiedAt: string;
}

export interface ArtifactListResponse {
  versionId: string;
  buildId: string;
  buildNumber: number;
  buildStatus: string;
  projectPath?: string;
  artifacts: ArtifactInfo[];
  totalSize: number;
  totalSizeFormatted: string;
}

// Get artifacts for a version (from latest build)
export async function listArtifactsAPI(versionId: string): Promise<ArtifactListResponse> {
  const res = await fetch(`${API_BASE}/artifacts/${encodeURIComponent(versionId)}`);
  if (!res.ok) throw new Error('Failed to fetch artifacts');
  const data = await res.json();
  return data.data;
}

// Get artifacts for a specific build number
export async function listBuildArtifactsAPI(versionId: string, buildNumber: number): Promise<ArtifactListResponse> {
  const res = await fetch(`${API_BASE}/artifacts/${encodeURIComponent(versionId)}/${buildNumber}`);
  if (!res.ok) throw new Error('Failed to fetch artifacts');
  const data = await res.json();
  return data.data;
}

// Get download URL for a specific artifact
export function getArtifactDownloadUrl(versionId: string, buildNumber: number, artifactPath: string): string {
  return `${API_BASE}/artifacts/${encodeURIComponent(versionId)}/${buildNumber}?file=${encodeURIComponent(artifactPath)}`;
}

// React Query hooks
export function useArtifacts(versionId: string) {
  return useQuery({
    queryKey: ['artifacts', versionId],
    queryFn: () => listArtifactsAPI(versionId),
    enabled: !!versionId,
    staleTime: 30000,
  });
}

export function useBuildArtifacts(versionId: string, buildNumber: number) {
  return useQuery({
    queryKey: ['artifacts', versionId, buildNumber],
    queryFn: () => listBuildArtifactsAPI(versionId, buildNumber),
    enabled: !!versionId && !!buildNumber,
    staleTime: 30000,
  });
}
