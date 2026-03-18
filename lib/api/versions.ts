import { Version, VersionListResponse, CreateVersionRequest, UpdateVersionRequest, VersionTag, VersionSnapshot, SnapshotListResponse, CreateSnapshotRequest } from "./types";

// Mock 数据
const mockVersions: Version[] = [
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

// Mock 快照数据
const mockSnapshots: VersionSnapshot[] = [
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

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 自动创建 Git Tag（模拟）
async function autoCreateGitTag(version: Version): Promise<{ success: boolean; tagName: string }> {
  await delay(300);
  // 模拟自动创建 git tag
  const tagName = version.version.startsWith('v') ? version.version : `v${version.version}`;
  console.log(`[Auto Tag] Created git tag: ${tagName} for version ${version.version}`);
  return { success: true, tagName };
}

// 版本列表
export async function getVersions(
  page: number = 1,
  pageSize: number = 10,
  status: string = "all"
): Promise<VersionListResponse> {
  await delay(300);

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

// 获取单个版本
export async function getVersion(id: string): Promise<Version | null> {
  await delay(200);
  return mockVersions.find((v) => v.id === id) || null;
}

// 创建版本
export async function createVersion(request: CreateVersionRequest): Promise<Version> {
  await delay(300);

  const newVersion: Version = {
    id: `v${Date.now()}`,
    version: request.version,
    title: request.title,
    description: request.description,
    status: request.status,
    releasedAt: request.status === "published" ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
    changedFiles: [],
    commitCount: 0,
    isMain: false,
    buildStatus: "pending",
    artifactUrl: null,
    tags: request.tags || [],
  };

  // 如果是发布状态，自动创建 Git Tag
  if (request.status === "published") {
    const tagResult = await autoCreateGitTag(newVersion);
    if (tagResult.success) {
      newVersion.gitTag = tagResult.tagName;
      newVersion.gitTagCreatedAt = new Date().toISOString();
    }
  }

  mockVersions.unshift(newVersion);
  return newVersion;
}

// 更新版本
export async function updateVersion(
  id: string,
  request: UpdateVersionRequest
): Promise<Version | null> {
  await delay(300);

  const index = mockVersions.findIndex((v) => v.id === id);
  if (index === -1) return null;

  const currentVersion = mockVersions[index];
  const isStatusChangingToPublished = request.status === "published" && currentVersion.status !== "published";
  
  const updated = {
    ...currentVersion,
    ...request,
    releasedAt:
      request.status === "published" && !currentVersion.releasedAt
        ? new Date().toISOString()
        : currentVersion.releasedAt,
  };

  // 当状态变为已发布时，自动创建 Git Tag
  if (isStatusChangingToPublished && !currentVersion.gitTag) {
    const tagResult = await autoCreateGitTag(updated);
    if (tagResult.success) {
      updated.gitTag = tagResult.tagName;
      updated.gitTagCreatedAt = new Date().toISOString();
    }
  }

  mockVersions[index] = updated;
  return updated;
}

// 删除版本
export async function deleteVersion(id: string): Promise<boolean> {
  await delay(200);

  const index = mockVersions.findIndex((v) => v.id === id);
  if (index === -1) return false;

  mockVersions.splice(index, 1);
  return true;
}

// 为版本添加标签
export async function addVersionTag(versionId: string, tag: VersionTag): Promise<Version | null> {
  await delay(200);

  const version = mockVersions.find((v) => v.id === versionId);
  if (!version) return null;

  if (!version.tags.includes(tag)) {
    version.tags.push(tag);
  }
  return version;
}

// 移除版本标签
export async function removeVersionTag(versionId: string, tag: VersionTag): Promise<Version | null> {
  await delay(200);

  const version = mockVersions.find((v) => v.id === versionId);
  if (!version) return null;

  version.tags = version.tags.filter((t) => t !== tag);
  return version;
}

// 手动创建 Git Tag
export async function createGitTag(versionId: string): Promise<Version | null> {
  await delay(300);

  const version = mockVersions.find((v) => v.id === versionId);
  if (!version) return null;

  // 如果已有 tag，不再创建
  if (version.gitTag) {
    return version;
  }

  const tagResult = await autoCreateGitTag(version);
  if (tagResult.success) {
    version.gitTag = tagResult.tagName;
    version.gitTagCreatedAt = new Date().toISOString();
  }

  return version;
}

// 创建分支
export async function createBranch(versionId: string, branchName: string): Promise<{ success: boolean; branchName: string }> {
  await delay(500);
  return { success: true, branchName: `feature/${branchName || 'new-branch'}` };
}

// 指定主版本
export async function setMainVersion(versionId: string): Promise<Version | null> {
  await delay(300);
  
  // 先清除其他版本的主版本标记
  mockVersions.forEach(v => { v.isMain = false; });
  
  const index = mockVersions.findIndex((v) => v.id === versionId);
  if (index === -1) return null;
  
  mockVersions[index].isMain = true;
  return mockVersions[index];
}

// 触发构建
export async function triggerBuild(versionId: string): Promise<{ success: boolean; buildId: string }> {
  await delay(300);
  
  const index = mockVersions.findIndex((v) => v.id === versionId);
  if (index === -1) return { success: false, buildId: '' };
  
  mockVersions[index].buildStatus = "building";
  return { success: true, buildId: `build-${Date.now()}` };
}

// 重新构建
export async function rebuildVersion(versionId: string): Promise<{ success: boolean; buildId: string }> {
  await delay(500);
  return triggerBuild(versionId);
}

// 下载产物
export async function downloadArtifact(versionId: string): Promise<{ success: boolean; url: string }> {
  await delay(200);
  
  const version = mockVersions.find((v) => v.id === versionId);
  if (!version || !version.artifactUrl) {
    return { success: false, url: '' };
  }
  
  return { success: true, url: version.artifactUrl };
}

// ========== 快照管理 API ==========

// 获取版本快照列表
export async function getVersionSnapshots(versionId: string): Promise<SnapshotListResponse> {
  await delay(300);
  
  const snapshots = mockSnapshots.filter(s => s.versionId === versionId);
  return {
    data: snapshots,
    total: snapshots.length,
  };
}

// 创建快照
export async function createSnapshot(versionId: string, request: CreateSnapshotRequest): Promise<VersionSnapshot> {
  await delay(300);
  
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

// 恢复快照
export async function restoreSnapshot(snapshotId: string): Promise<Version> {
  await delay(500);
  
  const snapshot = mockSnapshots.find(s => s.id === snapshotId);
  if (!snapshot) {
    throw new Error("Snapshot not found");
  }
  
  const version = mockVersions.find(v => v.id === snapshot.versionId);
  if (!version) {
    throw new Error("Version not found");
  }
  
  // 恢复快照内容到版本
  version.title = snapshot.name;
  version.description = snapshot.description;
  version.tags = [...snapshot.tags];
  version.status = snapshot.status;
  version.buildStatus = snapshot.buildStatus;
  version.artifactUrl = snapshot.artifactUrl;
  
  return version;
}

// React Query hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, branchName }: { versionId: string; branchName: string }) =>
      createBranch(versionId, branchName),
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

export function useTriggerBuild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => triggerBuild(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useRebuildVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => rebuildVersion(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useDownloadArtifact() {
  return useMutation({
    mutationFn: (versionId: string) => downloadArtifact(versionId),
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

// 创建 Git Tag
export function useCreateGitTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => createGitTag(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

// ========== 快照 Hooks ==========

export function useVersionSnapshots(versionId: string) {
  return useQuery({
    queryKey: ["versionSnapshots", versionId],
    queryFn: () => getVersionSnapshots(versionId),
    enabled: !!versionId,
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, request }: { versionId: string; request: CreateSnapshotRequest }) =>
      createSnapshot(versionId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versionSnapshots"] });
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useRestoreSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snapshotId: string) => restoreSnapshot(snapshotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}
