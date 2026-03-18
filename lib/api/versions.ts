import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Version, VersionListResponse, CreateVersionRequest, UpdateVersionRequest, VersionTag, VersionSnapshot, SnapshotListResponse, CreateSnapshotRequest, GitBranch, CreateBranchRequest, BranchListResponse, VersionBumpType, ReleaseLog, BumpVersionResponse, VersionSettings, VersionMessageScreenshot, ScreenshotListResponse, LinkScreenshotRequest, VersionChangelog, ChangelogResponse, GenerateChangelogRequest, ChangelogChange, TagPrefix, CreateTagRequest, CreateTagResponse, VersionStatus, VersionUpgradeConfig, UpgradeHistoryRecord, UpgradePreview, VersionSummaryVector, VectorSearchResult } from "./types";

// 全局版本自动升级和 Tag 设置
let versionSettings: VersionSettings = {
  autoBump: true,
  bumpType: 'patch',
  autoTag: true,
  tagPrefix: 'v',
  tagOnStatus: ['published'],
};

// 获取版本设置
export function getVersionSettings(): VersionSettings {
  return { ...versionSettings };
}

// 更新版本设置（包含自动升级和自动 Tag）
export function updateVersionSettings(settings: Partial<VersionSettings>): VersionSettings {
  versionSettings = { ...versionSettings, ...settings };
  
  // 更新最后修改时间
  if (settings.autoBump !== undefined || settings.bumpType !== undefined || 
      settings.autoTag !== undefined || settings.tagPrefix !== undefined) {
    versionSettings.lastBumpedAt = new Date().toISOString();
  }
  
  console.log('[Version Settings] Updated:', versionSettings);
  return { ...versionSettings };
}

// Mock 分支数据
const mockBranches: GitBranch[] = [
  {
    id: "branch-main",
    name: "main",
    isMain: true,
    isRemote: false,
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
    createdAt: "2026-02-25T08:00:00Z",
    lastCommitAt: "2026-03-01T09:45:00Z",
    commitMessage: "chore: prepare release v1.3.0",
    author: "system",
    versionId: "v4",
  },
];

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
async function autoCreateGitTag(version: Version, options?: { prefix?: string; message?: string }): Promise<{ success: boolean; tagName: string; message?: string }> {
  await delay(300);
  
  // 确定 Tag 前缀
  let tagPrefix = versionSettings.tagPrefix;
  if (tagPrefix === 'custom' && versionSettings.customPrefix) {
    tagPrefix = versionSettings.customPrefix as TagPrefix;
  }
  
  // 构建 Tag 名称
  const versionNum = version.version.startsWith('v') ? version.version : `v${version.version}`;
  const tagName = tagPrefix === 'v' ? versionNum : `${tagPrefix}/${version.version}`;
  
  // Tag 描述/注释
  const tagMessage = options?.message || `Release ${version.version} - ${version.title || 'Version release'}`;
  
  console.log(`[Auto Tag] Created git tag: ${tagName} for version ${version.version}`);
  console.log(`[Auto Tag] Tag message: ${tagMessage}`);
  
  return { success: true, tagName, message: tagMessage };
}

// 手动创建 Git Tag（增强版）
export async function createGitTag(versionId: string, request?: CreateTagRequest): Promise<CreateTagResponse> {
  await delay(300);

  const version = mockVersions.find((v) => v.id === versionId);
  if (!version) {
    return { success: false, error: 'Version not found' };
  }

  // 如果已有 tag 且不强制创建
  if (version.gitTag && !request?.force) {
    return { success: false, error: 'Tag already exists. Use force=true to overwrite.' };
  }

  // 确定 Tag 名称
  const tagName = request?.tagName || (version.version.startsWith('v') ? version.version : `v${version.version}`);
  const tagMessage = request?.message || `Release ${version.version} - ${version.title || 'Version release'}`;

  // 创建 Tag
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

// 自动递增版本号
function autoBumpVersion(currentVersion: string, bumpType: VersionBumpType): string {
  const match = currentVersion.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    // 如果无法解析，返回原版本号
    return currentVersion.startsWith('v') ? currentVersion : `v${currentVersion}`;
  }
  
  let [, major, minor, patch] = match.map(Number);
  
  switch (bumpType) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
    default:
      patch += 1;
      break;
  }
  
  return `v${major}.${minor}.${patch}`;
}

// Mock 发布记录数据
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

// ========== Mock 消息截图数据 ==========
const mockVersionScreenshots: VersionMessageScreenshot[] = [
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

// ========== Mock 变更摘要数据 ==========
const mockChangelogs: VersionChangelog[] = [
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

  // 如果是发布状态，根据设置自动创建 Git Tag
  if (versionSettings.autoTag && versionSettings.tagOnStatus.includes(request.status as VersionStatus)) {
    const tagResult = await autoCreateGitTag(newVersion);
    if (tagResult.success) {
      newVersion.gitTag = tagResult.tagName;
      newVersion.gitTagCreatedAt = new Date().toISOString();
      console.log(`[Auto Tag] Created tag ${tagResult.tagName} for version ${newVersion.version}`);
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

  // 当状态变更时，根据设置自动创建 Git Tag
  const isStatusChangingToTagStatus = request.status && 
    versionSettings.autoTag && 
    versionSettings.tagOnStatus.includes(request.status as VersionStatus) &&
    currentVersion.status !== request.status;
    
  if (isStatusChangingToTagStatus && !currentVersion.gitTag) {
    const tagResult = await autoCreateGitTag(updated);
    if (tagResult.success) {
      updated.gitTag = tagResult.tagName;
      updated.gitTagCreatedAt = new Date().toISOString();
      console.log(`[Auto Tag] Created tag ${tagResult.tagName} for version ${updated.version} on status change to ${request.status}`);
    }
  }

  // 当状态变为已发布时，自动递增版本号
  if (isStatusChangingToPublished && versionSettings.autoBump) {
    const previousVersion = updated.version;
    const newVersion = autoBumpVersion(previousVersion, versionSettings.bumpType);
    
    // 创建新版本记录
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
    
    // 添加到版本列表
    mockVersions.unshift(newVersionEntry);
    
    // 记录发布日志
    const releaseLog: ReleaseLog = {
      id: `rel-${Date.now()}`,
      versionId: newVersionEntry.id,
      version: newVersion,
      previousVersion: previousVersion,
      bumpType: versionSettings.bumpType,
      releasedAt: new Date().toISOString(),
      releasedBy: 'system',
    };
    mockReleaseLogs.unshift(releaseLog);
    
    console.log(`[Auto Bump] Version bumped from ${previousVersion} to ${newVersion} (${versionSettings.bumpType})`);
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

// 下载产物（支持多格式）
export async function downloadArtifact(
  versionId: string, 
  format: string = 'zip'
): Promise<{ success: boolean; url: string }> {
  await delay(200);
  
  const version = mockVersions.find((v) => v.id === versionId);
  if (!version || !version.artifactUrl) {
    return { success: false, url: '' };
  }
  
  // 根据格式生成不同的下载 URL
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

// 下载历史记录（Mock 数据）
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

// 获取下载历史
export async function getDownloadHistory(): Promise<typeof mockDownloadHistory> {
  await delay(100);
  return [...mockDownloadHistory];
}

// 添加下载记录
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

// ========== 分支管理 API ==========

// 获取分支列表
export async function getBranches(): Promise<BranchListResponse> {
  await delay(300);
  return {
    data: [...mockBranches],
    total: mockBranches.length,
  };
}

// 创建分支
export async function createBranch(request: CreateBranchRequest): Promise<GitBranch> {
  await delay(500);
  
  const newBranch: GitBranch = {
    id: `branch-${Date.now()}`,
    name: request.name,
    isMain: false,
    isRemote: false,
    createdAt: new Date().toISOString(),
    lastCommitAt: new Date().toISOString(),
    commitMessage: `feat: create branch ${request.name}`,
    author: "current-user",
    versionId: request.versionId,
  };
  
  mockBranches.unshift(newBranch);
  return newBranch;
}

// 删除分支
export async function deleteBranch(branchId: string): Promise<boolean> {
  await delay(300);
  
  const index = mockBranches.findIndex(b => b.id === branchId);
  if (index === -1) return false;
  
  // 不能删除主分支
  if (mockBranches[index].isMain) {
    throw new Error("Cannot delete main branch");
  }
  
  mockBranches.splice(index, 1);
  return true;
}

// 设置主分支
export async function setMainBranch(branchId: string): Promise<GitBranch | null> {
  await delay(300);
  
  // 先清除其他分支的主分支标记
  mockBranches.forEach(b => { b.isMain = false; });
  
  const index = mockBranches.findIndex(b => b.id === branchId);
  if (index === -1) return null;
  
  mockBranches[index].isMain = true;
  return mockBranches[index];
}

// 手动触发版本号递增
export async function bumpVersion(versionId: string, bumpType: VersionBumpType): Promise<BumpVersionResponse> {
  await delay(300);
  
  const index = mockVersions.findIndex(v => v.id === versionId);
  if (index === -1) {
    return { success: false, error: 'Version not found' };
  }
  
  const currentVersion = mockVersions[index];
  const previousVersion = currentVersion.version;
  const newVersion = autoBumpVersion(previousVersion, bumpType);
  
  // 创建新版本
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
  
  // 记录发布日志
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

// 获取发布记录
export async function getReleaseLogs(versionId?: string): Promise<ReleaseLog[]> {
  await delay(200);
  
  if (versionId) {
    return mockReleaseLogs.filter(r => r.versionId === versionId);
  }
  
  return [...mockReleaseLogs];
}

// React Query hooks

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
    mutationFn: ({ versionId, format = 'zip' }: { versionId: string; format?: string }) => 
      downloadArtifact(versionId, format),
  });
}

// 下载历史 Hook（支持重试和云同步）
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

// 创建 Git Tag（增强版）
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

// ========== 分支管理 Hooks ==========

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

// ========== Version Bump & Release Logs Hooks ==========

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

export function useReleaseLogs(versionId?: string) {
  return useQuery({
    queryKey: ["releaseLogs", versionId],
    queryFn: () => getReleaseLogs(versionId),
  });
}

export function useVersionSettings() {
  return useQuery({
    queryKey: ["versionSettings"],
    queryFn: () => getVersionSettings(),
  });
}

export function useUpdateVersionSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSettings: Partial<VersionSettings>) => {
      return updateVersionSettings(newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versionSettings"] });
    },
  });
}

// ========== 消息截图 API 函数 ==========

export async function getVersionScreenshots(versionId: string): Promise<ScreenshotListResponse> {
  await delay(200);
  const filtered = mockVersionScreenshots.filter((s) => s.versionId === versionId);
  return {
    data: filtered,
    total: filtered.length,
  };
}

export async function linkScreenshot(
  versionId: string,
  request: LinkScreenshotRequest
): Promise<VersionMessageScreenshot> {
  await delay(300);

  const newScreenshot: VersionMessageScreenshot = {
    id: `ss-${Date.now()}`,
    versionId,
    messageId: request.messageId,
    messageContent: request.messageContent,
    senderName: request.senderName,
    senderAvatar: request.senderAvatar,
    screenshotUrl: request.screenshotUrl,
    thumbnailUrl: request.thumbnailUrl,
    createdAt: new Date().toISOString(),
  };

  mockVersionScreenshots.unshift(newScreenshot);
  return newScreenshot;
}

export async function unlinkScreenshot(screenshotId: string): Promise<boolean> {
  await delay(200);
  const index = mockVersionScreenshots.findIndex((s) => s.id === screenshotId);
  if (index === -1) return false;
  mockVersionScreenshots.splice(index, 1);
  return true;
}

// ========== 变更摘要 API 函数 ==========

export async function getVersionChangelog(versionId: string): Promise<ChangelogResponse | null> {
  await delay(200);
  const changelog = mockChangelogs.find((c) => c.versionId === versionId);
  if (!changelog) return null;
  return { data: changelog };
}

export async function generateChangelog(
  request: GenerateChangelogRequest
): Promise<ChangelogResponse> {
  await delay(500); // 模拟生成时间

  // 从版本信息生成变更摘要
  const version = mockVersions.find((v) => v.id === request.versionId);
  if (!version) {
    throw new Error("Version not found");
  }

  // 模拟生成的变更
  const mockChanges: ChangelogChange[] = [
    { type: "feature", description: "新增功能模块", files: version.changedFiles.slice(0, 2) },
    { type: "improvement", description: "优化用户体验", files: [] },
    { type: "fix", description: "修复已知问题", files: version.changedFiles.slice(2) },
  ];

  const newChangelog: VersionChangelog = {
    id: `cl-${Date.now()}`,
    versionId: request.versionId,
    title: request.title || `${version.version} 变更日志`,
    content: `${version.title} - ${version.description}`,
    changes: mockChanges,
    generatedAt: new Date().toISOString(),
    generatedBy: "system",
  };

  // 保存到 mock 数据中
  const existingIndex = mockChangelogs.findIndex((c) => c.versionId === request.versionId);
  if (existingIndex >= 0) {
    mockChangelogs[existingIndex] = newChangelog;
  } else {
    mockChangelogs.unshift(newChangelog);
  }

  return { data: newChangelog };
}

// ========== 消息截图 Hooks ==========

export function useVersionScreenshots(versionId: string) {
  return useQuery({
    queryKey: ["versionScreenshots", versionId],
    queryFn: () => getVersionScreenshots(versionId),
    enabled: !!versionId,
  });
}

export function useLinkScreenshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, request }: { versionId: string; request: LinkScreenshotRequest }) =>
      linkScreenshot(versionId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["versionScreenshots", variables.versionId] });
    },
  });
}

export function useUnlinkScreenshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ screenshotId }: { screenshotId: string; versionId: string }) =>
      unlinkScreenshot(screenshotId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["versionScreenshots", variables.versionId] });
    },
  });
}

// ========== 变更摘要 Hooks ==========

export function useVersionChangelog(versionId: string) {
  return useQuery({
    queryKey: ["versionChangelog", versionId],
    queryFn: () => getVersionChangelog(versionId),
    enabled: !!versionId,
  });
}

export function useGenerateChangelog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: GenerateChangelogRequest) => generateChangelog(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["versionChangelog", variables.versionId] });
    },
  });
}

// ========== 版本升级配置 API ==========

// Mock 升级配置数据
const mockUpgradeConfigs: VersionUpgradeConfig[] = [];
const mockUpgradeHistory: UpgradeHistoryRecord[] = [];

// 获取升级配置
export async function getUpgradeConfig(versionId: string): Promise<VersionUpgradeConfig | null> {
  await delay(100);
  const config = mockUpgradeConfigs.find(c => c.versionId === versionId);
  if (!config) {
    // 返回默认配置
    return {
      id: `cfg-${versionId}`,
      versionId,
      bumpType: 'patch',
      autoTrigger: true,
      triggerOn: ['publish'],
      enablePreview: true,
      historyRetention: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return config;
}

// 更新升级配置
export async function updateUpgradeConfig(
  versionId: string, 
  updates: Partial<VersionUpgradeConfig>
): Promise<VersionUpgradeConfig> {
  await delay(200);
  let config = mockUpgradeConfigs.find(c => c.versionId === versionId);
  
  if (!config) {
    config = {
      id: `cfg-${versionId}`,
      versionId,
      bumpType: 'patch',
      autoTrigger: true,
      triggerOn: ['publish'],
      enablePreview: true,
      historyRetention: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockUpgradeConfigs.push(config);
  }
  
  Object.assign(config, updates, { updatedAt: new Date().toISOString() });
  return config;
}

// 预览升级结果
export async function previewUpgrade(versionId: string): Promise<UpgradePreview> {
  await delay(150);
  const version = mockVersions.find(v => v.id === versionId);
  if (!version) {
    throw new Error("Version not found");
  }
  
  const config = await getUpgradeConfig(versionId);
  const bumpType = config?.bumpType || 'patch';
  
  // 计算新版本号（custom 类型使用 patch 作为默认值）
  const effectiveBumpType = bumpType === 'custom' ? 'patch' : bumpType;
  const newVersion = autoBumpVersion(version.version, effectiveBumpType as VersionBumpType);
  
  return {
    currentVersion: version.version,
    newVersion,
    bumpType,
    changes: [
      { field: 'version', oldValue: version.version, newValue: newVersion },
      { field: 'bumpType', oldValue: '', newValue: bumpType },
    ],
  };
}

// 获取升级历史
export async function getUpgradeHistory(versionId: string): Promise<UpgradeHistoryRecord[]> {
  await delay(100);
  return mockUpgradeHistory.filter(h => h.versionId === versionId);
}

// 添加升级记录
export async function addUpgradeRecord(record: Omit<UpgradeHistoryRecord, 'id' | 'timestamp'>): Promise<UpgradeHistoryRecord> {
  await delay(50);
  const newRecord: UpgradeHistoryRecord = {
    ...record,
    id: `upg-${Date.now()}`,
    timestamp: new Date().toLocaleString('zh-CN'),
  };
  mockUpgradeHistory.unshift(newRecord);
  return newRecord;
}

// ========== 版本升级配置 Hooks ==========

export function useUpgradeConfig(versionId: string) {
  return useQuery({
    queryKey: ["upgradeConfig", versionId],
    queryFn: () => getUpgradeConfig(versionId),
    enabled: !!versionId,
  });
}

export function useUpdateUpgradeConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ versionId, config }: { versionId: string; config: Partial<VersionUpgradeConfig> }) =>
      updateUpgradeConfig(versionId, config),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["upgradeConfig", variables.versionId] });
    },
  });
}

export function usePreviewUpgrade() {
  return useMutation({
    mutationFn: (versionId: string) => previewUpgrade(versionId),
  });
}

export function useUpgradeHistory(versionId: string) {
  return useQuery({
    queryKey: ["upgradeHistory", versionId],
    queryFn: () => getUpgradeHistory(versionId),
    enabled: !!versionId,
  });
}

// ========== 版本摘要向量 API ==========

const VECTOR_STORAGE_KEY = 'teamclaw_version_vectors';

// 获取所有版本向量
export function getVersionVectors(): VersionSummaryVector[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(VECTOR_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// 保存所有版本向量
function saveVersionVectors(vectors: VersionSummaryVector[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VECTOR_STORAGE_KEY, JSON.stringify(vectors));
}

// 生成版本摘要文本
export function generateVersionSummary(version: Version): string {
  const parts = [
    version.version,
    version.title,
    version.description,
    ...version.changedFiles,
  ].filter(Boolean);
  return parts.join(' ');
}

// 计算文本相似度（简化版：Jaccard 相似度）
function calculateSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(text1.toLowerCase().split(/\s+/).filter(Boolean));
  const tokens2 = new Set(text2.toLowerCase().split(/\s+/).filter(Boolean));
  
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  
  const intersection = new Set(Array.from(tokens1).filter(x => tokens2.has(x)));
  const union = new Set(Array.from(tokens1).concat(Array.from(tokens2)));
  
  return intersection.size / union.size;
}

// 生成向量哈希（简化版）
function generateVectorHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// 存储版本向量
export function storeVersionVector(version: Version): VersionSummaryVector {
  const vectors = getVersionVectors();
  const summaryText = generateVersionSummary(version);
  const vectorHash = generateVectorHash(summaryText);
  const now = new Date().toISOString();
  
  const existingIndex = vectors.findIndex(v => v.versionId === version.id);
  const vector: VersionSummaryVector = {
    versionId: version.id,
    version: version.version,
    summaryText,
    vectorHash,
    createdAt: existingIndex >= 0 ? vectors[existingIndex].createdAt : now,
    updatedAt: now,
  };
  
  if (existingIndex >= 0) {
    vectors[existingIndex] = vector;
  } else {
    vectors.push(vector);
  }
  
  saveVersionVectors(vectors);
  return vector;
}

// 向量语义搜索
export async function searchVersionsByVector(
  query: string,
  limit: number = 10,
  _threshold: number = 0.1
): Promise<VectorSearchResult[]> {
  await delay(100);
  
  const vectors = getVersionVectors();
  const versions = await getVersions(1, 100, 'all');
  
  const results: VectorSearchResult[] = [];
  
  for (const version of versions.data) {
    const vector = vectors.find(v => v.versionId === version.id);
    const summaryText = vector?.summaryText || generateVersionSummary(version);
    const similarity = calculateSimilarity(query, summaryText);
    
    if (similarity > _threshold) {
      results.push({ version, similarity });
    }
  }
  
  // 按相似度排序
  results.sort((a, b) => b.similarity - a.similarity);
  
  return results.slice(0, limit);
}

// 查找相似版本
export async function findSimilarVersions(
  versionId: string,
  limit: number = 5
): Promise<VectorSearchResult[]> {
  await delay(50);
  
  const versions = await getVersions(1, 100, 'all');
  const targetVersion = versions.data.find(v => v.id === versionId);
  
  if (!targetVersion) return [];
  
  const targetVector = getVersionVectors().find(v => v.versionId === versionId);
  const targetSummary = targetVector?.summaryText || generateVersionSummary(targetVersion);
  
  const results: VectorSearchResult[] = [];
  
  for (const version of versions.data) {
    if (version.id === versionId) continue;
    
    const vector = getVersionVectors().find(v => v.versionId === version.id);
    const summaryText = vector?.summaryText || generateVersionSummary(version);
    const similarity = calculateSimilarity(targetSummary, summaryText);
    
    if (similarity > 0.1) {
      results.push({ version, similarity });
    }
  }
  
  // 按相似度排序
  results.sort((a, b) => b.similarity - a.similarity);
  
  return results.slice(0, limit);
}

// 初始化版本向量（批量）
export async function initializeVersionVectors(): Promise<number> {
  const versions = await getVersions(1, 100, 'all');
  let count = 0;
  
  for (const version of versions.data) {
    storeVersionVector(version);
    count++;
  }
  
  return count;
}
