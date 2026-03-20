/**
 * Package Service — Create downloadable packages (zip/tar.gz) from build artifacts
 */

import archiver from 'archiver';
import { createWriteStream, createReadStream, existsSync, statSync, readdirSync } from 'fs';
import { join, basename, extname, dirname } from 'path';
import { Readable, PassThrough } from 'stream';

const ARCHIVE_ROOT = join(process.env.HOME || '/tmp', '.openclaw', 'packages');

export type PackageFormat = 'zip' | 'tar.gz' | 'tar';

export interface PackageResult {
  success: boolean;
  packagePath: string;
  packageUrl: string;
  format: PackageFormat;
  size: number;
  fileCount: number;
  error?: string;
}

export interface PackageInfo {
  exists: boolean;
  packagePath: string;
  packageUrl: string;
  format: PackageFormat;
  size?: number;
  sizeFormatted?: string;
  createdAt?: string;
  fileCount?: number;
}

function getPackageDir(versionId: string): string {
  const dir = join(ARCHIVE_ROOT, versionId);
  return dir;
}

export function getPackageFilePath(versionId: string, buildNumber: number, format: PackageFormat): string {
  const dir = getPackageDir(versionId);
  const ext = format === 'tar.gz' ? 'tar.gz' : format;
  return join(dir, `build-${buildNumber}.${ext}`);
}

function getPackageUrl(versionId: string, buildNumber: number, format: PackageFormat): string {
  const ext = format === 'tar.gz' ? 'tar.gz' : format;
  return `/packages/${versionId}/build-${buildNumber}.${ext}`;
}

/**
 * Create a package from build artifacts
 */
export async function createPackage(
  versionId: string,
  buildNumber: number,
  projectPath: string,
  artifactPaths: string[],
  format: PackageFormat = 'zip'
): Promise<PackageResult> {
  const { mkdirSync, existsSync: fsExistsSync } = require('fs');
  const fs = require('fs');

  const packageDir = getPackageDir(versionId);
  if (!fsExistsSync(packageDir)) {
    mkdirSync(packageDir, { recursive: true });
  }

  const packagePath = getPackageFilePath(versionId, buildNumber, format);

  return new Promise((resolve) => {
    const output = createWriteStream(packagePath);
    let fileCount = 0;

    // Determine archive format
    let archive;
    if (format === 'zip') {
      archive = archiver('zip', { zlib: { level: 6 } });
    } else {
      // tar.gz or tar
      archive = archiver('tar', { gzip: format === 'tar.gz', gzipLevel: 6 });
    }

    output.on('close', () => {
      resolve({
        success: true,
        packagePath,
        packageUrl: getPackageUrl(versionId, buildNumber, format),
        format,
        size: archive.pointer(),
        fileCount,
      });
    });

    archive.on('error', (err: Error) => {
      resolve({
        success: false,
        packagePath,
        packageUrl: '',
        format,
        size: 0,
        fileCount: 0,
        error: err.message,
      });
    });

    archive.on('entry', () => {
      fileCount++;
    });

    archive.pipe(output);

    // Add each artifact file to the archive
    for (const artifactRelPath of artifactPaths) {
      const fullPath = join(projectPath, artifactRelPath);
      if (!fsExistsSync(fullPath)) continue;

      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          archive.directory(fullPath, basename(artifactRelPath));
        } else {
          archive.file(fullPath, { name: artifactRelPath });
        }
      } catch {
        // Skip files that can't be accessed
      }
    }

    // If no artifacts, add a manifest file
    if (fileCount === 0) {
      const manifest = JSON.stringify({
        versionId,
        buildNumber,
        createdAt: new Date().toISOString(),
        artifacts: artifactPaths,
        message: 'No artifacts found in build output',
      }, null, 2);
      archive.append(manifest, { name: 'manifest.json' });
    }

    archive.finalize();
  });
}

/**
 * Get package info (does not create)
 */
export function getPackageInfo(versionId: string, buildNumber: number, format: PackageFormat): PackageInfo {
  const fs = require('fs');
  const packagePath = getPackageFilePath(versionId, buildNumber, format);
  const exists = existsSync(packagePath);

  if (!exists) {
    return {
      exists: false,
      packagePath,
      packageUrl: getPackageUrl(versionId, buildNumber, format),
      format,
    };
  }

  const stats = statSync(packagePath);
  return {
    exists: true,
    packagePath,
    packageUrl: getPackageUrl(versionId, buildNumber, format),
    format,
    size: stats.size,
    sizeFormatted: formatBytes(stats.size),
    createdAt: stats.mtime.toISOString(),
    fileCount: 0, // unknown without reading archive
  };
}

/**
 * Delete a package
 */
export function deletePackage(versionId: string, buildNumber: number, format: PackageFormat): boolean {
  const fs = require('fs');
  const packagePath = getPackageFilePath(versionId, buildNumber, format);
  if (!existsSync(packagePath)) return false;
  try {
    fs.unlinkSync(packagePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * List all packages for a version
 */
export function listPackages(versionId: string): PackageInfo[] {
  const fs = require('fs');
  const packageDir = getPackageDir(versionId);
  if (!existsSync(packageDir)) return [];

  const formats: PackageFormat[] = ['zip', 'tar.gz', 'tar'];
  const results: PackageInfo[] = [];

  try {
    const files = readdirSync(packageDir);
    for (const file of files) {
      const fullPath = join(packageDir, file);
      const stat = statSync(fullPath);
      if (!stat.isFile()) continue;

      for (const format of formats) {
        const expectedExt = format === 'tar.gz' ? '.tar.gz' : `.${format}`;
        if (file.endsWith(expectedExt)) {
          const buildNumMatch = file.match(/build-(\d+)/);
          const bn = buildNumMatch ? parseInt(buildNumMatch[1]) : 0;
          results.push({
            exists: true,
            packagePath: fullPath,
            packageUrl: getPackageUrl(versionId, bn, format),
            format,
            size: stat.size,
            sizeFormatted: formatBytes(stat.size),
            createdAt: stat.mtime.toISOString(),
            fileCount: 0,
          });
          break;
        }
      }
    }
  } catch {
    // Return empty
  }

  return results;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
