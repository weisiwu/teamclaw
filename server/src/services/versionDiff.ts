/**
 * Version Diff Service — Compare two versions at the file level using git diff
 * Provides unified diff output and statistics between version tags/refs
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface FileDiffEntry {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  insertions: number;
  deletions: number;
  diff?: string; // unified diff output
}

export interface VersionDiff {
  fromRef: string;
  toRef: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: FileDiffEntry[];
}

export interface VersionDiffSummary {
  fromRef: string;
  toRef: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  addedFiles: number;
  modifiedFiles: number;
  deletedFiles: number;
}

function parseDiffLine(
  line: string
): { path: string; status: FileDiffEntry['status']; insertions: number; deletions: number } | null {
  // git diff --stat format: filename | +-count
  const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*\+(\d+)\s*-(\d+)\s*$/);
  if (!match) return null;

  const rawPath = match[1].trim();
  const insertions = parseInt(match[2]);
  const deletions = parseInt(match[4]);

  let status: FileDiffEntry['status'] = 'modified';
  let path = rawPath;

  if (rawPath.startsWith('new file mode') || (insertions > 0 && deletions === 0)) {
    status = 'added';
  } else if (rawPath.startsWith('deleted file mode') || (insertions === 0 && deletions > 0)) {
    status = 'deleted';
  } else if (rawPath.includes(' => ')) {
    status = 'renamed';
    path = rawPath.split(' => ').pop() || rawPath;
  }

  return { path, status, insertions, deletions };
}

/**
 * Get diff statistics between two refs
 */
export function getVersionDiffSummary(
  projectPath: string,
  fromRef: string,
  toRef: string
): VersionDiffSummary {
  if (!existsSync(join(projectPath, '.git'))) {
    return {
      fromRef,
      toRef,
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      addedFiles: 0,
      modifiedFiles: 0,
      deletedFiles: 0,
    };
  }

  try {
    const output = execSync(`git diff --stat ${fromRef}..${toRef}`, {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 30000,
    });

    let filesChanged = 0;
    let insertions = 0;
    let deletions = 0;
    let addedFiles = 0;
    let modifiedFiles = 0;
    let deletedFiles = 0;

    for (const line of output.split('\n')) {
      if (!line.trim()) continue;

      // Last line is the summary: "N files changed, N insertions(+), N deletions(-)"
      const summaryMatch = line.match(
        /(\d+)\s+files? changed[,\s]*(\d+)\s+ insertions?\(\+\)[,\s]*(\d+)\s+ deletions?\(-?\)/
      );
      if (summaryMatch) {
        filesChanged = parseInt(summaryMatch[1]);
        insertions = parseInt(summaryMatch[2]);
        deletions = parseInt(summaryMatch[3]);
        break;
      }

      const parsed = parseDiffLine(line);
      if (parsed) {
        filesChanged++;
        insertions += parsed.insertions;
        deletions += parsed.deletions;
        if (parsed.status === 'added') addedFiles++;
        else if (parsed.status === 'deleted') deletedFiles++;
        else modifiedFiles++;
      }
    }

    return {
      fromRef,
      toRef,
      filesChanged,
      insertions,
      deletions,
      addedFiles,
      modifiedFiles,
      deletedFiles,
    };
  } catch {
    return {
      fromRef,
      toRef,
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      addedFiles: 0,
      modifiedFiles: 0,
      deletedFiles: 0,
    };
  }
}

/**
 * Get detailed file-level diff between two refs
 */
export function getVersionFileDiff(
  projectPath: string,
  fromRef: string,
  toRef: string
): FileDiffEntry[] {
  if (!existsSync(join(projectPath, '.git'))) return [];

  try {
    const output = execSync(`git diff --numstat ${fromRef}..${toRef}`, {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 30000,
    });

    const files: FileDiffEntry[] = [];
    for (const line of output.split('\n')) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      if (parts.length < 3) continue;

      const insertions = parts[0] === '-' ? 0 : parseInt(parts[0]) || 0;
      const deletions = parts[1] === '-' ? 0 : parseInt(parts[1]) || 0;
      const filePath = parts[2];

      let status: FileDiffEntry['status'] = 'modified';
      if (insertions > 0 && deletions === 0) status = 'added';
      else if (insertions === 0 && deletions > 0) status = 'deleted';

      files.push({ path: filePath, status, insertions, deletions });
    }

    return files;
  } catch {
    return [];
  }
}

/**
 * Get full unified diff for a specific file between two refs
 */
export function getFileUnifiedDiff(
  projectPath: string,
  fromRef: string,
  toRef: string,
  filePath: string
): string {
  if (!existsSync(join(projectPath, '.git'))) return '';

  try {
    const output = execSync(`git diff ${fromRef}..${toRef} -- "${filePath}"`, {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 30000,
    });
    return output;
  } catch {
    return '';
  }
}

/**
 * Full version diff with both summary and detailed file list
 */
export function diffTwoVersions(projectPath: string, fromRef: string, toRef: string): VersionDiff {
  const summary = getVersionDiffSummary(projectPath, fromRef, toRef);
  const files = getVersionFileDiff(projectPath, fromRef, toRef);

  return {
    fromRef,
    toRef,
    filesChanged: summary.filesChanged,
    insertions: summary.insertions,
    deletions: summary.deletions,
    files: files.map(f => ({
      ...f,
      diff:
        f.status !== 'added' ? getFileUnifiedDiff(projectPath, fromRef, toRef, f.path) : undefined,
    })),
  };
}

/**
 * Get list of commits between two refs
 */
export function getCommitsBetween(
  projectPath: string,
  fromRef: string,
  toRef: string
): Array<{
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}> {
  if (!existsSync(join(projectPath, '.git'))) return [];

  try {
    const output = execSync(
      `git log --format="%H||%h||%s||%an||%ad" --date=iso ${fromRef}..${toRef}`,
      { cwd: projectPath, encoding: 'utf-8', timeout: 30000 }
    );

    return output
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [hash, shortHash, message, author, date] = line.split('||');
        return { hash, shortHash, message, author, date };
      });
  } catch {
    return [];
  }
}
