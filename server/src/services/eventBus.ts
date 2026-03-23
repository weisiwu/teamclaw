/**
 * eventBus.ts — System Event Bus
 * 模块间通信的事件总线，替代直接函数调用，实现松耦合
 */

import { EventEmitter } from 'events';

export type SystemEvent =
  | 'message:received'
  | 'message:routed'
  | 'task:created'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'agent:pipeline:start'
  | 'agent:pipeline:done'
  | 'agent:stage:change'
  | 'code:applied'
  | 'code:committed'
  | 'version:bumped'
  | 'build:started'
  | 'build:completed'
  | 'build:failed'
  | 'notification:send';

export interface EventPayload {
  eventId: string;
  type: SystemEvent;
  timestamp: string;
  traceId: string;
  data: Record<string, unknown>;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

class SystemEventBus extends EventEmitter {
  private traceMap: Map<string, EventPayload[]> = new Map();

  emit(event: SystemEvent, payload: EventPayload): boolean {
    const trace = this.traceMap.get(payload.traceId) || [];
    trace.push(payload);
    this.traceMap.set(payload.traceId, trace);
    return super.emit(event, payload);
  }

  /**
   * 获取完整追踪链（调试用）
   */
  getTrace(traceId: string): EventPayload[] {
    return this.traceMap.get(traceId) || [];
  }

  /**
   * 获取最近的追踪列表
   */
  getRecentTraces(
    limit: number = 20
  ): Array<{ traceId: string; events: EventPayload[]; lastEvent: EventPayload }> {
    const traces: Array<{ traceId: string; events: EventPayload[]; lastEvent: EventPayload }> = [];
    for (const [traceId, events] of this.traceMap.entries()) {
      if (events.length > 0) {
        traces.push({ traceId, events, lastEvent: events[events.length - 1] });
      }
    }
    // 按最新时间排序
    traces.sort(
      (a, b) =>
        new Date(b.lastEvent.timestamp).getTime() - new Date(a.lastEvent.timestamp).getTime()
    );
    return traces.slice(0, limit);
  }
}

export const eventBus = new SystemEventBus();

export { generateId };
