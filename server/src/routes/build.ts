/**
 * Build Routes — Build history, details, and rebuild triggers
 */

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import {
  createBuildRecord,
  getBuildRecord,
  getBuildRecordsByVersion,
  getLatestBuildRecord,
  updateBuildRecord,
  cancelBuildRecord,
  getBuildRecordStats,
  BuildRecord,
} from '../models/buildRecord.js';
import { runBuild } from '../services/buildService.js';
import { rollbackToCommit, rollbackToTag } from '../services/rollbackService.js';
import {
  createPackage,
  getPackageInfo,
  deletePackage,
  listPackages,
  getPackageFilePath,
  type PackageFormat,
} from '../services/packageService.js';
import { getCurrentBranch } from '../services/gitService.js';
import path from 'path';
import os from 'os';

const router = Router();

// ========== Helpers ==========

function getVersionProjectPath(versionId: string, explicitPath?: string): string {
  return explicitPath ||
    path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', versionId);
}

// ========== Routes ==========

// GET /api/v1/builds — List all builds (admin)
router.get('/', (req: Request, res: Response) => {
  const { versionId, limit = '20', offset = '0' } = req.query as {
    versionId?: string;
    limit?: string;
    offset?: string;
  };

  if (!versionId) {
    return res.status(400).json(error(400, 'versionId is required'));
  }

  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offsetNum = parseInt(offset) || 0;

  const records = getBuildRecordsByVersion(versionId, limitNum + offsetNum);
  const paginated = records.slice(offsetNum, offsetNum + limitNum);

  res.json(success({
    builds: paginated,
    total: records.length,
    limit: limitNum,
    offset: offsetNum,
  }));
});

// GET /api/v1/builds/latest/:versionId — Get latest build for a version
router.get('/latest/:versionId', (req: Request, res: Response) => {
  const record = getLatestBuildRecord(req.params.versionId);
  if (!record) {
    return res.status(404).json(error(404, 'No builds found for this version'));
  }
  res.json(success(record));
});

// GET /api/v1/builds/:id — Get build details
router.get('/:id', (req: Request, res: Response) => {
  const record = getBuildRecord(req.params.id);
  if (!record) {
    return res.status(404).json(error(404, 'Build record not found'));
  }
  res.json(success(record));
});

// POST /api/v1/builds — Trigger a new build for a version
router.post('/', async (req: Request, res: Response) => {
  const { versionId, versionName, versionNumber, buildCommand, projectPath, triggeredBy = 'system', triggerType = 'manual' } = req.body as {
    versionId: string;
    versionName: string;
    versionNumber: string;
    buildCommand?: string;
    projectPath?: string;
    triggeredBy?: string;
    triggerType?: 'manual' | 'auto' | 'rebuild';
  };

  if (!versionId || !versionName || !versionNumber) {
    return res.status(400).json(error(400, 'versionId, versionName, versionNumber are required'));
  }

  const resolvedPath = getVersionProjectPath(versionId, projectPath);

  // Create pending record
  const record = createBuildRecord({
    versionId,
    versionName,
    versionNumber,
    buildCommand,
    projectPath: resolvedPath,
    triggeredBy,
    triggerType,
    status: 'building',
    startedAt: new Date().toISOString(),
  });

  // Respond immediately (async build)
  res.json(success({ buildId: record.id, status: 'building' }));

  // Run build async
  try {
    const result = await runBuild(resolvedPath, { buildCommand });

    updateBuildRecord(record.id, {
      status: result.success ? 'success' : 'failed',
      completedAt: new Date().toISOString(),
      duration: result.duration,
      exitCode: result.exitCode,
      command: result.command,
      output: result.output.slice(-100000),
      errorOutput: result.errorOutput.slice(-50000),
      artifactCount: result.artifacts.length,
      artifactPaths: result.artifacts.map(a => a.path),
      artifactUrl: result.artifacts.length > 0 ? `/artifacts/${versionId}/${versionNumber}` : undefined,
    });
  } catch (err: unknown) {
    updateBuildRecord(record.id, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      errorOutput: err instanceof Error ? err.message : String(err),
    });
  }
});

// POST /api/v1/builds/:id/cancel — Cancel a running build
router.post('/:id/cancel', (req: Request, res: Response) => {
  const record = getBuildRecord(req.params.id);
  if (!record) {
    return res.status(404).json(error(404, 'Build record not found'));
  }
  if (record.status !== 'building' && record.status !== 'pending') {
    return res.status(400).json(error(400, 'Can only cancel pending or building builds'));
  }

  const updated = cancelBuildRecord(req.params.id);
  res.json(success(updated));
});

// POST /api/v1/builds/:id/rebuild — Rebuild using the same config as a previous build
router.post('/:id/rebuild', async (req: Request, res: Response) => {
  const original = getBuildRecord(req.params.id);
  if (!original) {
    return res.status(404).json(error(404, 'Build record not found'));
  }

  if (!['success', 'failed'].includes(original.status)) {
    return res.status(400).json(error(400, 'Can only rebuild from completed builds'));
  }

  const { triggeredBy = 'system' } = req.body as { triggeredBy?: string };

  // Create pending rebuild record
  const rebuild = createBuildRecord({
    versionId: original.versionId,
    versionName: original.versionName,
    versionNumber: original.versionNumber,
    buildCommand: original.buildCommand,
    projectPath: original.projectPath,
    projectType: original.projectType,
    triggeredBy,
    triggerType: 'rebuild',
    status: 'building',
    startedAt: new Date().toISOString(),
    parentBuildId: original.id,
  });

  res.json(success({ buildId: rebuild.id, status: 'building' }));

  const resolvedPath = getVersionProjectPath(original.versionId, original.projectPath);

  try {
    const result = await runBuild(resolvedPath, { buildCommand: original.buildCommand });

    updateBuildRecord(rebuild.id, {
      status: result.success ? 'success' : 'failed',
      completedAt: new Date().toISOString(),
      duration: result.duration,
      exitCode: result.exitCode,
      command: result.command,
      output: result.output.slice(-100000),
      errorOutput: result.errorOutput.slice(-50000),
      artifactCount: result.artifacts.length,
      artifactPaths: result.artifacts.map(a => a.path),
      artifactUrl: result.artifacts.length > 0 ? `/artifacts/${original.versionId}/${original.versionNumber}` : undefined,
    });
  } catch (err: unknown) {
    updateBuildRecord(rebuild.id, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      errorOutput: err instanceof Error ? err.message : String(err),
    });
  }
});

// GET /api/v1/builds/:id/output — Get full build output
router.get('/:id/output', (req: Request, res: Response) => {
  const record = getBuildRecord(req.params.id);
  if (!record) {
    return res.status(404).json(error(404, 'Build record not found'));
  }
  res.json(success({
    output: record.output || '',
    errorOutput: record.errorOutput || '',
    exitCode: record.exitCode,
    duration: record.duration,
  }));
});

// GET /api/v1/builds/stats/:versionId — Build statistics for a version
router.get('/stats/:versionId', (req: Request, res: Response) => {
  const stats = getBuildRecordStats(req.params.versionId);
  res.json(success(stats));
});

// POST /api/v1/builds/:id/rollback — Rollback project to the state at a specific build
router.post('/:id/rollback', (req: Request, res: Response) => {
  const record = getBuildRecord(req.params.id);
  if (!record) {
    return res.status(404).json(error(404, 'Build record not found'));
  }

  const { target, targetType = 'commit', createBranch = false } = req.body as {
    target?: string;
    targetType?: 'tag' | 'branch' | 'commit';
    createBranch?: boolean;
  };

  const projectPath = getVersionProjectPath(record.versionId, record.projectPath);

  // If no target specified, use the tag associated with this build's version
  let effectiveTarget = target;
  let effectiveType = targetType;

  if (!effectiveTarget) {
    // Try to use git tag for this version as rollback target
    const tagName = `v${record.versionNumber}`;
    effectiveTarget = tagName;
    effectiveType = 'tag';
  }

  let result;
  const previousRef = getCurrentBranch(projectPath) || 'HEAD';

  if (effectiveType === 'tag') {
    result = rollbackToTag(projectPath, effectiveTarget, {
      createBranch,
      branchName: createBranch ? `rollback/build-${record.buildNumber}-${Date.now()}` : undefined,
    });
  } else {
    result = rollbackToCommit(projectPath, effectiveTarget, {
      createBranch,
      branchName: createBranch ? `rollback/build-${record.buildNumber}-${Date.now()}` : undefined,
    });
  }

  // Update build record with rollback metadata
  updateBuildRecord(record.id, {
    rollbackCount: (record.rollbackCount || 0) + 1,
    lastRollbackAt: new Date().toISOString(),
    lastRollbackCommit: effectiveTarget,
    rollbackFromCommit: previousRef,
  });

  res.json(success({
    ...result,
    buildId: record.id,
    buildNumber: record.buildNumber,
    rollbackCount: (record.rollbackCount || 0) + 1,
  }));
});

// GET /api/v1/builds/:id/package — Get package info for a build
router.get('/:id/package', (req: Request, res: Response) => {
  const record = getBuildRecord(req.params.id);
  if (!record) {
    return res.status(404).json(error(404, 'Build record not found'));
  }

  const { format = 'zip' } = req.query as { format?: string };
  const safeFormat = ['zip', 'tar.gz', 'tar'].includes(format) ? format as 'zip' | 'tar.gz' | 'tar' : 'zip';

  const info = getPackageInfo(record.versionId, record.buildNumber, safeFormat);
  res.json(success(info));
});

// POST /api/v1/builds/:id/package — Create a package from a build's artifacts
router.post('/:id/package', async (req: Request, res: Response) => {
  const record = getBuildRecord(req.params.id);
  if (!record) {
    return res.status(404).json(error(404, 'Build record not found'));
  }

  if (record.status !== 'success') {
    return res.status(400).json(error(400, 'Can only package successful builds'));
  }

  if (!record.artifactPaths || record.artifactPaths.length === 0) {
    return res.status(400).json(error(400, 'No artifacts found in this build'));
  }

  const { format = 'zip' } = req.body as { format?: string };
  const safeFormat = ['zip', 'tar.gz', 'tar'].includes(format) ? format as 'zip' | 'tar.gz' | 'tar' : 'zip';

  const projectPath = getVersionProjectPath(record.versionId, record.projectPath);

  // Check if package already exists
  const existing = getPackageInfo(record.versionId, record.buildNumber, safeFormat);
  if (existing.exists) {
    return res.json(success({ ...existing, cached: true }));
  }

  const result = await createPackage(
    record.versionId,
    record.buildNumber,
    projectPath,
    record.artifactPaths,
    safeFormat
  );

  if (!result.success) {
    return res.status(500).json(error(500, result.error || 'Failed to create package'));
  }

  // Update build record with package info
  updateBuildRecord(record.id, {
    packagePath: result.packagePath,
    packageUrl: result.packageUrl,
    packageFormat: result.format,
    packageSize: result.size,
    packageCreatedAt: new Date().toISOString(),
  });

  res.json(success({
    ...result,
    cached: false,
    packageUrl: result.packageUrl,
  }));
});

// GET /api/v1/builds/:id/package/download — Download the package file
router.get('/:id/package/download', (req: Request, res: Response) => {
  const record = getBuildRecord(req.params.id);
  if (!record) {
    return res.status(404).json(error(404, 'Build record not found'));
  }

  const { format = 'zip' } = req.query as { format?: string };
  const safeFormat = ['zip', 'tar.gz', 'tar'].includes(format) ? format as 'zip' | 'tar.gz' | 'tar' : 'zip';

  const packagePath = getPackageFilePath(record.versionId, record.buildNumber, safeFormat);
  const fs = require('fs');

  if (!fs.existsSync(packagePath)) {
    return res.status(404).json(error(404, 'Package not found. Please create it first via POST /builds/:id/package'));
  }

  const stats = fs.statSync(packagePath);
  const fileName = `build-${record.buildNumber}.${safeFormat === 'tar.gz' ? 'tar.gz' : safeFormat}`;
  const mimeType = safeFormat === 'zip' ? 'application/zip'
    : safeFormat === 'tar.gz' ? 'application/gzip'
    : 'application/x-tar';

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', stats.size);

  const stream = fs.createReadStream(packagePath);
  stream.pipe(res);
});

// DELETE /api/v1/builds/:id/package — Delete a package
router.delete('/:id/package', (req: Request, res: Response) => {
  const record = getBuildRecord(req.params.id);
  if (!record) {
    return res.status(404).json(error(404, 'Build record not found'));
  }

  const { format = 'zip' } = req.query as { format?: string };
  const safeFormat = ['zip', 'tar.gz', 'tar'].includes(format) ? format as 'zip' | 'tar.gz' | 'tar' : 'zip';

  const deleted = deletePackage(record.versionId, record.buildNumber, safeFormat);
  res.json(success({ deleted }));
});

// GET /api/v1/builds/packages/:versionId — List all packages for a version
router.get('/packages/:versionId', (req: Request, res: Response) => {
  const packages = listPackages(req.params.versionId);
  res.json(success(packages));
});

export default router;
