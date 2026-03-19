import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { ScreenshotModel } from '../models/screenshot.js';
import { VersionSummaryModel } from '../models/versionSummary.js';
import { saveScreenshot, deleteScreenshotFile } from '../services/fileStorage.js';
import { generateChangelogFromCommits } from '../services/changelogGenerator.js';
import { getGitLog, getTags, createTag, getBranches, getCurrentBranch, createBranch, tagExists } from '../services/gitService.js';
import { runBuild, getBuildConfig } from '../services/buildService.js';
import { listArtifacts, deleteArtifacts, getArtifactInfo, getArtifactStream, importArtifactsFromDir, getArtifactsTotalSize } from '../services/artifactStore.js';
import { rollbackToTag, rollbackToBranch, rollbackToCommit, getRollbackPreview, getRollbackTargets } from '../services/rollbackService.js';
import { compareTwoVersions, quickCompare } from '../services/versionCompare.js';
import { performBump, formatBumpSummary } from '../services/versionBump.js';
import { autoCreateTagForVersion, makeTagName as makeTagNameFromConfig, createTagRecord } from '../services/tagService.js';
import { isValidSemver, bumpVersion } from '../services/semver.js';
import path from 'path';
import os from 'os';

const router = Router();

// ========== Types ==========
export type VersionBumpType = 'patch' | 'minor' | 'major';

export interface Version {
  id: string;
  version: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  gitTag?: string;
  gitTagCreatedAt?: string;
  buildStatus: 'pending' | 'building' | 'success' | 'failed';
  artifactUrl?: string;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
  isMain: boolean;
  commitCount: number;
  changedFiles: string[];
  hasScreenshot?: boolean;
  hasSummary?: boolean;
  summary?: string;       // 版本摘要内容（自动生成或手动编辑）
  summaryGeneratedAt?: string; // 摘要生成时间
  summaryGeneratedBy?: string; // 'AI' | 'manual' | 'system'
}

export interface VersionSettings {
  autoBump: boolean;
  bumpType: VersionBumpType;
  autoTag: boolean;
  tagPrefix: 'v' | 'release' | 'version' | 'custom';
  customPrefix?: string;
  tagOnStatus: string[];
  lastBumpedAt?: string;
}

// ========== In-Memory Storage ==========
const versions = new Map<string, Version>();
const settings: VersionSettings = {
  autoBump: true,
  bumpType: 'patch',
  autoTag: true,
  tagPrefix: 'v',
  tagOnStatus: ['published'],
};

// Initialize with sample data
const sampleVersions: Version[] = [
  {
    id: 'v1',
    version: '1.0.0',
    title: '初始版本',
    description: '第一个正式发布版本',
    status: 'published',
    tags: ['stable'],
    gitTag: 'v1.0.0',
    gitTagCreatedAt: '2026-03-01T10:00:00Z',
    buildStatus: 'success',
    artifactUrl: '/builds/v1.0.0.zip',
    releasedAt: '2026-03-01T10:00:00Z',
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    isMain: true,
    commitCount: 10,
    changedFiles: ['README.md', 'package.json'],
  },
  {
    id: 'v2',
    version: '1.1.0',
    title: '新增用户管理',
    description: '添加完整的用户管理功能',
    status: 'published',
    tags: ['feature'],
    gitTag: 'v1.1.0',
    gitTagCreatedAt: '2026-03-10T14:00:00Z',
    buildStatus: 'success',
    artifactUrl: '/builds/v1.1.0.zip',
    releasedAt: '2026-03-10T14:00:00Z',
    createdAt: '2026-03-10T12:00:00Z',
    updatedAt: '2026-03-10T14:00:00Z',
    isMain: false,
    commitCount: 25,
    changedFiles: ['src/users/*.ts', 'src/auth/*.ts'],
  },
  {
    id: 'v3',
    version: '1.2.0',
    title: '版本管理增强',
    description: '支持自动 Tag 和版本回退',
    status: 'draft',
    tags: ['enhancement'],
    buildStatus: 'pending',
    createdAt: '2026-03-18T08:00:00Z',
    updatedAt: '2026-03-18T08:00:00Z',
    isMain: false,
    commitCount: 5,
    changedFiles: [],
  },
];
sampleVersions.forEach(v => versions.set(v.id, v));

// ========== Helper Functions ==========
function autoBumpVersion(currentVersion: string, bumpType: VersionBumpType): string {
  const match = currentVersion.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return currentVersion;

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
      patch += 1;
      break;
  }
  return `v${major}.${minor}.${patch}`;
}

function makeTagName(version: string, prefix: VersionSettings['tagPrefix'], customPrefix?: string): string {
  const prefixMap: Record<string, string> = {
    v: 'v',
    release: 'release/',
    version: 'version/',
  };
  const p = prefix === 'custom' ? (customPrefix || 'v') : prefixMap[prefix];
  return prefix === 'release' || prefix === 'version' ? `${p}${version}` : `${p}${version}`;
}

// ========== Routes ==========

// GET /api/v1/versions — 列表
router.get('/', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const status = req.query.status as string;

  let list = Array.from(versions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (status && status !== 'all') {
    list = list.filter(v => v.status === status);
  }

  const total = list.length;
  const start = (page - 1) * pageSize;
  const paginatedList = list.slice(start, start + pageSize);

  // Enrich with hasScreenshot/hasSummary
  const data = paginatedList.map(v => ({
    ...v,
    hasScreenshot: ScreenshotModel.findByVersionId(v.id).length > 0,
    hasSummary: !!VersionSummaryModel.findByVersionId(v.id),
  }));

  res.json(success({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }));
});

// GET /api/v1/versions/:id — 详情
router.get('/:id', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }
  const summaryRecord = VersionSummaryModel.findByVersionId(v.id);
  res.json(success({
    ...v,
    hasScreenshot: ScreenshotModel.findByVersionId(v.id).length > 0,
    hasSummary: !!summaryRecord,
    summary: summaryRecord?.content || v.summary || undefined,
    summaryGeneratedAt: summaryRecord?.generatedAt || v.summaryGeneratedAt || undefined,
    summaryGeneratedBy: summaryRecord?.generatedBy || v.summaryGeneratedBy || undefined,
  }));
});

// POST /api/v1/versions — 创建版本
router.post('/', (req: Request, res: Response) => {
  const { version, title, description, status, tags } = req.body as {
    version: string;
    title: string;
    description?: string;
    status?: string;
    tags?: string[];
  };

  if (!version || !title) {
    res.status(400).json(error(400, 'version and title are required'));
    return;
  }

  const id = `v_${Date.now()}`;
  const now = new Date().toISOString();
  const newVersion: Version = {
    id,
    version,
    title,
    description: description || '',
    status: (status as Version['status']) || 'draft',
    tags: tags || [],
    buildStatus: 'pending',
    createdAt: now,
    updatedAt: now,
    isMain: false,
    commitCount: 0,
    changedFiles: [],
  };

  versions.set(id, newVersion);
  res.status(201).json(success(newVersion));
});

// PUT /api/v1/versions/:id — 更新版本（含自动 bump 逻辑）
router.put('/:id', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { status, title, description, tags } = req.body as {
    status?: string;
    title?: string;
    description?: string;
    tags?: string[];
  };

  const previousStatus = v.status;
  const newStatus = status || previousStatus;
  const isPublishing = previousStatus !== 'published' && newStatus === 'published';

  // Auto-bump: when publishing and autoBump is enabled
  if (isPublishing && settings.autoBump) {
    const newVersionStr = autoBumpVersion(v.version, settings.bumpType);
    v.version = newVersionStr;

    // Auto-tag
    if (settings.autoTag && settings.tagOnStatus.includes('published')) {
      v.gitTag = makeTagName(newVersionStr, settings.tagPrefix, settings.customPrefix);
      v.gitTagCreatedAt = new Date().toISOString();
      // 创建 Tag 记录（持久化）
      autoCreateTagForVersion(v.id, newVersionStr, {
        message: `Release ${newVersionStr} - ${v.title || ''}`,
      });
    }

    v.releasedAt = new Date().toISOString();
    v.buildStatus = 'success';
  }

  if (title !== undefined) v.title = title;
  if (description !== undefined) v.description = description;
  if (tags !== undefined) v.tags = tags;
  if (status !== undefined) v.status = newStatus as Version['status'];
  v.updatedAt = new Date().toISOString();

  versions.set(v.id, v);

  res.json(success({
    version: v,
    autoBumped: isPublishing && settings.autoBump,
    bumpedTo: isPublishing && settings.autoBump ? v.version : undefined,
  }));
});

// DELETE /api/v1/versions/:id — 删除
router.delete('/:id', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }
  versions.delete(req.params.id);
  res.json(success({ deleted: true }));
});

// POST /api/v1/versions/:id/bump — 手动 bump（自动生成摘要）
router.post('/:id/bump', async (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { bumpType } = req.body as { bumpType?: VersionBumpType };
  const type = bumpType || settings.bumpType;
  const previousVersion = v.version;
  const newVersion = autoBumpVersion(previousVersion, type);

  v.version = newVersion;
  v.updatedAt = new Date().toISOString();

  if (settings.autoTag && settings.tagOnStatus.includes('published')) {
    v.gitTag = makeTagName(newVersion, settings.tagPrefix, settings.customPrefix);
    v.gitTagCreatedAt = new Date().toISOString();
    // 创建 Tag 记录（持久化）
    autoCreateTagForVersion(v.id, newVersion, {
      message: `Release ${newVersion} - ${v.title || ''}`,
    });
  }

  versions.set(v.id, v);

  // Auto-generate summary after bump
  try {
    const projectPath = (v as { projectPath?: string }).projectPath ||
      path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);
    const commits = getGitLog(projectPath, { maxCount: 30, branch: v.gitTag });
    const commitText = commits.map(c => `${c.hash.slice(0, 7)} ${c.message}`).join('\n') || 'bump version';
    const currentBranch = getCurrentBranch(projectPath);
    const generated = await generateChangelogFromCommits(v.id, commitText, currentBranch);
    VersionSummaryModel.upsert({
      versionId: v.id,
      title: generated.title,
      content: generated.content,
      features: generated.features,
      fixes: generated.fixes,
      changes: generated.improvements,
      breaking: generated.breaking,
      createdBy: 'AI',
    });
  } catch (e) {
    console.warn('[bump] Auto summary generation failed:', e);
  }

  res.json(success({
    previousVersion,
    newVersion,
    bumpType: type,
    gitTag: v.gitTag,
  }));
});

// GET /api/v1/versions/settings — 获取设置
router.get('/settings', (req: Request, res: Response) => {
  res.json(success({ ...settings }));
});

// PUT /api/v1/versions/settings — 更新设置
router.put('/settings', (req: Request, res: Response) => {
  const partial = req.body as Partial<VersionSettings>;
  Object.assign(settings, partial);
  if (partial.autoBump !== undefined || partial.bumpType !== undefined) {
    settings.lastBumpedAt = new Date().toISOString();
  }
  res.json(success({ ...settings }));
});

// POST /api/v1/versions/:id/publish — 发布版本（触发 auto-bump）
router.post('/:id/publish', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const previousVersion = v.version;

  // Auto-bump on publish
  if (settings.autoBump) {
    v.version = autoBumpVersion(v.version, settings.bumpType);
  }

  v.status = 'published';
  v.releasedAt = new Date().toISOString();
  v.updatedAt = new Date().toISOString();
  v.buildStatus = 'success';

  // Auto-tag
  if (settings.autoTag && settings.tagOnStatus.includes('published')) {
    v.gitTag = makeTagName(v.version, settings.tagPrefix, settings.customPrefix);
    v.gitTagCreatedAt = new Date().toISOString();
  }

  versions.set(v.id, v);
  res.json(success({
    version: v,
    bumped: settings.autoBump,
    previousVersion: settings.autoBump ? previousVersion : undefined,
    newVersion: v.version,
    tagCreated: !!v.gitTag,
  }));
});

// ========== Build Routes ==========

// GET /api/v1/versions/:id/build-config — Get build configuration for a version
router.get('/:id/build-config', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  // Project path: data/{versionId}/ or ~/.openclaw/projects/{versionId}/
  const projectPath = (v as { projectPath?: string }).projectPath ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);

  const config = getBuildConfig(projectPath);
  res.json(success(config));
});

// POST /api/v1/versions/:id/build — Trigger a build for a version
router.post('/:id/build', async (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { buildCommand, projectPath: explicitPath } = req.body as {
    buildCommand?: string;
    projectPath?: string;
  };

  // Default project path
  const projectPath = explicitPath ||
    (v as { projectPath?: string }).projectPath ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);

  v.buildStatus = 'building';
  v.updatedAt = new Date().toISOString();
  versions.set(v.id, v);

  try {
    const result = await runBuild(projectPath, { buildCommand });

    v.buildStatus = result.success ? 'success' : 'failed';
    v.updatedAt = new Date().toISOString();

    // Import artifacts into store
    let artifactCount = 0;
    if (result.success && result.artifacts.length > 0) {
      for (const artifact of result.artifacts) {
        const srcPath = path.join(projectPath, artifact.path);
        await importArtifactsFromDir(v.id, v.version, path.dirname(srcPath));
        artifactCount++;
      }
      v.artifactUrl = `/artifacts/${v.id}/${v.version}`;
    }

    // Auto-bump on build success: create a new bumped version + tag + tag record
    let autoBumped = false;
    let bumpedVersion: Version | undefined;
    if (result.success && settings.autoBump) {
      const prevVersion = v.version;
      const newVersionStr = autoBumpVersion(v.version, settings.bumpType);
      const tagName = makeTagName(newVersionStr, settings.tagPrefix, settings.customPrefix);

      // Create new version record for the bumped version
      const newId = `v${Date.now()}`;
      bumpedVersion = {
        ...v,
        id: newId,
        version: newVersionStr,
        title: `Build ${newVersionStr}`,
        status: 'draft',
        gitTag: tagName,
        gitTagCreatedAt: new Date().toISOString(),
        buildStatus: 'success',
        artifactUrl: v.artifactUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isMain: false,
        commitCount: v.commitCount,
        changedFiles: v.changedFiles,
      };
      versions.set(newId, bumpedVersion);

      // Create Tag record in tag store
      createTagRecord({
        name: tagName,
        versionId: newId,
        versionName: newVersionStr,
        message: `Auto-bump from build ${v.id} (${prevVersion} → ${newVersionStr})`,
        createdBy: 'system',
        commitHash: undefined,
        annotation: undefined,
      });

      autoBumped = true;
    }

    versions.set(v.id, v);

    res.json(success({
      success: result.success,
      duration: result.duration,
      command: result.command,
      exitCode: result.exitCode,
      artifactCount,
      artifactsUrl: v.artifactUrl,
      outputExcerpt: result.output.slice(-2000),
      errorOutput: result.errorOutput.slice(-2000),
      autoBumped,
      bumpedVersion: bumpedVersion ? { id: bumpedVersion.id, version: bumpedVersion.version, gitTag: bumpedVersion.gitTag } : undefined,
    }));
  } catch (err: unknown) {
    v.buildStatus = 'failed';
    v.updatedAt = new Date().toISOString();
    versions.set(v.id, v);

    res.status(500).json(error(500, `Build failed: ${err instanceof Error ? err.message : String(err)}`));
  }
});

// GET /api/v1/versions/:id/artifacts — List build artifacts
router.get('/:id/artifacts', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const artifacts = listArtifacts(v.id, v.version);
  const totalSize = getArtifactsTotalSize(v.id, v.version);

  res.json(success({
    data: artifacts,
    total: artifacts.length,
    totalSize,
    downloadRoot: `/artifacts/${v.id}/${v.version}`,
  }));
});

// GET /api/v1/versions/:id/artifacts/:artifactPath — Download a specific artifact
router.get('/:id/artifacts/*', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const artifactPath = (req.params as Record<string, string>)[0] || '';
  const info = getArtifactInfo(v.id, v.version, artifactPath);

  if (!info || !info.exists) {
    res.status(404).json(error(404, 'Artifact not found'));
    return;
  }

  const artifactStream = getArtifactStream(v.id, v.version, artifactPath);
  if (!artifactStream) {
    res.status(404).json(error(404, 'Unable to read artifact'));
    return;
  }

  res.setHeader('Content-Disposition', `attachment; filename="${info.name}"`);
  res.setHeader('Content-Length', info.size);
  res.setHeader('Content-Type', 'application/octet-stream');
  artifactStream.stream.pipe(res);
});

// DELETE /api/v1/versions/:id/artifacts — Delete all artifacts for a version
router.delete('/:id/artifacts', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const deleted = deleteArtifacts(v.id, v.version);
  v.artifactUrl = undefined;
  v.buildStatus = 'pending';
  v.updatedAt = new Date().toISOString();
  versions.set(v.id, v);

  res.json(success({ deleted }));
});

// ========== Git Log Routes ==========

// GET /api/v1/versions/:id/git-log — Get git commit history
router.get('/:id/git-log', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const maxCount = parseInt(req.query.maxCount as string) || 50;
  const branch = req.query.branch as string | undefined;

  // Determine project path
  const projectPath = (v as { projectPath?: string }).projectPath ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);

  const commits = getGitLog(projectPath, { maxCount, branch: branch || v.gitTag });
  const currentBranch = getCurrentBranch(projectPath);
  const tags = getTags(projectPath);

  res.json(success({
    commits,
    currentBranch,
    tags: tags.slice(0, 20),
    total: commits.length,
  }));
});

// GET /api/v1/versions/:id/git-tags — Get git tags
router.get('/:id/git-tags', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const projectPath = (v as { projectPath?: string }).projectPath ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);

  const tags = getTags(projectPath);
  res.json(success({ data: tags, total: tags.length }));
});

// POST /api/v1/versions/:id/git-tags — Create a git tag for a version
router.post('/:id/git-tags', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { tagName, message } = req.body as { tagName?: string; message?: string };
  const name = tagName || makeTagName(v.version, settings.tagPrefix, settings.customPrefix);

  const projectPath = (v as { projectPath?: string }).projectPath ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);

  const created = createTag(projectPath, name, message);

  if (created) {
    v.gitTag = name;
    v.gitTagCreatedAt = new Date().toISOString();
    v.updatedAt = new Date().toISOString();
    versions.set(v.id, v);
    // 同时在 Tag 生命周期系统中创建记录
    autoCreateTagForVersion(v.id, v.version, {
      name,
      message,
      createdBy: 'user',
    });
  }

  res.json(success({ created, tag: name, tagExists: tagExists(projectPath, name) }));
});

// In-memory rollback history store (same pattern as tag/tokens modules)
import { RollbackRecord } from '../models/rollbackRecord.js';
const rollbackHistory: RollbackRecord[] = [];

// ========== Rollback Routes ==========

// In-memory rollback history (same pattern as other modules)
// GET /api/v1/versions/:id/rollback-history — Get rollback history for a version
router.get('/:id/rollback-history', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const history = rollbackHistory.filter(r => r.versionId === req.params.id);
  res.json(success(history));
});

// GET /api/v1/versions/:id/rollback-targets — Get available rollback targets
router.get('/:id/rollback-targets', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const projectPath = (v as { projectPath?: string }).projectPath ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);

  const targets = getRollbackTargets(projectPath);
  res.json(success(targets));
});

// GET /api/v1/versions/:id/rollback-preview — Preview what a rollback would do
router.get('/:id/rollback-preview', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const targetRef = req.query.ref as string;
  if (!targetRef) {
    res.status(400).json(error(400, 'ref query parameter required'));
    return;
  }

  const projectPath = (v as { projectPath?: string }).projectPath ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);

  const preview = getRollbackPreview(projectPath, targetRef);
  res.json(success(preview));
});

// POST /api/v1/versions/:id/rollback — Rollback to a tag, branch, or commit
router.post('/:id/rollback', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { target, type, createBranch: shouldCreateBranch } = req.body as {
    target: string;
    type?: 'tag' | 'branch' | 'commit';
    createBranch?: boolean;
  };

  if (!target) {
    res.status(400).json(error(400, 'target is required'));
    return;
  }

  const projectPath = (v as { projectPath?: string }).projectPath ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);

  let result;
  if (type === 'branch') {
    result = rollbackToBranch(projectPath, target, { createBackupBranch: true });
  } else if (type === 'commit') {
    result = rollbackToCommit(projectPath, target, { createBranch: shouldCreateBranch, branchName: shouldCreateBranch ? `rollback/${v.version}-${Date.now()}` : undefined });
  } else {
    // Default to tag
    result = rollbackToTag(projectPath, target, { createBranch: shouldCreateBranch, branchName: shouldCreateBranch ? `rollback/${v.version}` : undefined });
  }

  // Record in rollback history
  const record: RollbackRecord = {
    id: `rb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    versionId: v.id,
    versionName: v.version,
    targetRef: target,
    targetType: type || 'tag',
    mode: type === 'branch' ? 'checkout' : 'revert',
    previousRef: result.previousRef,
    newBranch: result.newBranch,
    backupCreated: shouldCreateBranch || false,
    success: result.success,
    error: result.error,
    performedBy: 'developer',
    performedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  rollbackHistory.push(record);

  res.json(success(result));
});

// ========== Branch Routes (top-level) ==========

// GET /api/v1/branches — List branches for a project version
router.get('/branches', (req: Request, res: Response) => {
  const versionId = req.query.versionId as string;
  if (!versionId) {
    res.status(400).json(error(400, 'versionId query parameter required'));
    return;
  }

  const v = versions.get(versionId);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const projectPath = (v as { projectPath?: string }).projectPath ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);

  const branches = getBranches(projectPath);
  const currentBranch = getCurrentBranch(projectPath);

  res.json(success({
    data: branches,
    total: branches.length,
    currentBranch,
  }));
});

// POST /api/v1/branches — Create a new branch
router.post('/branches', (req: Request, res: Response) => {
  const { versionId, branchName, baseRef } = req.body as {
    versionId: string;
    branchName: string;
    baseRef?: string;
  };

  if (!versionId || !branchName) {
    res.status(400).json(error(400, 'versionId and branchName are required'));
    return;
  }

  const v = versions.get(versionId);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const projectPath = (v as { projectPath?: string }).projectPath ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);

  const created = createBranch(projectPath, branchName, baseRef);
  if (created) {
    res.status(201).json(success({ created: true, branchName, baseRef: baseRef || 'HEAD' }));
  } else {
    res.status(500).json(error(500, `Failed to create branch ${branchName}`));
  }
});

// PUT /api/v1/branches/primary — Set primary/default branch
router.put('/branches/primary', (req: Request, res: Response) => {
  const { versionId, branchName } = req.body as { versionId: string; branchName: string };

  if (!versionId || !branchName) {
    res.status(400).json(error(400, 'versionId and branchName are required'));
    return;
  }

  const v = versions.get(versionId);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  // Update the version's default branch
  (v as { defaultBranch?: string }).defaultBranch = branchName;
  v.updatedAt = new Date().toISOString();
  versions.set(v.id, v);

  res.json(success({ updated: true, defaultBranch: branchName }));
});

// ========== Screenshot Routes ==========

// GET /api/v1/versions/:id/screenshots - List screenshots for a version
router.get('/:id/screenshots', (req: Request, res: Response) => {
  const { id } = req.params;
  const screenshots = ScreenshotModel.findByVersionId(id);
  res.json(success({ data: screenshots, total: screenshots.length }));
});

// POST /api/v1/versions/:id/screenshots - Upload/link a screenshot
router.post('/:id/screenshots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { imageData, messageId, messageContent, senderName, senderAvatar, screenshotUrl, branchName } = req.body as {
      imageData?: string;
      messageId?: string;
      messageContent?: string;
      senderName?: string;
      senderAvatar?: string;
      screenshotUrl?: string;
      branchName?: string;
    };

    let savedUrl = screenshotUrl || '';

    // If imageData is provided (Base64), save to file
    if (imageData) {
      const result = await saveScreenshot(id, imageData);
      savedUrl = result.url;
    }

    const screenshot = ScreenshotModel.create({
      versionId: id,
      messageId,
      messageContent,
      senderName,
      senderAvatar,
      screenshotUrl: savedUrl,
      thumbnailUrl: savedUrl,
      branchName,
    });

    res.status(201).json(success(screenshot));
  } catch (err) {
    console.error('Screenshot upload error:', err);
    res.status(500).json(error(500, '截图上传失败'));
  }
});

// DELETE /api/v1/versions/:id/screenshots/:screenshotId - Delete a screenshot
router.delete('/:id/screenshots/:screenshotId', async (req: Request, res: Response) => {
  try {
    const { screenshotId } = req.params;
    const screenshot = ScreenshotModel.findById(screenshotId);

    if (!screenshot) {
      res.status(404).json(error(404, '截图不存在'));
      return;
    }

    // Delete file if it's a local file
    if (screenshot.screenshotUrl.startsWith('/screenshots/')) {
      await deleteScreenshotFile(screenshot.versionId, screenshot.screenshotUrl);
    }

    ScreenshotModel.delete(screenshotId);
    res.json(success({ deleted: true }));
  } catch (err) {
    console.error('Screenshot delete error:', err);
    res.status(500).json(error(500, '截图删除失败'));
  }
});

// ========== Changelog/Summary Routes ==========

// GET /api/v1/versions/:id/summary - Get changelog summary for a version
router.get('/:id/summary', (req: Request, res: Response) => {
  const { id } = req.params;
  const summary = VersionSummaryModel.findByVersionId(id);

  if (!summary) {
    res.status(404).json(error(404, '变更摘要不存在'));
    return;
  }

  res.json(success(summary));
});

// POST /api/v1/versions/:id/summary - Create or update changelog summary
router.post('/:id/summary', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, features, changes, fixes, breaking, createdBy } = req.body as {
      content?: string;
      features?: string[];
      changes?: string[];
      fixes?: string[];
      breaking?: string[];
      createdBy?: string;
    };

    const existing = VersionSummaryModel.findByVersionId(id);
    let summary;

    if (existing) {
      summary = VersionSummaryModel.update(id, { content, features, changes, fixes, breaking });
    } else {
      summary = VersionSummaryModel.create({
        versionId: id,
        content: content || '',
        features: features || [],
        changes: changes || [],
        fixes: fixes || [],
        breaking: breaking || [],
        createdBy: createdBy || 'system',
      });
    }

    res.json(success(summary));
  } catch (err) {
    console.error('Summary save error:', err);
    res.status(500).json(error(500, '变更摘要保存失败'));
  }
});

// PUT /api/v1/versions/:id/summary - Update changelog summary
router.put('/:id/summary', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, features, changes, fixes, breaking } = req.body as {
      content?: string;
      features?: string[];
      changes?: string[];
      fixes?: string[];
      breaking?: string[];
    };

    const existing = VersionSummaryModel.findByVersionId(id);
    if (!existing) {
      res.status(404).json(error(404, '变更摘要不存在'));
      return;
    }

    const summary = VersionSummaryModel.update(id, { content, features, changes, fixes, breaking });
    // Also sync to Version model
    const v = versions.get(id);
    if (v && content !== undefined) {
      v.summary = content;
      v.summaryGeneratedAt = new Date().toISOString();
      v.summaryGeneratedBy = 'manual';
      v.hasSummary = true;
      versions.set(id, v);
    }
    res.json(success(summary));
  } catch (err) {
    console.error('Summary update error:', err);
    res.status(500).json(error(500, '变更摘要更新失败'));
  }
});

// DELETE /api/v1/versions/:id/summary - Delete changelog summary
router.delete('/:id/summary', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = VersionSummaryModel.delete(id);
  res.json(success({ deleted }));
});

// POST /api/v1/versions/:id/summary/generate - Generate changelog from commits via AI
router.post('/:id/summary/generate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { commitLog, branchName } = req.body as { commitLog?: string; branchName?: string };

    // Generate via AI (or fallback rule-based)
    const generated = await generateChangelogFromCommits(
      id,
      commitLog || 'feat: initial implementation\nfix: bug fixes',
      branchName
    );

    const summary = VersionSummaryModel.upsert({
      versionId: id,
      title: generated.title,
      content: generated.content,
      features: generated.features,
      fixes: generated.fixes,
      changes: generated.improvements,
      breaking: generated.breaking,
      createdBy: 'AI',
    });

    // Also save summary content to Version model for inline access
    const v = versions.get(id);
    if (v) {
      v.summary = generated.content;
      v.summaryGeneratedAt = new Date().toISOString();
      v.summaryGeneratedBy = 'AI';
      v.hasSummary = true;
      versions.set(id, v);
    }

    res.json(success(summary));
  } catch (err) {
    console.error('Changelog generation error:', err);
    res.status(500).json(error(500, '变更摘要生成失败'));
  }
});

// POST /api/v1/versions/:id/summary/refresh - Re-generate and save summary to Version model
router.post('/:id/summary/refresh', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const v = versions.get(id);
    if (!v) {
      res.status(404).json(error(404, 'Version not found'));
      return;
    }
    const { commitLog, branchName } = req.body as { commitLog?: string; branchName?: string };

    const generated = await generateChangelogFromCommits(
      id,
      commitLog || v.changedFiles?.join('\n') || '',
      branchName
    );

    const summary = VersionSummaryModel.upsert({
      versionId: id,
      title: generated.title,
      content: generated.content,
      features: generated.features,
      fixes: generated.fixes,
      changes: generated.improvements,
      breaking: generated.breaking,
      createdBy: 'AI',
    });

    // Update Version model with latest summary
    v.summary = generated.content;
    v.summaryGeneratedAt = new Date().toISOString();
    v.summaryGeneratedBy = 'AI';
    v.hasSummary = true;
    versions.set(id, v);

    res.json(success({
      ...summary,
      versionSummary: v.summary,
      versionSummaryGeneratedAt: v.summaryGeneratedAt,
      versionSummaryGeneratedBy: v.summaryGeneratedBy,
    }));
  } catch (err) {
    console.error('Summary refresh error:', err);
    res.status(500).json(error(500, '摘要刷新失败'));
  }
});

// GET /api/v1/versions/:id/summary/status — Check if summary exists
router.get('/:id/summary/status', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }
  const summary = VersionSummaryModel.findByVersionId(req.params.id);
  res.json(success({
    hasSummary: !!summary,
    generatedAt: summary?.generatedAt || null,
    generatedBy: summary?.generatedBy || null,
  }));
});

// ========== Timeline Route ==========

interface TimelineEvent {
  id: string;
  type: 'version_created' | 'screenshot_linked' | 'changelog_generated';
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
  screenshotId?: string;
  summaryId?: string;
}

// GET /api/v1/versions/:id/timeline — 获取版本变更时间线
router.get('/:id/timeline', (req: Request, res: Response) => {
  const { id: versionId } = req.params;
  const version = versions.get(versionId);
  if (!version) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  // 获取截图记录
  const screenshots = ScreenshotModel.findByVersionId(versionId);
  // 获取摘要记录
  const summary = VersionSummaryModel.findByVersionId(versionId);

  const events: TimelineEvent[] = [];

  // 版本创建 event
  events.push({
    id: `version-created-${versionId}`,
    type: 'version_created',
    title: '版本创建',
    description: `版本 ${version.version} 已创建`,
    timestamp: version.createdAt,
  });

  // 截图关联 events
  for (const shot of screenshots) {
    events.push({
      id: `screenshot-linked-${shot.id}`,
      type: 'screenshot_linked',
      title: '截图关联',
      description: `${shot.senderName}：${shot.messageContent.substring(0, 50)}...`,
      timestamp: shot.createdAt,
      actor: shot.senderName,
      screenshotId: shot.id,
    });
  }

  // 摘要生成 event
  if (summary) {
    events.push({
      id: `changelog-generated-${summary.id}`,
      type: 'changelog_generated',
      title: '变更摘要生成',
      description: `${summary.generatedBy === 'AI' ? 'AI' : '手动'}生成了包含 ${summary.features?.length || 0} 个新功能的变更摘要`,
      timestamp: summary.generatedAt,
      actor: summary.generatedBy,
      summaryId: summary.id,
    });
  }

  // 按时间倒序
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(success({
    versionId,
    version: version.version,
    events,
  }));
});

// POST /api/v1/versions/summary/batch-generate — Batch generate summaries for multiple versions
router.post('/summary/batch-generate', async (req: Request, res: Response) => {
  try {
    const { versionIds } = req.body as { versionIds: string[] };
    if (!Array.isArray(versionIds) || versionIds.length === 0) {
      res.status(400).json(error(400, 'versionIds must be a non-empty array'));
      return;
    }

    const results: { versionId: string; success: boolean; error?: string }[] = [];

    for (const id of versionIds) {
      const v = versions.get(id);
      if (!v) {
        results.push({ versionId: id, success: false, error: 'Version not found' });
        continue;
      }
      try {
        const projectPath = (v as { projectPath?: string }).projectPath ||
          path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', v.id);
        const commits = getGitLog(projectPath, { maxCount: 30, branch: v.gitTag });
        const commitText = commits.map(c => `${c.hash.slice(0, 7)} ${c.message}`).join('\n') || 'version update';
        const currentBranch = getCurrentBranch(projectPath);
        const generated = await generateChangelogFromCommits(id, commitText, currentBranch);
        VersionSummaryModel.upsert({
          versionId: id,
          title: generated.title,
          content: generated.content,
          features: generated.features,
          fixes: generated.fixes,
          changes: generated.improvements,
          breaking: generated.breaking,
          createdBy: 'AI',
        });
        results.push({ versionId: id, success: true });
      } catch (e) {
        results.push({ versionId: id, success: false, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    }

    res.json(success({ total: versionIds.length, results }));
  } catch (err) {
    console.error('Batch summary generation error:', err);
    res.status(500).json(error(500, '批量生成失败'));
  }
});

export default router;

// ========== Version Compare Routes ==========

// GET /api/v1/versions/compare — Compare two versions
router.get('/compare', async (req: Request, res: Response) => {
  const { from, to, fromId, toId } = req.query as {
    from?: string;
    to?: string;
    fromId?: string;
    toId?: string;
  };

  if (!from || !to) {
    res.status(400).json(error(400, 'from and to query parameters are required'));
    return;
  }

  try {
    const result = await compareTwoVersions(
      fromId || from,
      toId || to,
      from,
      to
    );
    res.json(success(result));
  } catch (err) {
    console.error('Version compare error:', err);
    res.status(500).json(error(500, `版本对比失败: ${err instanceof Error ? err.message : String(err)}`));
  }
});

// GET /api/v1/versions/compare/quick — Quick diff summary
router.get('/compare/quick', async (req: Request, res: Response) => {
  const { from, to, fromId, toId } = req.query as {
    from?: string;
    to?: string;
    fromId?: string;
    toId?: string;
  };

  if (!from || !to) {
    res.status(400).json(error(400, 'from and to query parameters are required'));
    return;
  }

  try {
    const result = await quickCompare(fromId || from, toId || to, from, to);
    res.json(success(result));
  } catch (err) {
    res.status(500).json(error(500, `快速对比失败: ${err instanceof Error ? err.message : String(err)}`));
  }
});

// POST /api/v1/versions/:id/bump-with-task — Bump version based on task type
router.post('/:id/bump-with-task', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { taskType, taskId, taskTitle } = req.body as {
    taskType: string;
    taskId: string;
    taskTitle?: string;
  };

  if (!taskType || !taskId) {
    res.status(400).json(error(400, 'taskType and taskId are required'));
    return;
  }

  if (!isValidSemver(v.version)) {
    res.status(400).json(error(400, `Invalid semver: ${v.version}`));
    return;
  }

  const result = performBump(v.version, { taskType, taskId, taskTitle });

  if (!result) {
    res.status(500).json(error(500, 'Bump failed'));
    return;
  }

  // Apply the bump to the version
  v.version = result.newVersion;
  v.updatedAt = new Date().toISOString();

  if (settings.autoTag && settings.tagOnStatus.includes('published')) {
    v.gitTag = makeTagName(result.newVersion, settings.tagPrefix, settings.customPrefix);
    v.gitTagCreatedAt = new Date().toISOString();
  }

  versions.set(v.id, v);

  res.json(success({
    version: v,
    bump: result,
    summary: formatBumpSummary(result),
  }));
});

// POST /api/v1/versions/:id/auto-bump — Manually trigger auto-bump (creates new bumped version)
router.post('/:id/auto-bump', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { bumpType } = req.body as { bumpType?: VersionBumpType };
  const type = bumpType || settings.bumpType;

  if (!isValidSemver(v.version)) {
    res.status(400).json(error(400, `Invalid semver: ${v.version}`));
    return;
  }

  const prevVersion = v.version;
  const newVersionStr = autoBumpVersion(v.version, type);
  const tagName = makeTagName(newVersionStr, settings.tagPrefix, settings.customPrefix);

  // Create new version record
  const newId = `v${Date.now()}`;
  const newVersionRecord: Version = {
    ...v,
    id: newId,
    version: newVersionStr,
    title: `${newVersionStr}`,
    status: 'draft',
    gitTag: tagName,
    gitTagCreatedAt: new Date().toISOString(),
    buildStatus: v.buildStatus,
    artifactUrl: v.artifactUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isMain: false,
    commitCount: v.commitCount,
    changedFiles: v.changedFiles,
  };
  versions.set(newId, newVersionRecord);

  // Create Tag record
  createTagRecord({
    name: tagName,
    versionId: newId,
    versionName: newVersionStr,
    message: `Auto-bump triggered manually (${prevVersion} → ${newVersionStr})`,
    createdBy: 'system',
    commitHash: undefined,
    annotation: undefined,
  });

  res.json(success({
    previousVersion: prevVersion,
    newVersion: newVersionRecord,
    bumpType: type,
    tagName,
    autoBumped: true,
  }));
});

// GET /api/v1/versions/:id/bump-preview — Preview what a bump would produce
router.get('/:id/bump-preview', (req: Request, res: Response) => {
  const v = versions.get(req.params.id);
  if (!v) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const { taskType } = req.query as { taskType?: string };

  if (!isValidSemver(v.version)) {
    res.status(400).json(error(400, `Invalid semver: ${v.version}`));
    return;
  }

  // Default bump types to preview
  const bumpTypes = ['patch', 'minor', 'major'] as const;

  const previews = bumpTypes.map(type => {
    const newVersion = bumpVersion(v.version, type);
    const context = taskType ? { taskType, taskId: 'preview', taskTitle: '预览' } : null;
    const changelog = context ? performBump(v.version, context) : null;

    return {
      bumpType: type,
      currentVersion: v.version,
      newVersion: newVersion || v.version,
      isDefault: taskType ? changelog?.bumpType === type : type === 'patch',
      changelog: changelog && changelog.bumpType === type ? changelog.changelog : null,
    };
  });

  res.json(success({
    currentVersion: v.version,
    taskType: taskType || null,
    previews,
  }));
});
