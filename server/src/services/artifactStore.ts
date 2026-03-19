/**
 * Artifact Store — Store and serve build artifacts
 * Stores artifacts in ~/.openclaw/artifacts/{projectName}/{version}/
 * Serves downloads via static file serving
 */

import { existsSync, mkdirSync, writeFileSync, readdirSync, rmSync, statSync, createReadStream } from 'fs';
import { join, basename, extname, dirname } from 'path';

// Global artifacts root: ~/.openclaw/artifacts
function getArtifactsRoot(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
  return join(home, '.openclaw', 'artifacts');
}

function getProjectArtifactsDir(projectName: string, version: string): string {
  return join(getArtifactsRoot(), projectName, version);
}

function getArtifactFilePath(projectName: string, version: string, artifactPath: string): string {
  return join(getArtifactsRoot(), projectName, version, artifactPath);
}

/**
 * Store a build artifact file
 */
export async function storeArtifact(
  projectName: string,
  version: string,
  artifactPath: string,
  data: Buffer | string
): Promise<{ path: string; size: number; url: string }> {
  const dir = getProjectArtifactsDir(projectName, version);
  const filePath = join(dir, artifactPath);

  // Ensure directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Ensure parent dir exists
  const parentDir = dirname(filePath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  if (typeof data === 'string') {
    writeFileSync(filePath, data);
  } else {
    writeFileSync(filePath, data);
  }

  const stats = statSync(filePath);
  const url = `/artifacts/${projectName}/${version}/${artifactPath}`;

  return {
    path: filePath,
    size: stats.size,
    url,
  };
}

/**
 * Copy an artifact from a source path to the store
 */
export async function copyArtifact(
  projectName: string,
  version: string,
  artifactPath: string,
  sourcePath: string
): Promise<{ path: string; size: number; url: string } | null> {
  try {
    if (!existsSync(sourcePath)) return null;

    const destPath = getArtifactFilePath(projectName, version, artifactPath);
    const destDir = dirname(destPath);

    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    copyFileSync(sourcePath, destPath);

    const stats = statSync(destPath);
    const url = `/artifacts/${projectName}/${version}/${artifactPath}`;

    return {
      path: destPath,
      size: stats.size,
      url,
    };
  } catch {
    return null;
  }
}

/**
 * List all artifacts for a project/version
 */
export function listArtifacts(projectName: string, version: string): Array<{
  path: string;
  name: string;
  size: number;
  url: string;
  type: string;
}> {
  const dir = getProjectArtifactsDir(projectName, version);

  if (!existsSync(dir)) return [];

  function scanDir(dirPath: string, basePath: string): Array<{
    path: string;
    name: string;
    size: number;
    url: string;
    type: string;
  }> {
    const results: Array<{
      path: string;
      name: string;
      size: number;
      url: string;
      type: string;
    }> = [];

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        const relPath = fullPath.replace(basePath + '/', '');

        if (entry.isDirectory()) {
          results.push(...scanDir(fullPath, basePath));
        } else if (entry.isFile()) {
          const stats = statSync(fullPath);
          const type = getArtifactType(entry.name);
          results.push({
            path: relPath,
            name: entry.name,
            size: stats.size,
            url: `/artifacts/${projectName}/${version}/${relPath}`,
            type,
          });
        }
      }
    } catch {
      // Not readable
    }

    return results;
  }

  return scanDir(dir, dir);
}

/**
 * Get a single artifact info
 */
export function getArtifactInfo(projectName: string, version: string, artifactPath: string): {
  path: string;
  name: string;
  size: number;
  url: string;
  type: string;
  exists: boolean;
} | null {
  const filePath = getArtifactFilePath(projectName, version, artifactPath);

  if (!existsSync(filePath)) return null;

  const stats = statSync(filePath);
  return {
    path: filePath,
    name: basename(artifactPath),
    size: stats.size,
    url: `/artifacts/${projectName}/${version}/${artifactPath}`,
    type: getArtifactType(artifactPath),
    exists: true,
  };
}

/**
 * Delete artifacts for a project/version
 */
export function deleteArtifacts(projectName: string, version: string): boolean {
  const dir = getProjectArtifactsDir(projectName, version);

  if (!existsSync(dir)) return true;

  try {
    rmSync(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a single artifact
 */
export function deleteArtifact(projectName: string, version: string, artifactPath: string): boolean {
  const filePath = getArtifactFilePath(projectName, version, artifactPath);

  if (!existsSync(filePath)) return true;

  try {
    rmSync(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the file path for static file serving (express static middleware)
 */
export function getArtifactsRootDir(): string {
  return getArtifactsRoot();
}

/**
 * Get a readable stream for an artifact
 */
export function getArtifactStream(
  projectName: string,
  version: string,
  artifactPath: string
): { stream: ReturnType<typeof createReadStream>; path: string; size: number } | null {
  const filePath = getArtifactFilePath(projectName, version, artifactPath);

  if (!existsSync(filePath)) return null;

  const stats = statSync(filePath);
  return {
    stream: createReadStream(filePath),
    path: filePath,
    size: stats.size,
  };
}

function getArtifactType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const typeMap: Record<string, string> = {
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
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
    '.zip': 'application/zip',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.tgz': 'application/gzip',
    '.exe': 'application/octet-stream',
    '.apk': 'application/vnd.android.arrowbase',
    '.ipa': 'application/octet-stream',
    '.pdf': 'application/pdf',
  };
  return typeMap[ext] || 'application/octet-stream';
}

/**
 * Get total size of all artifacts for a project/version
 */
export function getArtifactsTotalSize(projectName: string, version: string): number {
  const artifacts = listArtifacts(projectName, version);
  return artifacts.reduce((sum, a) => sum + a.size, 0);
}

/**
 * Copy all artifacts from a build output directory
 */
export async function importArtifactsFromDir(
  projectName: string,
  version: string,
  sourceDir: string
): Promise<number> {
  const destDir = getProjectArtifactsDir(projectName, version);

  if (!existsSync(sourceDir)) return 0;

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  let count = 0;

  function copyDir(src: string, dest: string) {
    try {
      const entries = readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);

        if (entry.isDirectory()) {
          copyDir(srcPath, destPath);
        } else if (entry.isFile()) {
          copyFileSync(srcPath, destPath);
          count++;
        }
      }
    } catch {
      // Skip unreadable dirs
    }
  }

  copyDir(sourceDir, destDir);
  return count;
}
