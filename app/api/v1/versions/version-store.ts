// ========== Types ==========
export interface Version {
  id: string;
  version: string;
  branch: string;
  summary?: string;
  commitHash?: string;
  createdBy?: string;
  createdAt: string;
  buildStatus: 'pending' | 'building' | 'success' | 'failed';
  hasTag: boolean;
}

// ========== In-memory store ==========
export const versionStore = new Map<string, Version>();

export function initVersionStore() {
  if (versionStore.size > 0) return;
  const now = new Date().toISOString();
  const sampleVersions: Version[] = [
    { id: "v1", version: "1.0.0", branch: "main", summary: "Initial release", commitHash: "abc1234", createdBy: "system", createdAt: now, buildStatus: "success", hasTag: true },
    { id: "v2", version: "1.1.0", branch: "main", summary: "Feature update", commitHash: "def5678", createdBy: "coder", createdAt: now, buildStatus: "success", hasTag: true },
    { id: "v3", version: "2.0.0", branch: "main", summary: "Major release", commitHash: "ghi9012", createdBy: "pm", createdAt: now, buildStatus: "building", hasTag: false },
  ];
  sampleVersions.forEach(v => versionStore.set(v.id, v));
}
initVersionStore();
