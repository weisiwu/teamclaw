/**
 * autoBumpOnTaskDone.ts
 * 当 Task status → done 时，若关联 Version autoBump=true，自动执行版本升级
 */

import { taskLifecycle } from '../services/taskLifecycle.js';
import { Task, TaskStatus } from '../models/task.js';
import { executeAutoBump } from '../services/autoBump.js';
import { getDb } from '../db/sqlite.js';

/**
 * 注册 auto-bump hook 到 taskLifecycle
 */
export function registerAutoBumpHook(): void {
  taskLifecycle.onStatusChange(async (task: Task, oldStatus: TaskStatus, newStatus: TaskStatus) => {
    // 只处理 done 状态变更
    if (newStatus !== 'done') return;

    // 查找关联的 Version
    if (!task.versionId) {
      console.debug(`[autoBump] Task ${task.taskId} has no linked versionId, skipping`);
      return;
    }

    const db = getDb();
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(task.versionId) as
      | Record<string, unknown>
      | undefined;

    if (!row) {
      console.warn(`[autoBump] Version ${task.versionId} not found for task ${task.taskId}`);
      return;
    }

    // 获取全局 autoBump 设置
    const autoBumpSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('version.autoBump') as
      | { value: string }
      | undefined;

    const autoBumpEnabled = autoBumpSetting ? autoBumpSetting.value === 'true' : true; // 默认开启

    if (!autoBumpEnabled) {
      console.debug(`[autoBump] autoBump is disabled globally, skipping`);
      return;
    }

    try {
      console.log(
        `[autoBump] Task ${task.taskId} done, triggering auto-bump for version ${task.versionId}`
      );

      await executeAutoBump({
        versionId: task.versionId,
        currentVersion: row.version as string,
        triggerType: 'task_done',
        taskId: task.taskId,
        taskTitle: task.title,
        taskType: task.tags?.[0] || 'feature',
        projectPath: row.projectPath as string | undefined,
      });

      console.log(
        `[autoBump] Successfully bumped version ${row.version} after task ${task.taskId} done`
      );
    } catch (err) {
      console.error(`[autoBump] Failed to auto-bump version ${task.versionId}:`, err);
    }
  });

  console.log('[autoBump] Auto-bump on task done hook registered');
}
