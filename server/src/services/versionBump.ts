/**
 * versionBump.ts — Task-type-aware version bump service
 * Determines and executes version bumps based on task metadata
 */

import { bumpVersion, bumpLevelFromTaskType, SemverLevel, parseSemver } from './semver.js';

export interface TaskBumpContext {
  taskType: string;
  taskId: string;
  taskTitle?: string;
  projectId?: string;
}

export interface BumpResult {
  previousVersion: string;
  newVersion: string;
  bumpType: SemverLevel;
  taskType: string;
  autoBump: boolean;
  changelog: BumpChangelog;
}

export interface BumpChangelog {
  features: string[];
  fixes: string[];
  improvements: string[];
  breaking: string[];
  docs: string[];
}

/**
 * Determine bump level from task metadata
 */
export function determineBumpLevel(context: TaskBumpContext): SemverLevel {
  return bumpLevelFromTaskType(context.taskType);
}

/**
 * Execute a version bump
 */
export function executeBump(currentVersion: string, bumpType: SemverLevel): string | null {
  return bumpVersion(currentVersion, bumpType);
}

/**
 * Generate a changelog entry from task metadata
 */
export function generateBumpChangelog(context: TaskBumpContext): BumpChangelog {
  const type = context.taskType.toLowerCase();
  const title = context.taskTitle || '';
  const taskId = context.taskId;

  const entry = `[${taskId}] ${title}`.trim();

  const changelog: BumpChangelog = {
    features: [],
    fixes: [],
    improvements: [],
    breaking: [],
    docs: [],
  };

  if (/\bfeat|feature|新功能|新增\b/.test(type)) {
    changelog.features.push(entry);
  } else if (/\bfix|bugfix|修复|bug\b/.test(type)) {
    changelog.fixes.push(entry);
  } else if (/\bimprov|优化|改进|enhance\b/.test(type)) {
    changelog.improvements.push(entry);
  } else if (/\bbreak|破坏|重大重构\b/.test(type)) {
    changelog.breaking.push(entry);
  } else if (/\bdoc|文档\b/.test(type)) {
    changelog.docs.push(entry);
  } else {
    changelog.improvements.push(entry);
  }

  return changelog;
}

/**
 * Full bump operation: determine level + execute + generate changelog
 */
export function performBump(
  currentVersion: string,
  context: TaskBumpContext
): BumpResult | null {
  const parsed = parseSemver(currentVersion);
  if (!parsed) return null;

  const bumpType = determineBumpLevel(context);
  const newVersion = executeBump(currentVersion, bumpType);

  if (!newVersion) return null;

  const changelog = generateBumpChangelog(context);

  return {
    previousVersion: currentVersion,
    newVersion,
    bumpType,
    taskType: context.taskType,
    autoBump: true,
    changelog,
  };
}

/**
 * Format bump result as human-readable string
 */
export function formatBumpSummary(result: BumpResult): string {
  const lines: string[] = [
    `版本升级: ${result.previousVersion} → ${result.newVersion}`,
    `Bump 类型: ${result.bumpType} (基于任务类型: ${result.taskType})`,
  ];

  if (result.changelog.features.length > 0) {
    lines.push(`✨ 新功能 (${result.changelog.features.length}):`);
    result.changelog.features.forEach(f => lines.push(`  - ${f}`));
  }
  if (result.changelog.fixes.length > 0) {
    lines.push(`🐛 修复 (${result.changelog.fixes.length}):`);
    result.changelog.fixes.forEach(f => lines.push(`  - ${f}`));
  }
  if (result.changelog.improvements.length > 0) {
    lines.push(`🔧 改进 (${result.changelog.improvements.length}):`);
    result.changelog.improvements.forEach(i => lines.push(`  - ${i}`));
  }
  if (result.changelog.breaking.length > 0) {
    lines.push(`⚠️ 破坏性变更 (${result.changelog.breaking.length}):`);
    result.changelog.breaking.forEach(b => lines.push(`  - ${b}`));
  }

  return lines.join('\n');
}
