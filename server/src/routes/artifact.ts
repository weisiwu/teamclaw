/**
 * Artifact Routes — List and download build artifacts
 * Artifacts are stored in project build output directories (dist/, .next/, build/)
 * and indexed in the BuildRecord's artifactPaths field.
 *
 * For this iteration: we expose artifacts from the artifactStore
 * which mirrors/copies artifacts from build output dirs.
 */

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import {
  listArtifacts,
  getArtifactInfo,
  getArtifactStream,
  importArtifactsFromDir,
  getArtifactsTotalSize,
} from '../services/artifactStore.js';
import { getBuildRecord, getLatestBuildRecord } from '../models/buildRecord.js';
import path from 'path';
import os from 'os';

const router = Router();

// Get project path for a version
function getVersionProjectPath(versionId: string): string {
  const projectsDir = process.env.TEAMCLAW_PROJECTS_DIR || path.join(os.homedir(), '.openclaw', 'projects');
  return path.join(projectsDir, versionId);
}

// MIME type map
const MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.tgz': 'application/gzip',
  '.exe': 'application/octet-stream',
  '.apk': 'application/octet-stream',
  '.ipa': 'application/octet-stream',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.md': 'text/markdown',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// GET /api/v1/artifacts/:versionId — List all artifacts for a version (from latest build)
router.get('/:versionId', (req: Request, res: Response) => {
  const { versionId } = req.params;
  const { buildNumber } = req.query as { buildNumber?: string };

  if (!versionId) {
    return res.status(400).json(error(400, 'versionId is required'));
  }

  // Get build record
  let record;
  if (buildNumber) {
    const records = require('../models/buildRecord').getBuildRecordsByVersion(versionId, 100);
    record = records.find((r: any) => r.buildNumber === parseInt(buildNumber));
    if (!record) {
      return res.status(404).json(error(404, 'Build not found'));
    }
  } else {
    record = getLatestBuildRecord(versionId);
  }

  if (!record) {
    return res.status(404).json(error(404, 'No builds found for this version'));
  }

  if (!record.artifactPaths || record.artifactPaths.length === 0) {
    return res.json(success({
      versionId,
      buildNumber: record.buildNumber,
      buildId: record.id,
      artifacts: [],
      totalSize: 0,
      message: 'No artifacts found for this build',
    }));
  }

  // Build project path (use projectPath from record or reconstruct)
  const projectPath = record.projectPath || getVersionProjectPath(versionId);

  // Collect artifact info from the build record's artifactPaths
  const fs = require('fs');
  const artifacts = record.artifactPaths
    .map((artifactPath: string) => {
      const fullPath = path.join(projectPath, artifactPath);
      try {
        if (!fs.existsSync(fullPath)) return null;
        const stats = fs.statSync(fullPath);
        return {
          path: artifactPath,
          name: path.basename(artifactPath),
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          url: `/api/v1/artifacts/${versionId}/${record.buildNumber}?file=${encodeURIComponent(artifactPath)}`,
          type: getMimeType(artifactPath),
          modifiedAt: stats.mtime.toISOString(),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const totalSize = artifacts.reduce((sum: number, a: any) => sum + a.size, 0);

  res.json(success({
    versionId,
    buildId: record.id,
    buildNumber: record.buildNumber,
    buildStatus: record.status,
    projectPath,
    artifacts,
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
  }));
});

// GET /api/v1/artifacts/:versionId/:buildNumber — Get build number's artifacts
router.get('/:versionId/:buildNumber', (req: Request, res: Response) => {
  const { versionId, buildNumber } = req.params;
  const { file } = req.query as { file?: string };

  const records = require('../models/buildRecord').getBuildRecordsByVersion(versionId, 100);
  const record = records.find((r: any) => r.buildNumber === parseInt(buildNumber));

  if (!record) {
    return res.status(404).json(error(404, 'Build not found'));
  }

  // If file param provided, download the specific artifact
  if (file) {
    const projectPath = record.projectPath || getVersionProjectPath(versionId);
    const artifactPath = decodeURIComponent(file);
    const fullPath = path.join(projectPath, artifactPath);

    // Security: ensure path is within project directory (prevent traversal)
    if (!fullPath.startsWith(projectPath)) {
      return res.status(403).json(error(403, 'Invalid artifact path'));
    }

    const fs = require('fs');
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json(error(404, 'Artifact file not found'));
    }

    const mimeType = getMimeType(artifactPath);
    const fileName = path.basename(artifactPath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fs.statSync(fullPath).size);

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
    return;
  }

  // No file param: return artifact list for this build
  if (!record.artifactPaths || record.artifactPaths.length === 0) {
    return res.json(success({
      versionId,
      buildId: record.id,
      buildNumber: record.buildNumber,
      artifacts: [],
      totalSize: 0,
    }));
  }

  const projectPath = record.projectPath || getVersionProjectPath(versionId);
  const fs = require('fs');

  const artifacts = record.artifactPaths
    .map((artifactPath: string) => {
      const fullPath = path.join(projectPath, artifactPath);
      try {
        if (!fs.existsSync(fullPath)) return null;
        const stats = fs.statSync(fullPath);
        return {
          path: artifactPath,
          name: path.basename(artifactPath),
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          url: `/api/v1/artifacts/${versionId}/${record.buildNumber}?file=${encodeURIComponent(artifactPath)}`,
          type: getMimeType(artifactPath),
          modifiedAt: stats.mtime.toISOString(),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const totalSize = artifacts.reduce((sum: number, a: any) => sum + a.size, 0);

  res.json(success({
    versionId,
    buildId: record.id,
    buildNumber: record.buildNumber,
    buildStatus: record.status,
    projectPath,
    artifacts,
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
  }));
});

// POST /api/v1/artifacts/:versionId/:buildNumber/import — Import artifacts to artifactStore
router.post('/:versionId/:buildNumber/import', async (req: Request, res: Response) => {
  const { versionId, buildNumber } = req.params;

  const records = require('../models/buildRecord').getBuildRecordsByVersion(versionId, 100);
  const record = records.find((r: any) => r.buildNumber === parseInt(buildNumber));

  if (!record) {
    return res.status(404).json(error(404, 'Build not found'));
  }

  if (!record.artifactPaths || record.artifactPaths.length === 0) {
    return res.status(400).json(error(400, 'No artifacts to import'));
  }

  const projectPath = record.projectPath || getVersionProjectPath(versionId);
  const buildOutputDirs = ['.next', 'dist', 'build', 'out', '.output'];

  let importedCount = 0;
  for (const dir of buildOutputDirs) {
    const dirPath = path.join(projectPath, dir);
    const fs = require('fs');
    if (fs.existsSync(dirPath)) {
      try {
        const count = await importArtifactsFromDir(versionId, record.buildNumber.toString(), dirPath);
        importedCount += count;
      } catch {
        // Skip dirs that fail
      }
    }
  }

  res.json(success({
    importedCount,
    message: `Imported ${importedCount} artifact files to artifact store`,
  }));
});

// Helper
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
