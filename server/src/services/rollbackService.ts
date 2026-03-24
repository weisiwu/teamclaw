/**
 * Rollback Service — Git checkout and branch management for version rollback
 * Supports: checkout to tag, checkout to branch, create rollback branch
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import {
  checkout,
  getCurrentBranch,
  createBranch,
  tagExists,
  type GitCommit,
} from './gitService.js';

export interface RollbackResult {
  success: boolean;
  previousRef: string;
  targetRef: string;
  targetType: 'tag' | 'branch' | 'commit';
  newBranch?: string;
  message: string;
  error?: string;
}

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  lastCommit?: GitCommit;
}

/**
 * Rollback to a specific tag
 */
export function rollbackToTag(
  projectPath: string,
  tagName: string,
  options: {
    createBranch?: boolean;
    branchName?: string;
  } = {}
): RollbackResult {
  if (!existsSync(join(projectPath, '.git'))) {
    return {
      success: false,
      previousRef: '',
      targetRef: tagName,
      targetType: 'tag',
      message: 'Not a git repository',
      error: 'Project is not a git repository',
    };
  }

  const previousRef = getCurrentBranch(projectPath) || 'HEAD';

  // Verify tag exists
  if (!tagExists(projectPath, tagName)) {
    return {
      success: false,
      previousRef,
      targetRef: tagName,
      targetType: 'tag',
      message: `Tag ${tagName} does not exist`,
      error: 'Tag not found',
    };
  }

  // If createBranch option is set, create a new branch pointing to the tag
  if (options.createBranch && options.branchName) {
    const branchCreated = createBranch(projectPath, options.branchName, tagName);
    if (!branchCreated) {
      return {
        success: false,
        previousRef,
        targetRef: tagName,
        targetType: 'tag',
        message: `Failed to create rollback branch ${options.branchName}`,
        error: 'Branch creation failed',
      };
    }

    return {
      success: true,
      previousRef,
      targetRef: tagName,
      targetType: 'tag',
      newBranch: options.branchName,
      message: `Created branch ${options.branchName} at tag ${tagName}`,
    };
  }

  // Direct checkout to tag
  const success = checkout(projectPath, tagName);
  if (!success) {
    return {
      success: false,
      previousRef,
      targetRef: tagName,
      targetType: 'tag',
      message: `Failed to checkout tag ${tagName}`,
      error: 'Checkout failed',
    };
  }

  return {
    success: true,
    previousRef,
    targetRef: tagName,
    targetType: 'tag',
    message: `Checked out tag ${tagName}`,
  };
}

/**
 * Rollback to a specific branch
 */
export function rollbackToBranch(
  projectPath: string,
  branchName: string,
  options: {
    createBackupBranch?: boolean;
  } = {}
): RollbackResult {
  if (!existsSync(join(projectPath, '.git'))) {
    return {
      success: false,
      previousRef: '',
      targetRef: branchName,
      targetType: 'branch',
      message: 'Not a git repository',
      error: 'Not a git repository',
    };
  }

  const previousRef = getCurrentBranch(projectPath) || 'HEAD';

  // Create backup branch of current state if requested
  if (options.createBackupBranch && previousRef) {
    const backupName = `backup/${previousRef}-${Date.now()}`;
    createBranch(projectPath, backupName, previousRef);
  }

  try {
    execFileSync('git', ['checkout', branchName], {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 30000,
    });

    return {
      success: true,
      previousRef,
      targetRef: branchName,
      targetType: 'branch',
      message: `Checked out branch ${branchName}`,
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return {
      success: false,
      previousRef,
      targetRef: branchName,
      targetType: 'branch',
      message: `Failed to checkout branch ${branchName}`,
      error: e?.message || 'Checkout failed',
    };
  }
}

/**
 * Rollback to a specific commit hash
 */
export function rollbackToCommit(
  projectPath: string,
  commitHash: string,
  options: {
    createBranch?: boolean;
    branchName?: string;
  } = {}
): RollbackResult {
  if (!existsSync(join(projectPath, '.git'))) {
    return {
      success: false,
      previousRef: '',
      targetRef: commitHash,
      targetType: 'commit',
      message: 'Not a git repository',
      error: 'Not a git repository',
    };
  }

  const previousRef = getCurrentBranch(projectPath) || 'HEAD';

  try {
    // First, create a detached branch pointing to the commit
    if (options.createBranch && options.branchName) {
      execFileSync('git', ['checkout', '-b', options.branchName!, commitHash], {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 30000,
      });

      return {
        success: true,
        previousRef,
        targetRef: commitHash,
        targetType: 'commit',
        newBranch: options.branchName,
        message: `Created branch ${options.branchName} at commit ${commitHash.slice(0, 7)}`,
      };
    }

    // Direct checkout to commit
    execFileSync('git', ['checkout', commitHash], {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 30000,
    });

    return {
      success: true,
      previousRef,
      targetRef: commitHash,
      targetType: 'commit',
      message: `Checked out commit ${commitHash.slice(0, 7)}`,
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return {
      success: false,
      previousRef,
      targetRef: commitHash,
      targetType: 'commit',
      message: `Failed to checkout commit ${commitHash.slice(0, 7)}`,
      error: e?.message || 'Checkout failed',
    };
  }
}

/**
 * Get rollback preview — shows what changed between current and target ref
 */
export function getRollbackPreview(
  projectPath: string,
  targetRef: string
): {
  targetRef: string;
  currentRef: string;
  commitsBehind: GitCommit[];
  commitsAhead: GitCommit[];
  filesChanged: string[];
  message: string;
} {
  if (!existsSync(join(projectPath, '.git'))) {
    return {
      targetRef,
      currentRef: '',
      commitsBehind: [],
      commitsAhead: [],
      filesChanged: [],
      message: 'Not a git repository',
    };
  }

  const currentRef = getCurrentBranch(projectPath) || 'HEAD';

  try {
    // Get commits that would be lost (current is ahead of target)
    const diffOutput = execFileSync(
      'git',
      ['log', '--oneline', `${targetRef}..${currentRef}`, '-50'],
      { cwd: projectPath, encoding: 'utf-8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    const commitsAhead = diffOutput
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [hash, ...msgParts] = line.split(' ');
        return {
          hash,
          shortHash: hash.slice(0, 7),
          message: msgParts.join(' '),
          author: '',
          authorEmail: '',
          date: '',
        };
      });

    // Get commits that would be gained (target is ahead of current)
    const aheadOutput = execFileSync(
      'git',
      ['log', '--oneline', `${currentRef}..${targetRef}`, '-50'],
      { cwd: projectPath, encoding: 'utf-8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    const commitsBehind = aheadOutput
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [hash, ...msgParts] = line.split(' ');
        return {
          hash,
          shortHash: hash.slice(0, 7),
          message: msgParts.join(' '),
          author: '',
          authorEmail: '',
          date: '',
        };
      });

    // Get files that differ
    let filesChanged: string[] = [];
    try {
      const filesOutput = execFileSync('git', ['diff', '--name-only', targetRef, currentRef], {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      filesChanged = filesOutput.split('\n').filter(Boolean);
    } catch {
      // No diff
    }

    const isAhead = commitsAhead.length > 0;
    const isBehind = commitsBehind.length > 0;

    let message = '';
    if (!isAhead && !isBehind) {
      message = `Current branch is already at ${targetRef}`;
    } else if (!isAhead) {
      message = `Rollback will apply ${commitsBehind.length} commit(s)`;
    } else if (!isBehind) {
      message = `Rollback will lose ${commitsAhead.length} uncommitted or unpushed commit(s)`;
    } else {
      message = `Rollback: lose ${commitsAhead.length} commit(s), gain ${commitsBehind.length} commit(s)`;
    }

    return {
      targetRef,
      currentRef,
      commitsBehind,
      commitsAhead,
      filesChanged,
      message,
    };
  } catch {
    return {
      targetRef,
      currentRef,
      commitsBehind: [],
      commitsAhead: [],
      filesChanged: [],
      message: `Unable to generate preview for ${targetRef}`,
    };
  }
}

/**
 * Get list of rollback targets (recent tags and branches)
 */
export function getRollbackTargets(
  projectPath: string,
  options: {
    maxTags?: number;
    maxBranches?: number;
  } = {}
): {
  tags: Array<{ name: string; commit: string; date: string; message?: string }>;
  branches: Array<{ name: string; isCurrent: boolean; isRemote: boolean }>;
} {
  if (!existsSync(join(projectPath, '.git'))) {
    return { tags: [], branches: [] };
  }

  const { maxTags = 20, maxBranches = 20 } = options;

  try {
    // Get tags
    const tagsOutput = execFileSync(
      'git',
      [
        'tag',
        '-l',
        '--format=%(refname:short)||%(objectname)||%(creatordate:iso)',
        `--sort=-creatordate`,
        '-n',
        String(maxTags),
      ],
      { cwd: projectPath, encoding: 'utf-8', timeout: 10000 }
    );

    const tags = tagsOutput
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [name, commit, date] = line.split('||');
        return { name: name?.trim() || '', commit: commit?.trim() || '', date: date?.trim() || '' };
      })
      .filter(t => t.name);

    // Get branches
    const branchesOutput = execFileSync(
      'git',
      ['branch', '-a', '--format=%(refname:short)||%(HEAD)', '-n', String(maxBranches)],
      { cwd: projectPath, encoding: 'utf-8', timeout: 10000 }
    );

    const branches = branchesOutput
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [name, isCurrent] = line.replace(/'/g, '').split('||');
        return {
          name: name?.trim() || '',
          isCurrent: isCurrent?.trim() === '*',
          isRemote: (name?.trim() || '').startsWith('remotes/') || false,
        };
      })
      .filter(b => b.name && !b.name.startsWith('remotes/'));

    return { tags, branches };
  } catch {
    return { tags: [], branches: [] };
  }
}
