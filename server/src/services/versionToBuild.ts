/**
 * versionToBuild.ts — Version → Build → Notification wiring
 * 版本 bump 后自动触发构建，构建完成后发送通知
 */

import { eventBus, generateId } from './eventBus.js';
import { taskLifecycle } from './taskLifecycle.js';
import { taskMemory } from './taskMemory.js';
import { buildService } from './buildService.js';
import { changelogGenerator } from './changelogGenerator.js';
import { getDb } from '../db/sqlite.js';

function getProjectPathForTask(taskId: string): string | undefined {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT projectPath FROM versions WHERE id = (SELECT versionId FROM tasks WHERE taskId = ?)'
    )
    .get(taskId) as { projectPath: string } | undefined;
  return row?.projectPath;
}

/**
 * 监听 version:bumped 事件，自动触发构建
 */
eventBus.on('version:bumped', async payload => {
  const { taskId, version, previousVersion } = payload.data as {
    taskId: string;
    version?: string;
    previousVersion?: string;
    skipped?: boolean;
    reason?: string;
  };
  const traceId = payload.traceId;

  // 如果被跳过（如无变更），不触发构建
  if ((payload.data as Record<string, unknown>).skipped) {
    return;
  }

  const projectPath = getProjectPathForTask(taskId as string);
  if (!projectPath) {
    console.warn('[versionToBuild] No projectPath found for task', taskId);
    return;
  }

  eventBus.emit('build:started', {
    eventId: generateId('evt'),
    type: 'build:started',
    timestamp: new Date().toISOString(),
    traceId,
    data: { taskId, version },
  });

  try {
    const buildResult = await buildService.build(projectPath, {});

    // 生成 AI Changelog
    let changelogText = '';
    try {
      const changelog = await changelogGenerator.generateAIChangelog(version as string, {
        projectPath,
        maxCommits: 10,
      });
      changelogText = [
        '## Features\n' + changelog.features.map(f => `- ${f}`).join('\n'),
        '## Fixes\n' + changelog.fixes.map(f => `- ${f}`).join('\n'),
        '## Improvements\n' + changelog.improvements.map(i => `- ${i}`).join('\n'),
      ]
        .filter(s => !s.includes('undefined'))
        .join('\n\n');
    } catch {
      changelogText = `Build ${buildResult.success ? 'succeeded' : 'failed'}`;
    }

    if (buildResult.success) {
      eventBus.emit('build:completed', {
        eventId: generateId('evt'),
        type: 'build:completed',
        timestamp: new Date().toISOString(),
        traceId,
        data: {
          taskId,
          version,
          previousVersion,
          success: true,
          artifacts: buildResult.artifacts.length,
          duration: buildResult.duration,
          changelog: changelogText,
        },
      });
    } else {
      eventBus.emit('build:failed', {
        eventId: generateId('evt'),
        type: 'build:failed',
        timestamp: new Date().toISOString(),
        traceId,
        data: { taskId, version, error: buildResult.errorOutput || 'Build failed' },
      });
    }
  } catch (err) {
    eventBus.emit('build:failed', {
      eventId: generateId('evt'),
      type: 'build:failed',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId, version, error: (err as Error).message },
    });
  }
});

/**
 * 监听 build:completed 事件，发送通知到原始群聊
 */
eventBus.on('build:completed', async payload => {
  const { taskId, version, changelog } = payload.data as {
    taskId: string;
    version?: string;
    success?: boolean;
    artifacts?: number;
    duration?: number;
    changelog?: string;
  };
  const traceId = payload.traceId;

  try {
    // 1. 获取消息来源通道（从 trace 中查找原始消息）
    const trace = eventBus.getTrace(traceId);
    const originalMessage = trace.find(t => t.type === 'message:received');
    const channel = (originalMessage?.data.channel as string) || 'web';
    const groupId = originalMessage?.data.groupId as string | undefined;

    // 2. 构建通知内容
    const task = taskLifecycle.getTask(taskId as string);
    const notification = [
      `✅ 任务完成！`,
      `📋 任务：${task?.title || taskId}`,
      `🏷️ 版本：${version}`,
      changelog ? `📝 变更：\n${changelog}` : '',
      `📦 产物：${payload.data.artifacts || 0} 个`,
    ]
      .filter(Boolean)
      .join('\n');

    // 3. 发送到原始通道
    if (groupId) {
      try {
        const { channelAdapter } = await import('./channelAdapter.js');
        await channelAdapter.send(channel, groupId, notification);
      } catch {
        // channelAdapter.send 可能不存在，降级处理
        console.log('[versionToBuild] Notification:', notification);
      }
    }

    eventBus.emit('notification:send', {
      eventId: generateId('evt'),
      type: 'notification:send',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId, channel, groupId, sent: !!groupId },
    });

    // 4. 更新任务状态并记忆化
    if (task) {
      await taskLifecycle.transition(taskId as string, 'done');
      try {
        await taskMemory.onTaskCompleted(task);
      } catch {
        // 记忆化失败不影响主流程
      }
    }
  } catch (err) {
    console.error('[versionToBuild] Failed to send notification:', err);
  }
});

/**
 * 监听 build:failed 事件，发送错误通知
 */
eventBus.on('build:failed', async payload => {
  const { taskId, version, error } = payload.data as {
    taskId: string;
    version?: string;
    error?: string;
  };
  const traceId = payload.traceId;

  try {
    const trace = eventBus.getTrace(traceId);
    const originalMessage = trace.find(t => t.type === 'message:received');
    const channel = (originalMessage?.data.channel as string) || 'web';
    const groupId = originalMessage?.data.groupId as string | undefined;

    const task = taskLifecycle.getTask(taskId as string);
    const notification = [
      `❌ 构建失败`,
      `📋 任务：${task?.title || taskId}`,
      `🏷️ 版本：${version}`,
      `🔴 错误：${error}`,
    ].join('\n');

    if (groupId) {
      try {
        const { channelAdapter } = await import('./channelAdapter.js');
        await channelAdapter.send(channel, groupId, notification);
      } catch {
        console.log('[versionToBuild] Build failed notification:', notification);
      }
    }

    if (task) {
      await taskLifecycle.transition(taskId as string, 'failed');
    }
  } catch (err) {
    console.error('[versionToBuild] Failed to send build failure notification:', err);
  }
});
