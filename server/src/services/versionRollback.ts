/**
 * Version Rollback Service — High-level version rollback orchestration
 * Uses rollbackService for git operations, wraps with version-specific logic
 */

import {
  rollbackToTag,
  rollbackToBranch,
  rollbackToCommit,
  getRollbackTargets,
  getRollbackPreview,
  type RollbackResult,
} from './rollbackService.js';
import { getCurrentBranch } from './gitService.js';
import { existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

export interface RollbackTarget {
  version: string;
  tag: string;
  date: string;
  commitHash: string;
  type: 'tag' | 'branch' | 'commit';
}

export interface VersionRollbackResult extends RollbackResult {
  rollbackBranch?: string;
  previousVersion?: string;
  targetVersion?: string;
}

function getProjectPath(versionId: string, explicitPath?: string): string {
  return (
    explicitPath ||
    join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', versionId)
  );
}

/**
 * Execute rollback for a version to a target ref
 */
export async function executeVersionRollback(
  versionId: string,
  target: string,
  type: 'tag' | 'branch' | 'commit' = 'tag',
  options: {
    createBranch?: boolean;
    projectPath?: string;
  } = {}
): Promise<VersionRollbackResult> {
  const projectPath = getProjectPath(versionId, options.projectPath);

  let result: RollbackResult;
  if (type === 'branch') {
    result = rollbackToBranch(projectPath, target, { createBackupBranch: options.createBranch });
  } else if (type === 'commit') {
    result = rollbackToCommit(projectPath, target, {
      createBranch: options.createBranch,
      branchName: options.createBranch ? `rollback/${target}_${Date.now()}` : undefined,
    });
  } else {
    result = rollbackToTag(projectPath, target, {
      createBranch: options.createBranch,
      branchName: options.createBranch ? `rollback/${target}` : undefined,
    });
  }

  const currentVersion = await getCurrentVersionName(projectPath);

  return {
    ...result,
    targetVersion: target,
    previousVersion: currentVersion,
    rollbackBranch: result.newBranch,
  };
}

/**
 * List rollback targets for a version
 */
export async function listRollbackTargets(
  versionId: string,
  options: {
    maxTags?: number;
    maxBranches?: number;
    projectPath?: string;
  } = {}
): Promise<RollbackTarget[]> {
  const projectPath = getProjectPath(versionId, options.projectPath);
  const targets = getRollbackTargets(projectPath, {
    maxTags: options.maxTags,
    maxBranches: options.maxBranches,
  });

  const result: RollbackTarget[] = [];

  for (const tag of targets.tags) {
    result.push({
      version: tag.name,
      tag: tag.name,
      date: tag.date,
      commitHash: tag.commit,
      type: 'tag',
    });
  }

  for (const branch of targets.branches) {
    if (!branch.isCurrent) {
      result.push({
        version: branch.name,
        tag: branch.name,
        date: '',
        commitHash: '',
        type: 'branch' as const,
      });
    }
  }

  return result;
}

/**
 * Preview a rollback operation — what would change
 */
export async function previewRollback(
  versionId: string,
  targetRef: string,
  projectPath?: string
): Promise<{
  targetRef: string;
  currentRef: string;
  commitsBehind: number;
  filesChanged: string[];
  message: string;
  safe: boolean;
}> {
  const path = getProjectPath(versionId, projectPath);
  const preview = getRollbackPreview(path, targetRef);

  return {
    targetRef,
    currentRef: preview.currentRef,
    commitsBehind: preview.commitsAhead.length,
    filesChanged: preview.filesChanged,
    message: preview.message,
    safe: preview.commitsAhead.length === 0,
  };
}

/**
 * Get current version name (git tag or branch)
 */
async function getCurrentVersionName(projectPath: string): Promise<string> {
  if (!existsSync(join(projectPath, '.git'))) return 'unknown';
  return getCurrentBranch(projectPath) || 'HEAD';
}

/**
 * Check if a version is at its git tag (clean state)
 */
export function isVersionAtTag(projectPath: string, tagName: string): boolean {
  if (!existsSync(join(projectPath, '.git'))) return false;
  try {
    const currentBranch = getCurrentBranch(projectPath);
    return currentBranch === tagName;
  } catch {
    return false;
  }
}
