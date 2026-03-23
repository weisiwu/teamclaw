/**
 * trace.ts — Full-chain Trace API
 * 提供全链路追踪的查询和 SSE 实时流
 */

import { Router } from 'express';
import { eventBus, type EventPayload, type SystemEvent } from '../services/eventBus.js';
import { success, error } from '../utils/response.js';

const router = Router();

/**
 * 计算追踪链的总耗时
 */
function calculateDuration(events: EventPayload[]): number {
  if (events.length < 2) return 0;
  const first = new Date(events[0].timestamp).getTime();
  const last = new Date(events[events.length - 1].timestamp).getTime();
  return last - first;
}

/**
 * 从事件列表判断追踪状态
 */
function getTraceStatus(events: EventPayload[]): 'running' | 'completed' | 'failed' {
  const hasFailure = events.some(e => e.type === 'build:failed' || e.type === 'task:failed');
  const hasCompletion = events.some(
    e => e.type === 'build:completed' || e.type === 'notification:send'
  );
  if (hasFailure) return 'failed';
  if (hasCompletion) return 'completed';
  return 'running';
}

/**
 * GET /api/v1/traces/recent — 获取最近的追踪列表
 */
router.get('/recent', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const traces = eventBus.getRecentTraces(limit);
  res.json(
    success({
      traces: traces.map(t => ({
        traceId: t.traceId,
        eventCount: t.events.length,
        lastEvent: t.lastEvent.type,
        lastTimestamp: t.lastEvent.timestamp,
        status: getTraceStatus(t.events),
        duration: calculateDuration(t.events),
      })),
    })
  );
});

/**
 * GET /api/v1/traces/:traceId — 获取全链路追踪详情
 */
router.get('/:traceId', (req, res) => {
  const trace = eventBus.getTrace(req.params.traceId);
  if (trace.length === 0) {
    return res.status(404).json(error(404, 'Trace not found', 'TRACE_NOT_FOUND'));
  }
  res.json(
    success({
      traceId: req.params.traceId,
      events: trace,
      eventCount: trace.length,
      duration: calculateDuration(trace),
      status: getTraceStatus(trace),
    })
  );
});

/**
 * GET /api/v1/traces/:traceId/stream — SSE 实时追踪事件流
 */
router.get('/:traceId/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const traceId = req.params.traceId;

  // 立即发送已有的事件
  const existingTrace = eventBus.getTrace(traceId);
  if (existingTrace.length > 0) {
    res.write(`event: init\ndata: ${JSON.stringify(existingTrace)}\n\n`);
  }

  // 持续监听新事件
  const eventTypes: SystemEvent[] = [
    'message:received',
    'message:routed',
    'task:created',
    'task:started',
    'task:completed',
    'task:failed',
    'agent:pipeline:start',
    'agent:pipeline:done',
    'agent:stage:change',
    'code:applied',
    'code:committed',
    'version:bumped',
    'build:started',
    'build:completed',
    'build:failed',
    'notification:send',
  ];

  const onEvent = (payload: EventPayload) => {
    if (payload.traceId === traceId) {
      res.write(`event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`);
    }
  };

  eventTypes.forEach(type => eventBus.on(type, onEvent));

  // 心跳保活
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    eventTypes.forEach(type => eventBus.off(type, onEvent));
  });
});

export default router;
