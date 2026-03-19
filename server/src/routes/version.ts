import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { ScreenshotModel } from '../models/screenshot.js';
import { VersionSummaryModel } from '../models/versionSummary.js';
import { saveScreenshot, deleteScreenshotFile } from '../services/fileStorage.js';
import { generateChangelogFromCommits } from '../services/changelogGenerator.js';

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
  const data = list.slice(start, start + pageSize);

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
  res.json(success(v));
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

// POST /api/v1/versions/:id/bump — 手动 bump
router.post('/:id/bump', (req: Request, res: Response) => {
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
  }

  versions.set(v.id, v);
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

    res.json(success(summary));
  } catch (err) {
    console.error('Changelog generation error:', err);
    res.status(500).json(error(500, '变更摘要生成失败'));
  }
});

export default router;
