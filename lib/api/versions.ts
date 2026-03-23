import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE, delay, autoBumpVersion } from "./versionShared";
import {
  getVersionSettings,
} from "./versionSettings";

// Re-export types for convenience
export type { BatchDownloadRequest, BatchDownloadResponse, DownloadUrlVerification, DownloadStats, RollbackHistoryRecord } from './types';
import {
  Version,
  VersionListResponse,
  CreateVersionRequest,
  UpdateVersionRequest,
  VersionTag,
  VersionSnapshot,
  CreateSnapshotRequest,
  GitBranch,
  CreateBranchRequest,
  VersionBumpType,
  BumpVersionResponse,
  ReleaseLog,
  VersionMessageScreenshot,
  VersionChangelog,
  TagPrefix,
  CreateTagRequest,
  CreateTagResponse,
  VersionStatus,
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

// ========== Mock 数据（版本域核心）==========

export const mockVersions: Version[] = [
  {
    id: "v1",
    version: "v1.0.0",
    title: "初始版本",
    description: "团队协作平台初始版本，包含核心功能",
    status: "published",
    releasedAt: "2026-01-15T10:00:00Z",
    createdAt: "2026-01-10T08:00:00Z",
    changedFiles: ["app/layout.tsx", "app/page.tsx", "lib/api/tasks.ts"],
    commitCount: 12,
    isMain: true,
    buildStatus: "success",
    artifactUrl: "https://example.com/artifacts/v1.0.0.zip",
    tags: ["stable", "latest"],
    gitTag: "v1.0.0",
    gitTagCreatedAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "v2",
    version: "v1.1.0",
    title: "任务管理增强",
    description: "新增任务筛选、排序、详情页等功能",
    status: "published",
    releasedAt: "2026-02-01T14:30:00Z",
    createdAt: "2026-01-25T09:00:00Z",
    changedFiles: ["app/tasks/page.tsx", "lib/api/tasks.ts", "components/TaskCard.tsx"],
    commitCount: 8,
    isMain: false,
    buildStatus: "success",
    artifactUrl: "https://example.com/artifacts/v1.1.0.zip",
    tags: ["stable"],
    gitTag: "v1.1.0",
    gitTagCreatedAt: "2026-02-01T14:30:00Z",
  },
  {
    id: "v3",
    version: "v1.2.0",
    title: "定时任务支持",
    description: "新增 Cron 定时任务管理功能",
    status: "published",
    releasedAt: "2026-02-20T16:00:00Z",
    createdAt: "2026-02-10T11:00:00Z",
    changedFiles: ["app/cron/page.tsx", "lib/api/cron.ts", "components/CronModal.tsx"],
    commitCount: 6,
    isMain: false,
    buildStatus: "success",
    artifactUrl: "https://example.com/artifacts/v1.2.0.zip",
    tags: ["beta"],
    gitTag: "v1.2.0",
    gitTagCreatedAt: "2026-02-20T16:00:00Z",
  },
  {
    id: "v4",
    version: "v1.3.0",
    title: "Token 统计",
    description: "新增 Token 消耗统计和趋势分析",
    status: "published",
    releasedAt: "2026-03-01T10:00:00Z",
    createdAt: "2026-02-25T08:00:00Z",
    changedFiles: ["app/tokens/page.tsx", "lib/api/tokens.ts"],
    commitCount: 5,
    isMain: false,
    buildStatus: "success",
    artifactUrl: "https://example.com/artifacts/v1.3.0.zip",
    tags: ["latest"],
    gitTag: "v1.3.0",
    gitTagCreatedAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "v5",
    version: "v2.0.0-beta",
    title: "成员管理 & 权限",
    description: "新增成员管理、角色权限系统（测试版）",
    status: "draft",
    releasedAt: null,
    createdAt: "2026-03-15T09:00:00Z",
    changedFiles: ["app/members/page.tsx", "lib/api/members.ts"],
    commitCount: 3,
    isMain: false,
    buildStatus: "pending",
    artifactUrl: null,
    tags: ["beta", "draft"],
  },
];

export const mockSnapshots: VersionSnapshot[] = [
  {
    id: "snap-v1-1",
    versionId: "v1",
    version: "v1.0.0",
    name: "初始快照 v1.0.0",
    description: "发布前快照",
    tags: ["stable"],
    status: "published",
    buildStatus: "success",
    artifactUrl: "https://example.com/artifacts/v1.0.0.zip",
    gitBranch: "main",
    createdAt: "2026-01-14T18:00:00Z",
  },
  {
    id: "snap-v1-2",
    versionId: "v1",
    version: "v1.0.0",
    name: "修复快照 v1.0.1",
    description: "修复 bug 后快照",
    tags: ["stable"],
    status: "published",
    buildStatus: "success",
    artifactUrl: "https://example.com/artifacts/v1.0.1.zip",
    gitBranch: "main",
    createdAt: "2026-01-20T10:00:00Z",
  },
  {
    id: "snap-v2-1",
    versionId: "v2",
    version: "v1.1.0",
    name: "功能完成快照",
    description: "任务管理功能完成后快照",
    tags: ["stable"],
    status: "published",
    buildStatus: "success",
    artifactUrl: "https://example.com/artifacts/v1.1.0.zip",
    gitBranch: "main",
    createdAt: "2026-01-30T16:00:00Z",
  },
];

export const mockBranches: GitBranch[] = [
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

export const mockReleaseLogs: ReleaseLog[] = [
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

export const mockVersionScreenshots: VersionMessageScreenshot[] = [
  {
    id: "ss-1",
    versionId: "v1",
    messageId: "msg-001",
    messageContent: "完成了任务管理模块的开发，新增筛选、排序功能",
    senderName: "张三",
    senderAvatar: undefined,
    screenshotUrl: "https://example.com/screenshots/ss-1.png",
    thumbnailUrl: "https://example.com/screenshots/ss-1-thumb.png",
    createdAt: "2026-01-12T10:00:00Z",
  },
  {
    id: "ss-2",
    versionId: "v1",
    messageId: "msg-002",
    messageContent: "修复了登录页面的样式问题",
    senderName: "李四",
    senderAvatar: undefined,
    screenshotUrl: "https://example.com/screenshots/ss-2.png",
    thumbnailUrl: "https://example.com/screenshots/ss-2-thumb.png",
    createdAt: "2026-01-13T14:30:00Z",
  },
  {
    id: "ss-3",
    versionId: "v2",
    messageId: "msg-003",
    messageContent: "新增 Cron 定时任务管理界面",
    senderName: "王五",
    senderAvatar: undefined,
    screenshotUrl: "https://example.com/screenshots/ss-3.png",
    thumbnailUrl: "https://example.com/screenshots/ss-3-thumb.png",
    createdAt: "2026-02-15T09:00:00Z",
  },
];

export const mockChangelogs: VersionChangelog[] = [
  {
    id: "cl-1",
    versionId: "v1",
    title: "v1.0.0 变更日志",
    content: "初始版本发布，包含核心功能",
    changes: [
      { type: "feature", description: "任务管理基础功能", files: ["app/tasks/page.tsx", "lib/api/tasks.ts"] },
      { type: "feature", description: "用户认证系统", files: ["app/auth/page.tsx", "lib/auth.ts"] },
      { type: "improvement", description: "优化页面加载性能", files: [] },
    ],
    generatedAt: "2026-01-15T10:00:00Z",
    generatedBy: "system",
  },
  {
    id: "cl-2",
    versionId: "v2",
    title: "v1.1.0 变更日志",
    content: "任务管理增强版本",
    changes: [
      { type: "feature", description: "新增任务筛选功能", files: ["components/TaskFilter.tsx"] },
      { type: "feature", description: "新增任务排序功能", files: ["components/TaskSort.tsx"] },
      { type: "fix", description: "修复任务详情页加载慢的问题", files: ["app/tasks/[id]/page.tsx"] },
    ],
    generatedAt: "2026-02-01T14:30:00Z",
    generatedBy: "system",
  },
];

// ========== 自动 Tag/Bump 辅助函数 ==========

async function autoCreateGitTag(
  version: Version,
  options?: { prefix?: string; message?: string }
): Promise<{ success: boolean; tagName: string; message?: string }> {
  await delay(50);

  const settings = getVersionSettings();
  let tagPrefix = settings.tagPrefix;
  if (tagPrefix === 'custom' && settings.customPrefix) {
    tagPrefix = settings.customPrefix as TagPrefix;
  }

  const versionNum = version.version.startsWith('v') ? version.version : `v${version.version}`;
  const tagName = tagPrefix === 'v' ? versionNum : `${tagPrefix}/${version.version}`;

  const tagMessage = options?.message || `Release ${version.version} - ${version.title || 'Version release'}`;

  console.log(`[Auto Tag] Created git tag: ${tagName} for version ${version.version}`);
  console.log(`[Auto Tag] Tag message: ${tagMessage}`);

  return { success: true, tagName, message: tagMessage };
}

// ========== 版本 CRUD API ==========

export async function getVersions(
  page: number = 1,
  pageSize: number = 10,
  status: string = "all"
): Promise<VersionListResponse> {
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status !== 'all') params.set('status', status);
    const res = await fetch(`${API_BASE}/versions?${params}`);
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
  } catch {
    // Fall through to mock
  }

  await delay(50);

  let filtered = [...mockVersions];
  if (status !== "all") {
    filtered = filtered.filter((v) => v.status === status);
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getVersion(id: string): Promise<Version | null> {
  try {
    const res = await fetch(`${API_BASE}/versions/${id}`);
    const json = await res.json();
    if ((json.code === 200 || json.code === 0) && json.data) {
      return json.data;
    }
  } catch {
    // Fall through to mock
  }
  await delay(50);
  return mockVersions.find((v) => v.id === id) || null;
}

export async function createVersion(request: CreateVersionRequest): Promise<Version> {
  try {
    const res = await fetch(`${API_BASE}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
  } catch {
    // Fall through to mock
  }

  await delay(50);

  const newVersion: Version = {
    id: `v${Date.now()}`,
    version: request.version,
    title: request.title || '',
    description: request.description || '',
    status: request.status || 'draft',
    releasedAt: null,
    createdAt: new Date().toISOString(),
    changedFiles: [],
    commitCount: 0,
    isMain: false,
    buildStatus: 'pending',
    artifactUrl: null,
    tags: request.tags || [],
    gitTag: undefined,
    gitTagCreatedAt: undefined,
  };

  // Auto tag
  if (getVersionSettings().autoTag && getVersionSettings().tagOnStatus.includes(request.status as VersionStatus)) {
    const tagResult = await autoCreateGitTag(newVersion);
    console.log('[Auto Tag] Result:', tagResult);
  }

  mockVersions.unshift(newVersion);
  return newVersion;
}

export async function updateVersion(
  id: string,
  request: UpdateVersionRequest
): Promise<Version | null> {
  try {
    const res = await fetch(`${API_BASE}/versions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
  } catch {
    // Fall through to mock
  }

  await delay(50);

  const index = mockVersions.findIndex((v) => v.id === id);
  if (index === -1) return null;

  const previousVersion = mockVersions[index];
  const updated = { ...previousVersion, ...request };
  mockVersions[index] = updated;

  const settings = getVersionSettings();
  const isStatusChangingToPublished =
    settings.autoTag &&
    settings.tagOnStatus.includes(request.status as VersionStatus) &&
    previousVersion.status !== 'published' &&
    request.status === 'published';

  if (isStatusChangingToPublished) {
    const tagResult = await autoCreateGitTag(updated);
    console.log('[Auto Tag] Result:', tagResult);
  }

  // Auto bump
  if (isStatusChangingToPublished && settings.autoBump) {
    const newVersion = autoBumpVersion(previousVersion.version, settings.bumpType);
    const newVersionEntry: Version = {
      ...updated,
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
      previousVersion: previousVersion.version,
      bumpType: settings.bumpType,
      releasedAt: new Date().toISOString(),
      releasedBy: 'system',
    };
    mockReleaseLogs.unshift(releaseLog);

    console.log(`[Auto Bump] Version bumped from ${previousVersion.version} to ${newVersion} (${settings.bumpType})`);
  }

  mockVersions[index] = updated;
  return updated;
}

export async function deleteVersion(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/versions/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return true;
    }
  } catch {
    // Fall through to mock
  }

  await delay(50);

  const index = mockVersions.findIndex((v) => v.id === id);
  if (index === -1) return false;
  mockVersions.splice(index, 1);
  return true;
}

// ========== Tag 管理 API ==========

export async function addVersionTag(versionId: string, tag: VersionTag): Promise<Version | null> {
  await delay(50);
  const version = mockVersions.find((v) => v.id === versionId);
  if (!version) return null;
  if (!version.tags.includes(tag)) {
    version.tags.push(tag);
  }
  return version;
}

export async function removeVersionTag(versionId: string, tag: VersionTag): Promise<Version | null> {
  await delay(50);
  const version = mockVersions.find((v) => v.id === versionId);
  if (!version) return null;
  version.tags = version.tags.filter((t) => t !== tag);
  return version;
}

export async function setMainVersion(versionId: string): Promise<Version | null> {
  await delay(50);
  mockVersions.forEach(v => { v.isMain = false; });
  const index = mockVersions.findIndex((v) => v.id === versionId);
  if (index === -1) return null;
  mockVersions[index].isMain = true;
  return mockVersions[index];
}

// ========== 手动创建 Git Tag ==========

export async function createGitTag(versionId: string, request?: CreateTagRequest): Promise<CreateTagResponse> {
  await delay(50);

  const version = mockVersions.find((v) => v.id === versionId);
  if (!version) {
    return { success: false, error: 'Version not found' };
  }

  if (version.gitTag && !request?.force) {
    return { success: false, error: 'Tag already exists. Use force=true to overwrite.' };
  }

  const tagName = request?.tagName || (version.version.startsWith('v') ? version.version : `v${version.version}`);
  const tagMessage = request?.message || `Release ${version.version} - ${version.title || 'Version release'}`;

  version.gitTag = tagName;
  version.gitTagCreatedAt = new Date().toISOString();

  console.log(`[Manual Tag] Created git tag: ${tagName} for version ${version.version}`);
  console.log(`[Manual Tag] Tag message: ${tagMessage}`);

  return {
    success: true,
    tagName,
    message: tagMessage,
    createdAt: version.gitTagCreatedAt
  };
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
      createBranch({ name: branchName, versionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useSetMainVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => setMainVersion(versionId),
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

// ========== Build Hooks（使用本地 mockVersions）==========

export function useTriggerBuild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => triggerBuild(versionId, mockVersions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useRebuildVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => rebuildVersion(versionId, mockVersions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useDownloadArtifact() {
  return useMutation({
    mutationFn: ({ versionId, format = 'zip' }: { versionId: string; format?: string }) =>
      downloadArtifact(versionId, format, mockVersions),
  });
}

// ========== Snapshot Hooks ==========

export function useVersionSnapshots(versionId: string) {
  return useQuery({
    queryKey: ["versionSnapshots", versionId],
    queryFn: () => getVersionSnapshots(versionId, mockSnapshots),
    enabled: !!versionId,
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, request }: { versionId: string; request: CreateSnapshotRequest }) =>
      createSnapshot(versionId, request, mockVersions, mockSnapshots),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versionSnapshots"] });
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useRestoreSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snapshotId: string) => restoreSnapshot(snapshotId, mockSnapshots, mockVersions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

// ========== Bump Hook ==========

export async function bumpVersion(versionId: string, bumpType: VersionBumpType): Promise<BumpVersionResponse> {
  return bumpVersionInternal(versionId, bumpType, mockVersions);
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
  await delay(50);

  const version = mockVersions.find((v) => v.id === versionId);
  if (!version) {
    return {
      versionId,
      version: '',
      url,
      isValid: false,
      error: 'Version not found',
    };
  }

  const isValid = !!version.artifactUrl && url.includes(version.version);

  return {
    versionId,
    version: version.version,
    url,
    isValid,
    fileSize: isValid ? Math.floor(Math.random() * 100) + 10 : undefined,
    lastModified: isValid ? new Date().toISOString() : undefined,
    error: isValid ? undefined : 'Invalid URL',
  };
}

// ========== 内部函数（从 versionBuild 引入）==========

async function triggerBuild(
  versionId: string,
  versions: Version[]
): Promise<{ success: boolean; buildId: string }> {
  await delay(500);

  const index = versions.findIndex((v) => v.id === versionId);
  if (index === -1) return { success: false, buildId: '' };

  versions[index].buildStatus = "building";
  return { success: true, buildId: `build-${Date.now()}` };
}

async function rebuildVersion(
  versionId: string,
  versions: Version[]
): Promise<{ success: boolean; buildId: string }> {
  await delay(500);
  return triggerBuild(versionId, versions);
}

async function downloadArtifact(
  versionId: string,
  format: string = 'zip',
  versions: Version[]
): Promise<{ success: boolean; url: string }> {
  await delay(50);

  const version = versions.find((v) => v.id === versionId);
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

async function getVersionSnapshots(
  versionId: string,
  snapshots: VersionSnapshot[]
): Promise<SnapshotListResponse> {
  await delay(50);

  const filtered = snapshots.filter(s => s.versionId === versionId);
  return {
    data: filtered,
    total: filtered.length,
  };
}

async function createSnapshot(
  versionId: string,
  request: CreateSnapshotRequest,
  versions: Version[],
  snapshots: VersionSnapshot[]
): Promise<VersionSnapshot> {
  await delay(50);

  const version = versions.find((v) => v.id === versionId);
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

  snapshots.unshift(newSnapshot);
  return newSnapshot;
}

async function restoreSnapshot(
  snapshotId: string,
  snapshots: VersionSnapshot[],
  versions: Version[]
): Promise<Version> {
  await delay(500);

  const snapshot = snapshots.find(s => s.id === snapshotId);
  if (!snapshot) {
    throw new Error("Snapshot not found");
  }

  const version = versions.find(v => v.id === snapshot.versionId);
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

async function createBranch(request: CreateBranchRequest): Promise<GitBranch> {
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

async function bumpVersionInternal(
  versionId: string,
  bumpType: VersionBumpType,
  versions: Version[]
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

  const index = versions.findIndex(v => v.id === versionId);
  if (index === -1) {
    return { success: false, error: 'Version not found' };
  }

  const currentVersion = versions[index];
  const previousVersion = currentVersion.version;
  const newVersion = autoBumpVersion(previousVersion, bumpType);

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

  versions.unshift(newVersionEntry);

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
