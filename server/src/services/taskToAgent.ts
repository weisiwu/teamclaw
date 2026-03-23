/**
 * taskToAgent.ts — Task → Agent wiring
 * 监听 task:created 事件，自动触发 Agent 流水线
 */

import { eventBus, generateId } from './eventBus.js';
import { taskLifecycle } from './taskLifecycle.js';
import { createPipeline, executePipeline } from './agentPipeline.js';

/**
 * 监听 task:created 事件，自动触发 Agent 流水线
 */
eventBus.on('task:created', async payload => {
  const { taskId, title } = payload.data as { taskId: string; title: string };
  const traceId = payload.traceId;

  try {
    // 更新任务状态为 running
    await taskLifecycle.transition(taskId, 'running');

    eventBus.emit('agent:pipeline:start', {
      eventId: generateId('evt'),
      type: 'agent:pipeline:start',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId },
    });

    // 创建并执行 Agent 协作流水线
    const pipeline = await createPipeline(taskId, title);
    const result = await executePipeline(pipeline.id);

    eventBus.emit('agent:pipeline:done', {
      eventId: generateId('evt'),
      type: 'agent:pipeline:done',
      timestamp: new Date().toISOString(),
      traceId,
      data: {
        taskId,
        pipelineId: pipeline.id,
        result: result.status,
        codeResult: result.codeResult,
      },
    });
  } catch (err) {
    console.error('[taskToAgent] Pipeline failed:', err);
    eventBus.emit('task:failed', {
      eventId: generateId('evt'),
      type: 'task:failed',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId, error: (err as Error).message },
    });
  }
});
