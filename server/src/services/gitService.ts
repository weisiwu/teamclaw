/**
 * Git Service — Git operations for version management
 * Handles: git log, tag creation, branch listing, current branch, commit diff
 */

import { execSync, exec } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: string;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
}

export interface GitTag {
  name: string;
  commit: string;
  date: string;
  message?: string;
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

function execGit(cwd: string, args: string[]): string {
  try {
    return execSync('git ' + args.join(' '), {
      cwd,
      encoding: 'utf-8',
      timeout: 30000,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; stderr?: string };
    throw new Error(`Git command failed: ${e?.message || e?.stderr || 'unknown error'}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _execGitAsync(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    exec('git ' + args.join(' '), { cwd, encoding: 'utf-8', timeout: 30000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

/**
 * Get commit history for a directory or specific tag/branch
 */
export function getGitLog(
  cwd: string,
  options: {
    maxCount?: number;
    tag?: string;
    branch?: string;
    since?: string;
  } = {}
): GitCommit[] {
  const { maxCount = 50, tag, branch, since } = options;

  if (!existsSync(join(cwd, '.git'))) {
    return [];
  }

  const ref = tag || branch || 'HEAD';
  const args = [
    'log',
    ref,
    `--max-count=${maxCount}`,
    '--pretty=format:%H||%h||%s||%an||%ae||%aI',
    '--shortstat',
  ];

  if (since) {
    args.push(`--since=${since}`);
  }

  try {
    const output = execGit(cwd, args);
    const lines = output.split('\n').filter(Boolean);
    const commits: GitCommit[] = [];

    for (const line of lines) {
      if (line.includes('||')) {
        const parts = line.split('||');
        if (parts.length >= 6) {
          const [hash, shortHash, message, author, authorEmail, date] = parts;
          commits.push({ hash, shortHash, message, author, authorEmail, date });
        }
      } else if (line.includes('file') || line.includes('insertion') || line.includes('deletion')) {
        // This is a --shortstat line
        const lastCommit = commits[commits.length - 1];
        if (lastCommit) {
          const filesMatch = line.match(/(\d+) file/);
          const insMatch = line.match(/(\d+) insertion/);
          const delMatch = line.match(/(\d+) deletion/);
          if (filesMatch) lastCommit.filesChanged = parseInt(filesMatch[1]);
          if (insMatch) lastCommit.insertions = parseInt(insMatch[1]);
          if (delMatch) lastCommit.deletions = parseInt(delMatch[1]);
        }
      }
    }

    return commits;
  } catch {
    return [];
  }
}

/**
 * Get list of all tags
 */
export function getTags(cwd: string): GitTag[] {
  if (!existsSync(join(cwd, '.git'))) return [];

  try {
    const output = execGit(cwd, ['tag', '-l', '--format=%(refname:short)||%(objectname)||%(creatordate:iso)', '--sort=-creatordate']);
    const lines = output.split('\n').filter(Boolean);
    return lines.map(line => {
      const parts = line.split('||');
      return {
        name: parts[0] || '',
        commit: parts[1] || '',
        date: parts[2] || '',
      };
    }).filter(t => t.name);
  } catch {
    return [];
  }
}

/**
 * Create a git tag
 */
export function createTag(cwd: string, tagName: string, message?: string): boolean {
  if (!existsSync(join(cwd, '.git'))) return false;

  try {
    if (message) {
      execGit(cwd, ['tag', '-a', tagName, '-m', message]);
    } else {
      execGit(cwd, ['tag', tagName]);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a git tag
 */
export function deleteTag(cwd: string, tagName: string): boolean {
  if (!existsSync(join(cwd, '.git'))) return false;

  try {
    execGit(cwd, ['tag', '-d', tagName]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of branches
 */
export function getBranches(cwd: string): GitBranch[] {
  if (!existsSync(join(cwd, '.git'))) return [];

  try {
    const output = execGit(cwd, ['branch', '-a', '--format=%(refname:short)||%(HEAD)']);
    const lines = output.split('\n').filter(Boolean);
    return lines.map(line => {
      const parts = line.split('||');
      const name = parts[0]?.trim() || '';
      const isCurrent = parts[1]?.trim() === '*';
      return {
        name,
        isCurrent,
        isRemote: name.startsWith('remotes/') || name.startsWith('origin/'),
      };
    }).filter(b => b.name);
  } catch {
    return [];
  }
}

/**
 * Get current branch name
 */
export function getCurrentBranch(cwd: string): string {
  if (!existsSync(join(cwd, '.git'))) return '';

  try {
    const output = execGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
    return output.trim();
  } catch {
    return '';
  }
}

/**
 * Create a new branch
 */
export function createBranch(cwd: string, branchName: string, baseRef?: string): boolean {
  if (!existsSync(join(cwd, '.git'))) return false;

  try {
    if (baseRef) {
      execGit(cwd, ['checkout', '-b', branchName, baseRef]);
    } else {
      execGit(cwd, ['checkout', '-b', branchName]);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Checkout a specific tag or branch
 */
export function checkout(cwd: string, ref: string): boolean {
  if (!existsSync(join(cwd, '.git'))) return false;

  try {
    execGit(cwd, ['checkout', ref]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get diff stats between two refs
 */
export function getDiffStats(cwd: string, fromRef: string, toRef: string): { files: string[]; insertions: number; deletions: number } {
  if (!existsSync(join(cwd, '.git'))) {
    return { files: [], insertions: 0, deletions: 0 };
  }

  try {
    const output = execGit(cwd, ['diff', '--stat', `${fromRef}..${toRef}`]);
    const lines = output.split('\n');
    const files: string[] = [];
    let insertions = 0;
    let deletions = 0;

    for (const line of lines) {
      const match = line.match(/^\s*(.+?)\s*\|\s*\d+/);
      if (match) files.push(match[1].trim());

      const insMatch = line.match(/(\d+)\s+insertion/);
      const delMatch = line.match(/(\d+)\s+deletion/);
      if (insMatch) insertions += parseInt(insMatch[1]);
      if (delMatch) deletions += parseInt(delMatch[1]);
    }

    return { files, insertions, deletions };
  } catch {
    return { files: [], insertions: 0, deletions: 0 };
  }
}

/**
 * Check if a tag exists
 */
export function tagExists(cwd: string, tagName: string): boolean {
  if (!existsSync(join(cwd, '.git'))) return false;

  try {
    execGit(cwd, ['rev-parse', tagName]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the commit hash for a tag
 */
export function getTagCommit(cwd: string, tagName: string): string {
  if (!existsSync(join(cwd, '.git'))) return '';

  try {
    const output = execGit(cwd, ['rev-parse', tagName]);
    return output.trim();
  } catch {
    return '';
  }
}

/**
 * Get list of commits between two refs
 */
export function getCommitsBetween(cwd: string, fromRef: string, toRef: string): GitCommit[] {
  if (!existsSync(join(cwd, '.git'))) return [];

  try {
    const output = execGit(cwd, [
      'log',
      `${fromRef}..${toRef}`,
      '--pretty=format:%H||%h||%s||%an||%ae||%aI',
    ]);
    const lines = output.split('\n').filter(Boolean);
    return lines.map(line => {
      const parts = line.split('||');
      if (parts.length >= 6) {
        const [hash, shortHash, message, author, authorEmail, date] = parts;
        return { hash, shortHash, message, author, authorEmail, date };
      }
      return { hash: '', shortHash: '', message: '', author: '', authorEmail: '', date: '' };
    }).filter(c => c.hash);
  } catch {
    return [];
  }
}
