import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Version, VersionListResponse, CreateVersionRequest, UpdateVersionRequest, VersionTag, VersionSnapshot, SnapshotListResponse, CreateSnapshotRequest, GitBranch, CreateBranchRequest, RenameBranchRequest, BranchProtectionRequest, BranchListResponse, VersionBumpType, ReleaseLog, BumpVersionResponse, VersionSettings, VersionMessageScreenshot, ScreenshotListResponse, LinkScreenshotRequest, VersionChangelog, ChangelogResponse, GenerateChangelogRequest, ChangelogChange, TagPrefix, CreateTagRequest, CreateTagResponse, VersionStatus, VersionUpgradeConfig, UpgradeHistoryRecord, UpgradePreview, VersionSummaryVector, VectorSearchResult, SimilarVersion, TagLifecycleRecord, BatchTagResponse, BuildEnhancementSettings, BuildNotificationSettings, BuildEnvironment, BUILD_ENVIRONMENTS, DEFAULT_BUILD_RETRY_SETTINGS, DEFAULT_NOTIFICATION_SETTINGS, BatchDownloadRequest, BatchDownloadResponse, DownloadUrlVerification, DownloadStats, VersionSummary, BuildArtifact, RollbackHistoryRecord } from "./types";

// 全局版本自动升级和 Tag 设置
let versionSettings: VersionSettings = {
  autoBump: true,
  bumpType: 'patch',
  autoTag: true,
  tagPrefix: 'v',
  tagOnStatus: ['published'],
};

const API_BASE = '/api/v1';

// 获取版本设置
export async function getVersionSettingsAPI(): Promise<VersionSettings> {
  const res = await fetch(`${API_BASE}/versions/settings`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || 'Failed to fetch version settings');
}

// 更新版本设置（包含自动升级和自动 Tag）
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

// 获取版本设置（同步版本，用于初始化）
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

// 带 API 同步的更新版本设置
export async function syncUpdateVersionSettings(settings: Partial<VersionSettings>): Promise<VersionSettings> {
  try {
    const updated = await updateVersionSettingsAPI(settings);
    versionSettings = updated;
    return updated;
  } catch (err) {
    // Fallback to local update if server is unavailable
    console.warn('[Version Settings] Server unavailable, using local settings:', err);
    return updateVersionSettings(settings);
  }
}

// Mock 分支数据
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
  // Try server API first
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
  try {
    const res = await fetch(`${API_BASE}/versions/${id}`);
    const json = await res.json();
    if ((json.code === 200 || json.code === 0) && json.data) {
      return json.data;
    }
  } catch {
    // Fall through to mock
  }
  await delay(200);
  return mockVersions.find((v) => v.id === id) || null;
}

// 创建版本
export async function createVersion(request: CreateVersionRequest): Promise<Version> {
  try {
    const res = await fetch(`${API_BASE}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const json = await res.json();
    if (json.code === 201 || json.code === 200 || json.code === 0) {
      return json.data;
    }
  } catch {
    // Fall through to mock
  }

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
  // Try server API first
  try {
    const res = await fetch(`${API_BASE}/versions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data.version;
    }
  } catch {
    // Fall through to mock
  }

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
  // Try server API first
  try {
    const res = await fetch(`${API_BASE}/versions/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.code === 200 || json.code === 0 || json.code === 204) {
      return true;
    }
  } catch {
    // Fall through to mock
  }

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

// 重命名分支
export async function renameBranch(request: RenameBranchRequest): Promise<GitBranch | null> {
  await delay(300);
  
  const index = mockBranches.findIndex(b => b.id === request.branchId);
  if (index === -1) return null;
  
  // 保护分支不允许重命名
  if (mockBranches[index].isProtected) {
    throw new Error("Protected branches cannot be renamed");
  }
  
  mockBranches[index].name = request.newName;
  mockBranches[index].commitMessage = `chore: rename branch to ${request.newName}`;
  return mockBranches[index];
}

// 切换分支保护状态
export async function toggleBranchProtection(request: BranchProtectionRequest): Promise<GitBranch | null> {
  await delay(200);
  
  const index = mockBranches.findIndex(b => b.id === request.branchId);
  if (index === -1) return null;
  
  // 主分支必须保持保护状态
  if (mockBranches[index].isMain && !request.protected) {
    throw new Error("Main branch must always be protected");
  }
  
  mockBranches[index].isProtected = request.protected;
  return mockBranches[index];
}

// 手动触发版本号递增
export async function bumpVersion(versionId: string, bumpType: VersionBumpType): Promise<BumpVersionResponse> {
  // Try server-side bump first
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

// ========== 消息截图 API 函数 ==========

export async function getVersionScreenshots(versionId: string): Promise<ScreenshotListResponse> {
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/screenshots`);
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '获取截图列表失败');
  } catch (err) {
    console.warn('[Screenshot API] Using fallback:', err);
    const filtered = mockVersionScreenshots.filter((s) => s.versionId === versionId);
    return { data: filtered, total: filtered.length };
  }
}

export async function linkScreenshot(
  versionId: string,
  request: LinkScreenshotRequest
): Promise<VersionMessageScreenshot> {
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/screenshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '上传截图失败');
  } catch (err) {
    console.warn('[Screenshot API] Using fallback:', err);
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
}

export async function unlinkScreenshot(screenshotId: string): Promise<boolean> {
  try {
    // Find the screenshot first to get versionId
    const screenshot = mockVersionScreenshots.find((s) => s.id === screenshotId);
    if (!screenshot) return false;

    const res = await fetch(`${API_BASE}/versions/${screenshot.versionId}/screenshots/${screenshotId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      const index = mockVersionScreenshots.findIndex((s) => s.id === screenshotId);
      if (index !== -1) mockVersionScreenshots.splice(index, 1);
      return true;
    }
    throw new Error(json.message || '删除截图失败');
  } catch (err) {
    console.warn('[Screenshot API] Delete failed, using fallback:', err);
    const index = mockVersionScreenshots.findIndex((s) => s.id === screenshotId);
    if (index === -1) return false;
    mockVersionScreenshots.splice(index, 1);
    return true;
  }
}

// ========== 变更摘要 API 函数 ==========

export async function getVersionChangelog(versionId: string): Promise<ChangelogResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/summary`);
    if (res.status === 404) return null;
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return { data: json.data };
    }
    throw new Error(json.message || '获取变更摘要失败');
  } catch (err) {
    console.warn('[Changelog API] Using fallback:', err);
    const changelog = mockChangelogs.find((c) => c.versionId === versionId);
    if (!changelog) return null;
    return { data: changelog };
  }
}

export async function generateChangelog(
  request: GenerateChangelogRequest
): Promise<ChangelogResponse> {
  try {
    const res = await fetch(`${API_BASE}/versions/${request.versionId}/summary/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return { data: json.data };
    }
    throw new Error(json.message || '生成变更摘要失败');
  } catch (err) {
    console.warn('[Changelog API] Generate failed, using fallback:', err);
    const version = mockVersions.find((v) => v.id === request.versionId);
    if (!version) {
      throw new Error("Version not found");
    }

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
}

// ========== 版本摘要保存函数 ==========

export async function saveVersionSummary(
  versionId: string,
  data: {
    content?: string;
    features?: string[];
    changes?: string[];
    fixes?: string[];
    breaking?: string[];
    createdBy?: string;
  }
): Promise<VersionSummary | null> {
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '保存变更摘要失败');
  } catch (err) {
    console.warn('[Summary API] Save failed:', err);
    return null;
  }
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

// ========== 版本向量搜索 API ==========

const VECTOR_STORAGE_KEY = 'teamclaw_version_vectors';

// 生成版本摘要文本
export function generateVersionSummary(version: Version): string {
  const parts = [
    version.version,
    version.title,
    version.description || '',
    ...version.tags,
    ...version.changedFiles,
  ];
  return parts.filter(Boolean).join(' ');
}

// ========== LLM 版本摘要生成 ==========
// 注意：由于 API key 不应在客户端暴露，这里使用简化版摘要生成。
// 如需 LLM 生成，请通过 server-side API route 调用。

export async function generateVersionSummaryLLM(version: Version): Promise<VersionSummary> {
  // 使用结构化提取生成摘要（不调用 LLM，避免 key 暴露）
  return {
    versionId: version.id,
    title: version.title || version.version,
    content: buildVersionText(version),
    features: extractFeatures(version),
    changes: [],
    fixes: [],
    breaking: [],
    text: buildVersionText(version),
    generatedAt: new Date().toISOString(),
  };
}

function buildVersionText(version: Version): string {
  const parts = [version.version];
  if (version.title) parts.push(version.title);
  if (version.description) parts.push(version.description);
  if (version.gitTag) parts.push(`Tag: ${version.gitTag}`);
  if (version.tags.length > 0) parts.push(`标签: ${version.tags.join(', ')}`);
  parts.push(`变更文件: ${version.changedFiles.length} 个`);
  parts.push(`提交: ${version.commitCount} 次`);
  return parts.join(' | ');
}

function extractFeatures(version: Version): string[] {
  const features: string[] = [];
  if (version.title) features.push(version.title);
  if (version.description) features.push(version.description);
  if (version.gitTag) features.push(`Git Tag: ${version.gitTag}`);
  return features;
}

// 异步存储版本摘要到 localStorage（摘要单独存储，不影响主数据）
const SUMMARY_STORAGE_KEY = 'teamclaw_version_summaries';

export function storeVersionSummary(summary: VersionSummary): void {
  const stored = localStorage.getItem(SUMMARY_STORAGE_KEY);
  const summaries: VersionSummary[] = stored ? JSON.parse(stored) : [];
  const idx = summaries.findIndex(s => s.versionId === summary.versionId);
  if (idx >= 0) summaries[idx] = summary;
  else summaries.push(summary);
  localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summaries));
}

export function getVersionSummary(versionId: string): VersionSummary | null {
  const stored = localStorage.getItem(SUMMARY_STORAGE_KEY);
  if (!stored) return null;
  const summaries: VersionSummary[] = JSON.parse(stored);
  return summaries.find(s => s.versionId === versionId) ?? null;
}

export function getAllVersionSummaries(): VersionSummary[] {
  const stored = localStorage.getItem(SUMMARY_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// 简单哈希函数（用于生成 vector hash）
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// 文本相似度计算（TF-IDF 简化版）
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const words1Arr = Array.from(words1);
  const intersection = words1Arr.filter(x => words2.has(x));
  const unionArr = Array.from(new Set([...words1Arr, ...Array.from(words2)]));
  
  return intersection.length / unionArr.length;
}

// 存储版本向量到 localStorage
export function storeVersionVector(version: Version): VersionSummaryVector {
  const summaryText = generateVersionSummary(version);
  const vectorHash = simpleHash(summaryText);
  
  const vector: VersionSummaryVector = {
    versionId: version.id,
    version: version.version,
    summaryText,
    vectorHash,
    tags: version.tags,
    createdAt: version.createdAt,
    updatedAt: new Date().toISOString(),
  };
  
  // 从 localStorage 读取现有向量
  const stored = localStorage.getItem(VECTOR_STORAGE_KEY);
  const vectors: VersionSummaryVector[] = stored ? JSON.parse(stored) : [];
  
  // 更新或添加向量
  const existingIndex = vectors.findIndex(v => v.versionId === version.id);
  if (existingIndex >= 0) {
    vectors[existingIndex] = vector;
  } else {
    vectors.push(vector);
  }
  
  // 保存回 localStorage
  localStorage.setItem(VECTOR_STORAGE_KEY, JSON.stringify(vectors));
  
  return vector;
}

// 获取所有版本向量
export function getVersionVectors(): VersionSummaryVector[] {
  const stored = localStorage.getItem(VECTOR_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// 向量语义搜索
export function searchVersionsByVector(
  query: string, 
  limit: number = 10
): VectorSearchResult[] {
  const vectors = getVersionVectors();
  const results: VectorSearchResult[] = [];
  
  for (const vector of vectors) {
    const similarity = calculateSimilarity(query, vector.summaryText);
    if (similarity > 0.1) { // 阈值过滤
      results.push({
        version: vector,
        similarity,
      });
    }
  }
  
  // 按相似度排序
  results.sort((a, b) => b.similarity - a.similarity);
  
  return results.slice(0, limit);
}

// 查找相似版本
export function findSimilarVersions(
  versionId: string, 
  limit: number = 5
): SimilarVersion[] {
  const vectors = getVersionVectors();
  const target = vectors.find(v => v.versionId === versionId);
  
  if (!target) return [];
  
  const results: SimilarVersion[] = [];
  
  for (const vector of vectors) {
    if (vector.versionId === versionId) continue;
    
    const similarity = calculateSimilarity(target.summaryText, vector.summaryText);
    
    // 计算共同标签
    const commonTags = target.tags.filter(tag => vector.tags.includes(tag));
    
    // 查找完整版本信息
    const fullVersion = mockVersions.find(v => v.id === vector.versionId);
    
    if (similarity > 0.1) {
      results.push({
        versionId: vector.versionId,
        version: vector.version,
        title: fullVersion?.title || vector.version,
        similarity,
        commonTags,
      });
    }
  }
  
  // 按相似度排序
  results.sort((a, b) => b.similarity - a.similarity);
  
  return results.slice(0, limit);
}

// 删除版本向量
export function deleteVersionVector(versionId: string): void {
  const stored = localStorage.getItem(VECTOR_STORAGE_KEY);
  if (!stored) return;
  
  const vectors: VersionSummaryVector[] = JSON.parse(stored);
  const filtered = vectors.filter(v => v.versionId !== versionId);
  
  localStorage.setItem(VECTOR_STORAGE_KEY, JSON.stringify(filtered));
}

// ========== 版本向量搜索 Hooks ==========

export function useVersionVectors() {
  return useQuery({
    queryKey: ["versionVectors"],
    queryFn: () => getVersionVectors(),
  });
}

export function useSearchVersions(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["searchVersions", query],
    queryFn: () => searchVersionsByVector(query),
    enabled: enabled && query.length > 0,
  });
}

export function useSimilarVersions(versionId: string, limit: number = 5) {
  return useQuery({
    queryKey: ["similarVersions", versionId, limit],
    queryFn: () => findSimilarVersions(versionId, limit),
    enabled: !!versionId,
  });
}

export function useStoreVersionVector() {
  return useMutation({
    mutationFn: (version: Version) => {
      storeVersionVector(version);
      return Promise.resolve(version);
    },
    onSuccess: () => {
      // Invalidate vectors cache
    },
  });
}

// ========== Tag 生命周期管理 ==========

const TAG_STORAGE_KEY = "teamclaw_version_tags";

// 从 localStorage 获取所有 Tag 记录
function getStoredTags(): TagLifecycleRecord[] {
  const stored = localStorage.getItem(TAG_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// 保存 Tag 记录到 localStorage
function saveTags(tags: TagLifecycleRecord[]): void {
  localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(tags));
}

// 创建 Tag 记录
export function createTagRecord(version: Version, tagName: string): TagLifecycleRecord {
  const tags = getStoredTags();
  const newTag: TagLifecycleRecord = {
    id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: tagName,
    versionId: version.id,
    version: version.version,
    archived: false,
    protected: false,
    createdAt: new Date().toISOString(),
  };
  tags.push(newTag);
  saveTags(tags);
  return newTag;
}

// 归档/取消归档 Tag
export function archiveTag(tagId: string, archive: boolean = true): TagLifecycleRecord | null {
  const tags = getStoredTags();
  const tagIndex = tags.findIndex(t => t.id === tagId);
  if (tagIndex === -1) return null;
  
  if (tags[tagIndex].protected && archive) {
    console.warn(`[Tag] Cannot archive protected tag: ${tags[tagIndex].name}`);
    return null;
  }
  
  tags[tagIndex].archived = archive;
  tags[tagIndex].archivedAt = archive ? new Date().toISOString() : undefined;
  saveTags(tags);
  return tags[tagIndex];
}

// 设置/取消保护 Tag
export function setTagProtection(tagId: string, protect: boolean = true): TagLifecycleRecord | null {
  const tags = getStoredTags();
  const tagIndex = tags.findIndex(t => t.id === tagId);
  if (tagIndex === -1) return null;
  
  tags[tagIndex].protected = protect;
  saveTags(tags);
  return tags[tagIndex];
}

// 删除 Tag（带保护检查）
export function deleteTagRecord(tagId: string): boolean {
  const tags = getStoredTags();
  const tag = tags.find(t => t.id === tagId);
  
  if (!tag) return false;
  if (tag.protected) {
    console.warn(`[Tag] Cannot delete protected tag: ${tag.name}`);
    return false;
  }
  
  const filtered = tags.filter(t => t.id !== tagId);
  saveTags(filtered);
  return true;
}

// 获取所有 Tag 记录
export function getAllTags(): TagLifecycleRecord[] {
  return getStoredTags();
}

// 获取版本关联的 Tags
export function getVersionTags(versionId: string): TagLifecycleRecord[] {
  const tags = getStoredTags();
  return tags.filter(t => t.versionId === versionId);
}

// 批量创建 Tags
export async function batchCreateTags(
  versions: Version[], 
  prefix: string = 'v'
): Promise<BatchTagResponse> {
  const results: BatchTagResponse['results'] = [];
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (const version of versions) {
    try {
      const tagName = version.version.startsWith('v') ? version.version : `${prefix}${version.version}`;
      createTagRecord(version, tagName);
      results.push({ versionId: version.id, success: true, tagName });
      totalSuccess++;
    } catch (error) {
      results.push({ versionId: version.id, success: false, error: String(error) });
      totalFailed++;
    }
  }
  
  return {
    success: totalFailed === 0,
    results,
    totalSuccess,
    totalFailed,
  };
}

// 批量归档 Tags
export async function batchArchiveTags(
  versionIds: string[], 
  archive: boolean = true
): Promise<{ success: boolean; archived: number; failed: number }> {
  const tags = getStoredTags();
  let archived = 0;
  let failed = 0;
  
  for (const tag of tags) {
    if (versionIds.includes(tag.versionId)) {
      if (archiveTag(tag.id, archive)) {
        archived++;
      } else {
        failed++;
      }
    }
  }
  
  return { success: failed === 0, archived, failed };
}

// 批量删除 Tags
export async function batchDeleteTags(versionIds: string[]): Promise<{ success: boolean; deleted: number; failed: number }> {
  const tags = getStoredTags();
  let deleted = 0;
  let failed = 0;
  
  for (const tag of tags) {
    if (versionIds.includes(tag.versionId)) {
      if (deleteTagRecord(tag.id)) {
        deleted++;
      } else {
        failed++;
      }
    }
  }
  
  return { success: failed === 0, deleted, failed };
}

// Hooks for Tag lifecycle
export function useAllTags() {
  return useQuery<TagLifecycleRecord[]>({
    queryKey: ["allTags"],
    queryFn: () => getAllTags(),
  });
}

export function useVersionTags(versionId: string) {
  return useQuery<TagLifecycleRecord[]>({
    queryKey: ["versionTags", versionId],
    queryFn: () => getVersionTags(versionId),
  });
}

export function useArchiveTag() {
  return useMutation({
    mutationFn: ({ tagId, archive }: { tagId: string; archive: boolean }) => 
      Promise.resolve(archiveTag(tagId, archive)),
  });
}

export function useTagProtection() {
  return useMutation({
    mutationFn: ({ tagId, protect }: { tagId: string; protect: boolean }) =>
      Promise.resolve(setTagProtection(tagId, protect)),
  });
}

export function useDeleteTag() {
  return useMutation({
    mutationFn: (tagId: string) => Promise.resolve(deleteTagRecord(tagId)),
  });
}

export function useBatchCreateTags() {
  return useMutation({
    mutationFn: ({ versions, prefix }: { versions: Version[]; prefix?: string }) =>
      batchCreateTags(versions, prefix),
  });
}

// === 构建增强功能 API ===

const BUILD_SETTINGS_KEY = 'teamclaw_build_settings';

// 获取构建增强设置
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

// 保存构建增强设置
export function saveBuildEnhancementSettings(settings: Partial<BuildEnhancementSettings>): void {
  if (typeof window === 'undefined') return;
  const current = getBuildEnhancementSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(BUILD_SETTINGS_KEY, JSON.stringify(updated));
}

// 发送构建通知（模拟）
export async function sendBuildNotification(
  version: string,
  status: 'success' | 'failed',
  settings: BuildNotificationSettings
): Promise<void> {
  // 检查是否需要通知
  if (settings.notifyOn === 'never') return;
  if (settings.notifyOn === 'failure' && status === 'success') return;
  
  const message = `版本 ${version} 构建${status === 'success' ? '成功' : '失败'}`;
  
  for (const channel of settings.notifyChannels) {
    if (channel === 'feishu') {
      console.log(`[飞书通知] ${message}`);
      // 实际发送飞书通知的 API 调用
    } else if (channel === 'email') {
      console.log(`[邮件通知] ${message} to ${settings.notifyEmails?.join(', ')}`);
      // 实际发送邮件的 API 调用
    }
  }
}

// 带有重试的构建触发
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
        // 发送成功通知
        sendBuildNotification(versionId, 'success', settings.notification);
        return { ...result, attempts };
      }
    } catch (error) {
      // 记录错误用于调试
      console.error('Build attempt failed:', error);
    }
    
    // 如果还有重试次数，等待后重试
    if (i < maxRetries && onRetry) {
      onRetry(i + 1, maxRetries);
      const delay = retryDelays[Math.min(i, retryDelays.length - 1)] * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // 所有重试都失败
  sendBuildNotification(versionId, 'failed', settings.notification);
  return { success: false, buildId: '', attempts };
}

// 获取构建环境列表
export function getBuildEnvironments(): BuildEnvironment[] {
  return BUILD_ENVIRONMENTS;
}

// ========== 产物下载增强 API (iter-22) ==========

// 批量下载产物
export async function batchDownloadArtifacts(
  request: BatchDownloadRequest
): Promise<BatchDownloadResponse> {
  await delay(300);
  
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

// 验证下载链接
export async function verifyDownloadUrl(
  versionId: string,
  url: string
): Promise<DownloadUrlVerification> {
  await delay(200);
  
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
  
  // Mock 验证结果
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

// 获取下载统计
export async function getDownloadStats(): Promise<DownloadStats> {
  await delay(150);
  
  // 基于现有下载历史生成统计
  const allDownloads = [...mockDownloadHistory];
  
  // 按版本统计
  const versionCounts: Record<string, number> = {};
  allDownloads.forEach((d) => {
    versionCounts[d.version] = (versionCounts[d.version] || 0) + 1;
  });
  const downloadsByVersion = Object.entries(versionCounts).map(([version, count]) => ({
    version,
    count,
  }));
  
  // 按格式统计
  const formatCounts: Record<string, number> = {};
  allDownloads.forEach((d) => {
    formatCounts[d.format] = (formatCounts[d.format] || 0) + 1;
  });
  const downloadsByFormat = Object.entries(formatCounts).map(([format, count]) => ({
    format,
    count,
  }));
  
  // 最近7天趋势（Mock）
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

// Re-export types for convenience
export type { BatchDownloadRequest, BatchDownloadResponse, DownloadUrlVerification, DownloadStats } from './types';

// Build Artifacts API
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

export function useBuildArtifacts(versionName?: string) {
  return useQuery({
    queryKey: ["buildArtifacts", versionName],
    queryFn: () => getBuildArtifacts(versionName),
    staleTime: 30 * 1000,
  });
}

export async function uploadBuildArtifact(file: File, versionName: string, env = "production", platform = "unknown", arch = "unknown"): Promise<BuildArtifact> {
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


// Version Rollback API
export interface RollbackRequest {
  versionId: string;
  targetVersion: string;
  mode: "revert" | "checkout";
  message?: string;
}

export interface RollbackResponse {
  success: boolean;
  rollbackId: string;
  newVersionId?: string;
  message: string;
  rollbackedAt?: string;
}

const rollbackHistory: RollbackHistoryRecord[] = [];

export async function rollbackVersion(request: RollbackRequest): Promise<RollbackResponse> {
  console.log("[Version Rollback] Initiating rollback:", request);
  
  // 模拟 API 延迟
  await new Promise((r) => setTimeout(r, 800));
  
  const record: RollbackHistoryRecord = {
    id: `rb-${Date.now()}`,
    versionId: request.versionId,
    fromVersion: request.versionId,
    toVersion: request.targetVersion,
    mode: request.mode,
    performedBy: "developer",
    performedAt: new Date().toISOString(),
    message: request.message || `Rollback to ${request.targetVersion}`,
    backupCreated: true,
    status: "success",
  };
  
  rollbackHistory.push(record);
  
  return {
    success: true,
    rollbackId: record.id,
    newVersionId: `v${Date.now()}`,
    message: `Successfully rolled back to ${request.targetVersion}`,
    rollbackedAt: record.performedAt,
  };
}

export function useRollbackVersion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: RollbackRequest) => rollbackVersion(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
      queryClient.invalidateQueries({ queryKey: ["versionHistory"] });
    },
  });
}

export async function getRollbackHistory(versionId?: string): Promise<RollbackHistoryRecord[]> {
  await new Promise((r) => setTimeout(r, 300));
  if (versionId) {
    return rollbackHistory.filter((r) => r.versionId === versionId);
  }
  return rollbackHistory;
}

export function useRollbackHistory(versionId?: string) {
  return useQuery({
    queryKey: ["rollbackHistory", versionId],
    queryFn: () => getRollbackHistory(versionId),
    staleTime: 60 * 1000,
  });
}
