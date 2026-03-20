/**
 * autoBump.ts — 自动版本升级服务
 * 供三处共用：build 成功、task done、手动触发
 */
import { getDb } from '../db/sqlite.js';
import { createTagRecord } from './tagService.js';
import { createTag } from './gitService.js';
import { bumpVersion as semverBump, bumpLevelFromTaskType } from './semver.js';
import { getVersionSettings } from '../routes/version.js';
import path from 'path';
import os from 'os';
/** 从 DB 插入一条 bump_history 记录 */
function insertBumpHistoryRecord(params) {
    const db = getDb();
    const id = `bh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const settings = getVersionSettings();
    db.prepare(`
    INSERT INTO bump_history (id, version_id, version_name, previous_version, new_version, bump_type, trigger_type, trigger_task_id, trigger_task_title, summary, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, params.versionId, params.versionName, params.previousVersion, params.newVersion, params.bumpType, params.triggerType, params.triggerTaskId || null, params.triggerTaskTitle || null, params.summary || null, params.createdBy || 'system', now);
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
export async function executeAutoBump(options) {
    const { versionId, currentVersion, triggerType, taskId, taskTitle, taskType, projectPath, summary: customSummary, } = options;
    const db = getDb();
    const settings = getVersionSettings();
    // 计算 bump 类型和新版本号
    let bumpType = settings.bumpType;
    let newVersion = null;
    if (taskType) {
        bumpType = bumpLevelFromTaskType(taskType);
    }
    newVersion = semverBump(currentVersion, bumpType);
    if (!newVersion) {
        newVersion = `${currentVersion}+1`; // fallback
    }
    // 构建 summary
    const triggerDesc = triggerType === 'task_done'
        ? `任务完成触发 (${taskId})`
        : triggerType === 'build_success'
            ? `构建成功触发`
            : `手动触发`;
    const computedSummary = customSummary ||
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
    let gitTagName;
    if (settings.autoTag) {
        const { makeTagName } = await import('./tagService.js');
        gitTagName = makeTagName(newVersion, settings.tagPrefix, settings.customPrefix);
        const effectiveProjectPath = projectPath ||
            path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', versionId);
        try {
            createTag(effectiveProjectPath, gitTagName, computedSummary);
            db.prepare('UPDATE versions SET tag_created = 1 WHERE id = ?').run(newVersionId);
            gitTagCreated = true;
        }
        catch (err) {
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
        }
        catch (err) {
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
export function getBumpHistory(versionId) {
    const db = getDb();
    const rows = db
        .prepare(`SELECT * FROM bump_history WHERE version_id = ? ORDER BY created_at DESC`)
        .all(versionId);
    return rows.map(rowToBumpHistoryRecord);
}
/**
 * 获取所有 bump 历史（带分页）
 */
export function getAllBumpHistory(limit = 50, offset = 0) {
    const db = getDb();
    const totalRow = db
        .prepare('SELECT COUNT(*) as cnt FROM bump_history')
        .get();
    const rows = db
        .prepare(`SELECT * FROM bump_history ORDER BY created_at DESC LIMIT ? OFFSET ?`)
        .all(limit, offset);
    return {
        records: rows.map(rowToBumpHistoryRecord),
        total: totalRow.cnt,
    };
}
function rowToBumpHistoryRecord(row) {
    return {
        id: row.id,
        versionId: row.version_id,
        versionName: row.version_name,
        previousVersion: row.previous_version,
        newVersion: row.new_version,
        bumpType: row.bump_type,
        triggerType: row.trigger_type,
        triggerTaskId: row.trigger_task_id,
        triggerTaskTitle: row.trigger_task_title,
        summary: row.summary,
        createdBy: row.created_by,
        createdAt: row.created_at,
    };
}
