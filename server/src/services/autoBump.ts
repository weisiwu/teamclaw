/**
 * autoBump.ts — 自动版本升级服务
 * 供三处共用：build 成功、task done、手动触发
 */

import { getDb } from '../db/sqlite.js';
import { performBump, formatBumpSummary } from './versionBump.js';
import { createTagRecord } from './tagService.js';
import { createTag } from './gitService.js';
import { bumpVersion as semverBump, SemverLevel, bumpLevelFromTaskType } from './semver.js';
import { getVersionSettings } from '../routes/version.js';
import path from 'path';
import os from 'os';

export type TriggerType = 'task_done' | 'build_success' | 'manual';

export interface BumpHistoryRecord {
  id: string;
  versionId: string;
  versionName: string;
  previousVersion: string;
  newVersion: string;
  bumpType: SemverLevel;
  triggerType: TriggerType;
  triggerTaskId?: string;
  triggerTaskTitle?: string;
  summary?: string;
  createdBy: string;
  createdAt: string;
}

export interface ExecuteAutoBumpOptions {
  versionId: string;
  currentVersion: string;
  triggerType: TriggerType;
  taskId?: string;
  taskTitle?: string;
  taskType?: string;
  projectPath?: string;
  summary?: string;
}

/** 从 DB 插入一条 bump_history 记录 */
function insertBumpHistoryRecord(params: {
  versionId: string;
  versionName: string;
  previousVersion: string;
  newVersion: string;
  bumpType: SemverLevel;
  triggerType: TriggerType;
  triggerTaskId?: string;
  triggerTaskTitle?: string;
  summary?: string;
  createdBy?: string;
}): BumpHistoryRecord {
  const db = getDb();
  const id = `bh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const settings = getVersionSettings();

  db.prepare(`
    INSERT INTO bump_history (id, version_id, version_name, previous_version, new_version, bump_type, trigger_type, trigger_task_id, trigger_task_title, summary, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.versionId,
    params.versionName,
    params.previousVersion,
    params.newVersion,
    params.bumpType,
    params.triggerType,
    params.triggerTaskId || null,
    params.triggerTaskTitle || null,
    params.summary || null,
    params.createdBy || 'system',
    now
  );

  return {
    id,
    versionId: params.versionId,
    versionName: params.versionName,
    previousVersion: params.previousVersion,
    newVersion: params.newVersion,
    bumpType: params.bumpType,
    triggerType: params.triggerType,
    triggerTaskId: params.triggerTaskId,
    triggerTaskTitle: params.triggerTaskTitle,
    summary: params.summary,
    createdBy: params.createdBy || 'system',
    createdAt: now,
  };
}

/**
 * 执行自动版本升级（供 build / task-done / manual 三处共用）
 * 1. 计算新版本号
 * 2. 插入新版本记录
 * 3. 创建 git tag
 * 4. 记录 bump_history
 * 5. 返回结果
 */
export async function executeAutoBump(
  options: ExecuteAutoBumpOptions
): Promise<{
  success: boolean;
  previousVersion: string;
  newVersion: string;
  newVersionId: string;
  bumpType: SemverLevel;
  gitTag?: string;
  bumpHistoryId: string;
  summary: string;
}> {
  const {
    versionId,
    currentVersion,
    triggerType,
    taskId,
    taskTitle,
    taskType,
    projectPath,
    summary: customSummary,
  } = options;

  const db = getDb();
  const settings = getVersionSettings();

  // 计算 bump 类型和新版本号
  let bumpType: SemverLevel = settings.bumpType;
  let newVersion: string | null = null;

  if (taskType) {
    bumpType = bumpLevelFromTaskType(taskType);
  }

  newVersion = semverBump(currentVersion, bumpType);
  if (!newVersion) {
    newVersion = `${currentVersion}+1`; // fallback
  }

  // 构建 summary
  const triggerDesc =
    triggerType === 'task_done'
      ? `任务完成触发 (${taskId})`
      : triggerType === 'build_success'
      ? `构建成功触发`
      : `手动触发`;

  const computedSummary =
    customSummary ||
    `${triggerDesc}，执行 ${bumpType} bump：${currentVersion} → ${newVersion}`;

  // 插入新版本记录
  const newVersionId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO versions (id, version, branch, summary, created_by, created_at, build_status, tag_created)
    VALUES (?, ?, 'main', ?, 'system', ?, 'success', 0)
  `).run(newVersionId, newVersion, computedSummary, now);

  // 创建 git tag
  let gitTagCreated = false;
  let gitTagName: string | undefined;

  if (settings.autoTag) {
    const { makeTagName } = await import('./tagService.js');
    gitTagName = makeTagName(newVersion, settings.tagPrefix, settings.customPrefix);
    const effectiveProjectPath =
      projectPath ||
      path.join(
        process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects',
        versionId
      );
    try {
      createTag(effectiveProjectPath, gitTagName, computedSummary);
      db.prepare('UPDATE versions SET tag_created = 1 WHERE id = ?').run(newVersionId);
      gitTagCreated = true;
    } catch (err) {
      console.warn('[autoBump] Failed to create git tag:', err);
    }
  }

  // 创建 Tag 记录
  if (gitTagCreated && gitTagName) {
    try {
      createTagRecord({
        name: gitTagName,
        versionId: newVersionId,
        versionName: newVersion,
        message: computedSummary,
        createdBy: 'system',
        commitHash: undefined,
        annotation: computedSummary,
      });
    } catch (err) {
      console.warn('[autoBump] Failed to create tag record:', err);
    }
  }

  // 记录 bump_history
  const historyRecord = insertBumpHistoryRecord({
    versionId: newVersionId,
    versionName: newVersion,
    previousVersion: currentVersion,
    newVersion,
    bumpType,
    triggerType,
    triggerTaskId: taskId,
    triggerTaskTitle: taskTitle,
    summary: computedSummary,
    createdBy: 'system',
  });

  return {
    success: true,
    previousVersion: currentVersion,
    newVersion,
    newVersionId,
    bumpType,
    gitTag: gitTagCreated ? gitTagName : undefined,
    bumpHistoryId: historyRecord.id,
    summary: computedSummary,
  };
}

/**
 * 获取某个版本的 bump 历史
 */
export function getBumpHistory(versionId: string): BumpHistoryRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM bump_history WHERE version_id = ? ORDER BY created_at DESC`
    )
    .all(versionId) as Array<Record<string, unknown>>;

  return rows.map(rowToBumpHistoryRecord);
}

/**
 * 获取所有 bump 历史（带分页）
 */
export function getAllBumpHistory(
  limit = 50,
  offset = 0
): { records: BumpHistoryRecord[]; total: number } {
  const db = getDb();
  const totalRow = db
    .prepare('SELECT COUNT(*) as cnt FROM bump_history')
    .get() as { cnt: number };
  const rows = db
    .prepare(
      `SELECT * FROM bump_history ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Array<Record<string, unknown>>;

  return {
    records: rows.map(rowToBumpHistoryRecord),
    total: totalRow.cnt,
  };
}

function rowToBumpHistoryRecord(row: Record<string, unknown>): BumpHistoryRecord {
  return {
    id: row.id as string,
    versionId: row.version_id as string,
    versionName: row.version_name as string,
    previousVersion: row.previous_version as string,
    newVersion: row.new_version as string,
    bumpType: row.bump_type as SemverLevel,
    triggerType: row.trigger_type as TriggerType,
    triggerTaskId: row.trigger_task_id as string | undefined,
    triggerTaskTitle: row.trigger_task_title as string | undefined,
    summary: row.summary as string | undefined,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}
