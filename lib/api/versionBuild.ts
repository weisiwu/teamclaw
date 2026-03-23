import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE, delay, autoBumpVersion as sharedAutoBumpVersion } from "./versionShared";
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

// ========== Mock 数据（Build 域）==========
// 注意：mockVersions 的完整定义在 versions.ts，此处引用类型
// 为避免循环依赖，Build 域函数使用传入的 mockVersions 参数

const mockDownloadHistory: Array<{
  id: string;
  versionId: string;
  version: string;
  format: string;
  url: string;
  downloadedAt: string;
}> = [
  { id: 'dl-1', versionId: 'v1', version: 'v1.0.0', format: 'zip', url: 'https://example.com/v1.0.0.zip', downloadedAt: '2026-03-15 10:30:00' },
  { id: 'dl-2', versionId: 'v2', version: 'v1.1.0', format: 'tar.gz', url: 'https://example.com/v1.1.0.tar.gz', downloadedAt: '2026-03-10 14:20:00' },
];

const mockBranches: GitBranch[] = [
  {
    id: "branch-main",
    name: "main",
    isMain: true,
    isRemote: false,
    isProtected: true,
    createdAt: "2026-01-01T08:00:00Z",
    lastCommitAt: "2026-03-15T14:30:00Z",
    commitMessage: "feat: add version management",
    author: "system",
    versionId: "v1",
  },
  {
    id: "branch-develop",
    name: "develop",
    isMain: false,
    isRemote: false,
    isProtected: true,
    createdAt: "2026-01-05T10:00:00Z",
    lastCommitAt: "2026-03-14T16:20:00Z",
    commitMessage: "feat: add new features",
    author: "developer",
    versionId: "v2",
  },
  {
    id: "branch-feature-v2",
    name: "feature/v2.0.0",
    isMain: false,
    isRemote: false,
    isProtected: false,
    createdAt: "2026-02-20T09:00:00Z",
    lastCommitAt: "2026-03-10T11:15:00Z",
    commitMessage: "feat: version 2.0.0 development",
    author: "developer",
    versionId: "v5",
  },
  {
    id: "branch-hotfix",
    name: "hotfix/bug-fix",
    isMain: false,
    isRemote: false,
    isProtected: false,
    createdAt: "2026-03-01T14:00:00Z",
    lastCommitAt: "2026-03-05T10:30:00Z",
    commitMessage: "fix: resolve critical bug",
    author: "developer",
  },
  {
    id: "branch-release-v1.3",
    name: "release/v1.3.0",
    isMain: false,
    isRemote: false,
    isProtected: false,
    createdAt: "2026-02-25T08:00:00Z",
    lastCommitAt: "2026-03-01T09:45:00Z",
    commitMessage: "chore: prepare release v1.3.0",
    author: "system",
    versionId: "v4",
  },
];

const mockReleaseLogs: ReleaseLog[] = [
  {
    id: "rel-1",
    versionId: "v3",
    version: "v1.2.0",
    previousVersion: "v1.1.0",
    bumpType: "minor",
    releasedAt: "2026-03-18T10:00:00Z",
    releasedBy: "system",
  },
  {
    id: "rel-2",
    versionId: "v2",
    version: "v1.1.0",
    previousVersion: "v1.0.0",
    bumpType: "patch",
    releasedAt: "2026-03-15T14:30:00Z",
    releasedBy: "system",
  },
];

// ========== 构建相关 API ==========

export async function triggerBuild(
  versionId: string,
  mockVersions: Version[]
): Promise<{ success: boolean; buildId: string }> {
  await delay(500);

  const index = mockVersions.findIndex((v) => v.id === versionId);
  if (index === -1) return { success: false, buildId: '' };

  mockVersions[index].buildStatus = "building";
  return { success: true, buildId: `build-${Date.now()}` };
}

export async function rebuildVersion(
  versionId: string,
  mockVersions: Version[]
): Promise<{ success: boolean; buildId: string }> {
  await delay(500);
  return triggerBuild(versionId, mockVersions);
}

export async function downloadArtifact(
  versionId: string,
  format: string = 'zip',
  mockVersions: Version[]
): Promise<{ success: boolean; url: string }> {
  await delay(50);

  const version = mockVersions.find((v) => v.id === versionId);
  if (!version || !version.artifactUrl) {
    return { success: false, url: '' };
  }

  const baseUrl = version.artifactUrl;
  const formatUrls: Record<string, string> = {
    'zip': baseUrl.replace('.zip', `-${format}.zip`) || `${baseUrl}.zip`,
    'tar.gz': baseUrl.replace('.zip', `-${format}.tar.gz`) || `${baseUrl}.tar.gz`,
    'apk': baseUrl.replace('.zip', `-android.apk`) || `${baseUrl}-android.apk`,
    'ipa': baseUrl.replace('.zip', `-ios.ipa`) || `${baseUrl}-ios.ipa`,
    'exe': baseUrl.replace('.zip', `-windows.exe`) || `${baseUrl}-windows.exe`,
    'dmg': baseUrl.replace('.zip', `-macos.dmg`) || `${baseUrl}-macos.dmg`,
  };

  return { success: true, url: formatUrls[format] || baseUrl };
}

export async function getDownloadHistory(): Promise<typeof mockDownloadHistory> {
  await delay(100);
  return [...mockDownloadHistory];
}

export async function addDownloadRecord(record: {
  versionId: string;
  version: string;
  format: string;
  url: string;
}): Promise<{ id: string }> {
  await delay(50);
  const newRecord = {
    id: `dl-${Date.now()}`,
    ...record,
    downloadedAt: new Date().toLocaleString('zh-CN'),
  };
  mockDownloadHistory.unshift(newRecord);
  return { id: newRecord.id };
}

// ========== 快照管理 API ==========

export async function getVersionSnapshots(
  versionId: string,
  mockSnapshots: VersionSnapshot[]
): Promise<SnapshotListResponse> {
  await delay(50);

  const snapshots = mockSnapshots.filter(s => s.versionId === versionId);
  return {
    data: snapshots,
    total: snapshots.length,
  };
}

export async function createSnapshot(
  versionId: string,
  request: CreateSnapshotRequest,
  mockVersions: Version[],
  mockSnapshots: VersionSnapshot[]
): Promise<VersionSnapshot> {
  await delay(50);

  const version = mockVersions.find((v) => v.id === versionId);
  if (!version) {
    throw new Error("Version not found");
  }

  const newSnapshot: VersionSnapshot = {
    id: `snap-${versionId}-${Date.now()}`,
    versionId,
    version: version.version,
    name: request.name,
    description: request.description || '',
    tags: [...version.tags],
    status: version.status,
    buildStatus: version.buildStatus,
    artifactUrl: version.artifactUrl,
    gitBranch: "main",
    createdAt: new Date().toISOString(),
  };

  mockSnapshots.unshift(newSnapshot);
  return newSnapshot;
}

export async function restoreSnapshot(
  snapshotId: string,
  mockSnapshots: VersionSnapshot[],
  mockVersions: Version[]
): Promise<Version> {
  await delay(500);

  const snapshot = mockSnapshots.find(s => s.id === snapshotId);
  if (!snapshot) {
    throw new Error("Snapshot not found");
  }

  const version = mockVersions.find(v => v.id === snapshot.versionId);
  if (!version) {
    throw new Error("Version not found");
  }

  version.title = snapshot.name;
  version.description = snapshot.description;
  version.tags = [...snapshot.tags];
  version.status = snapshot.status;
  version.buildStatus = snapshot.buildStatus;
  version.artifactUrl = snapshot.artifactUrl;

  return version;
}

// ========== 分支管理 API ==========

export async function getBranches(): Promise<BranchListResponse> {
  await delay(50);
  return {
    data: [...mockBranches],
    total: mockBranches.length,
  };
}

export async function createBranch(request: CreateBranchRequest): Promise<GitBranch> {
  await delay(500);

  const newBranch: GitBranch = {
    id: `branch-${Date.now()}`,
    name: request.name,
    isMain: false,
    isRemote: false,
    isProtected: false,
    createdAt: new Date().toISOString(),
    lastCommitAt: new Date().toISOString(),
    commitMessage: `feat: create branch ${request.name}`,
    author: "current-user",
    versionId: request.versionId,
  };

  mockBranches.unshift(newBranch);
  return newBranch;
}

export async function deleteBranch(branchId: string): Promise<boolean> {
  await delay(50);

  const index = mockBranches.findIndex(b => b.id === branchId);
  if (index === -1) return false;

  if (mockBranches[index].isMain) {
    throw new Error("Cannot delete main branch");
  }

  mockBranches.splice(index, 1);
  return true;
}

export async function setMainBranch(branchId: string): Promise<GitBranch | null> {
  await delay(50);

  mockBranches.forEach(b => { b.isMain = false; });

  const index = mockBranches.findIndex(b => b.id === branchId);
  if (index === -1) return null;

  mockBranches[index].isMain = true;
  return mockBranches[index];
}

export async function renameBranch(request: RenameBranchRequest): Promise<GitBranch | null> {
  await delay(50);

  const index = mockBranches.findIndex(b => b.id === request.branchId);
  if (index === -1) return null;

  if (mockBranches[index].isProtected) {
    throw new Error("Protected branches cannot be renamed");
  }

  mockBranches[index].name = request.newName;
  mockBranches[index].commitMessage = `chore: rename branch to ${request.newName}`;
  return mockBranches[index];
}

export async function toggleBranchProtection(request: BranchProtectionRequest): Promise<GitBranch | null> {
  await delay(50);

  const index = mockBranches.findIndex(b => b.id === request.branchId);
  if (index === -1) return null;

  if (mockBranches[index].isMain && !request.protected) {
    throw new Error("Main branch must always be protected");
  }

  mockBranches[index].isProtected = request.protected;
  return mockBranches[index];
}

// ========== Version Bump API ==========

export async function bumpVersion(
  versionId: string,
  bumpType: VersionBumpType,
  mockVersions: Version[]
): Promise<BumpVersionResponse> {
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/bump`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bumpType }),
    });
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
  } catch {
    // Fall through to mock
  }

  await delay(50);

  const index = mockVersions.findIndex(v => v.id === versionId);
  if (index === -1) {
    return { success: false, error: 'Version not found' };
  }

  const currentVersion = mockVersions[index];
  const previousVersion = currentVersion.version;
  const newVersion = sharedAutoBumpVersion(previousVersion, bumpType);

  const newVersionEntry: Version = {
    ...currentVersion,
    id: `v${Date.now()}`,
    version: newVersion,
    status: 'draft',
    releasedAt: null,
    gitTag: undefined,
    gitTagCreatedAt: undefined,
    buildStatus: 'pending',
    changedFiles: [],
    commitCount: 0,
  };

  mockVersions.unshift(newVersionEntry);

  const releaseLog: ReleaseLog = {
    id: `rel-${Date.now()}`,
    versionId: newVersionEntry.id,
    version: newVersion,
    previousVersion: previousVersion,
    bumpType: bumpType,
    releasedAt: new Date().toISOString(),
    releasedBy: 'user',
  };
  mockReleaseLogs.unshift(releaseLog);

  return {
    success: true,
    version: newVersionEntry,
    previousVersion,
    newVersion,
  };
}

export async function getReleaseLogs(versionId?: string): Promise<ReleaseLog[]> {
  await delay(50);

  if (versionId) {
    return mockReleaseLogs.filter(r => r.versionId === versionId);
  }

  return [...mockReleaseLogs];
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
  mockVersions: Version[],
  onRetry?: (attempt: number, maxRetries: number) => void
): Promise<{ success: boolean; buildId: string; attempts: number }> {
  const settings = getBuildEnhancementSettings();
  const { maxRetries, retryDelays } = settings.retry;

  let attempts = 0;

  for (let i = 0; i <= maxRetries; i++) {
    attempts = i + 1;

    try {
      const result = await triggerBuild(versionId, mockVersions);
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

export async function batchDownloadArtifacts(
  request: BatchDownloadRequest,
  mockVersions: Version[]
): Promise<BatchDownloadResponse> {
  await delay(50);

  const results = await Promise.all(
    request.versionIds.map(async (versionId) => {
      const version = mockVersions.find((v) => v.id === versionId);
      if (!version || !version.artifactUrl) {
        return {
          versionId,
          version: version?.version || 'unknown',
          url: '',
          success: false,
          error: 'Version or artifact not found',
        };
      }

      const baseUrl = version.artifactUrl;
      const formatUrls: Record<string, string> = {
        'zip': baseUrl,
        'tar.gz': baseUrl.replace('.zip', '.tar.gz'),
        'apk': baseUrl.replace('.zip', '-android.apk'),
        'ipa': baseUrl.replace('.zip', '-ios.ipa'),
        'exe': baseUrl.replace('.zip', '-windows.exe'),
        'dmg': baseUrl.replace('.zip', '-macos.dmg'),
      };

      return {
        versionId,
        version: version.version,
        url: formatUrls[request.format] || baseUrl,
        success: true,
      };
    })
  );

  return { success: true, results };
}

export async function getDownloadStats(): Promise<DownloadStats> {
  await delay(150);

  const allDownloads = [...mockDownloadHistory];

  const versionCounts: Record<string, number> = {};
  allDownloads.forEach((d) => {
    versionCounts[d.version] = (versionCounts[d.version] || 0) + 1;
  });
  const downloadsByVersion = Object.entries(versionCounts).map(([version, count]) => ({
    version,
    count,
  }));

  const formatCounts: Record<string, number> = {};
  allDownloads.forEach((d) => {
    formatCounts[d.format] = (formatCounts[d.format] || 0) + 1;
  });
  const downloadsByFormat = Object.entries(formatCounts).map(([format, count]) => ({
    format,
    count,
  }));

  const recentTrend = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    recentTrend.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 10) + 1,
    });
  }

  return {
    totalDownloads: allDownloads.length,
    downloadsByVersion,
    downloadsByFormat,
    recentTrend,
  };
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
  return json.data?.artifacts || [];
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
  return json.data as BuildArtifact;
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

// ========== React Query Hooks (Real Implementations) ==========

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
