/**
 * agentToVersion.ts — Agent → Code → Version wiring
 * Agent 流水线完成后，应用代码变更并触发版本管理
 */

import { eventBus, generateId } from './eventBus.js';
import { taskLifecycle } from './taskLifecycle.js';
import { parseChanges, applyChanges, commitChanges } from './codeApplicator.js';
import { executeAutoBump } from './autoBump.js';
import { query, queryOne } from '../db/pg.js';

async function getProjectPathForTask(taskId: string): Promise<string | undefined> {
  // 尝试从 task 关联的 version 查找 projectPath
  const row = await queryOne<{ projectPath: string }>(
    'SELECT projectPath FROM versions WHERE id = (SELECT versionId FROM tasks WHERE taskId = $1)',
    [taskId]
  );
  return row?.projectPath;
}

/**
 * 监听 agent:pipeline:done 事件，应用代码变更并触发版本 bump
 */
eventBus.on('agent:pipeline:done', async payload => {
  const { taskId, codeResult } = payload.data as {
    taskId: string;
    pipelineId?: string;
    result?: string;
    codeResult?: string;
  };
  const traceId = payload.traceId;

  try {
    // 1. 解析代码变更
    const llmOutput = (codeResult as string) || '';
    const changes = parseChanges(llmOutput);

    if (changes.length === 0) {
      console.log('[agentToVersion] No code changes to apply');
      eventBus.emit('version:bumped', {
        eventId: generateId('evt'),
        type: 'version:bumped',
        timestamp: new Date().toISOString(),
        traceId,
        data: { taskId, skipped: true, reason: 'no_changes' },
      });
      return;
    }

    // 2. 获取项目路径
    const projectPath = getProjectPathForTask(taskId as string);
    if (!projectPath) {
      console.warn('[agentToVersion] No projectPath found for task', taskId);
      eventBus.emit('version:bumped', {
        eventId: generateId('evt'),
        type: 'version:bumped',
        timestamp: new Date().toISOString(),
        traceId,
        data: { taskId, skipped: true, reason: 'no_project_path' },
      });
      return;
    }

    // 3. 应用代码变更
    const applyResult = await applyChanges(projectPath, changes);

    eventBus.emit('code:applied', {
      eventId: generateId('evt'),
      type: 'code:applied',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId, filesApplied: applyResult.applied.length, failed: applyResult.failed.length },
    });

    // 4. Git commit
    const task = taskLifecycle.getTask(taskId as string);
    const commitMessage = `feat: ${task?.title || 'task ' + taskId}`;
    const commitHash = await commitChanges(projectPath, commitMessage);

    eventBus.emit('code:committed', {
      eventId: generateId('evt'),
      type: 'code:committed',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId, commitHash: commitHash.commitHash },
    });

    // 5. 自动版本 bump
    const taskTitle = task?.title || '';
    const taskType = task?.tags?.[0] || 'feature';
    const versionRow = await queryOne<Record<string, unknown>>(
      'SELECT * FROM versions WHERE id = $1',
      [task?.versionId]
    );

    let bumpResult;
    if (versionRow) {
      bumpResult = await executeAutoBump({
        versionId: versionRow.id as string,
        currentVersion: versionRow.version as string,
        triggerType: 'task_done',
        taskId: taskId as string,
        taskTitle,
        taskType,
        projectPath,
      });
    } else {
      // Fallback: 使用默认版本
      bumpResult = await executeAutoBump({
        versionId: 'default',
        currentVersion: '0.0.0',
        triggerType: 'task_done',
        taskId: taskId as string,
        taskTitle,
        taskType,
        projectPath,
      });
    }

    eventBus.emit('version:bumped', {
      eventId: generateId('evt'),
      type: 'version:bumped',
      timestamp: new Date().toISOString(),
      traceId,
      data: {
        taskId,
        version: bumpResult.newVersion,
        previousVersion: bumpResult.previousVersion,
        bumpType: bumpResult.bumpType,
      },
    });
  } catch (err) {
    console.error('[agentToVersion] Failed:', err);
    eventBus.emit('task:failed', {
      eventId: generateId('evt'),
      type: 'task:failed',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId, error: (err as Error).message },
    });
  }
});
