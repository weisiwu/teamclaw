'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Activity,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Bell,
  GitBranch,
  Package,
  Bot,
  MessageSquare,
  FileCode,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

// ============ System Health Types ============

interface ServiceStatus {
  status: string;
  latency?: number;
  error?: string;
}

interface HealthData {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    postgres: ServiceStatus;
    redis: ServiceStatus;
    chromadb: ServiceStatus;
  };
  uptime: number;
}

// ============ Trace Types ============

type EventType =
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

interface TraceEvent {
  eventId: string;
  type: EventType;
  timestamp: string;
  traceId: string;
  data: Record<string, unknown>;
}

interface TraceInfo {
  traceId: string;
  eventCount: number;
  lastEvent: string;
  lastTimestamp: string;
  status: 'running' | 'completed' | 'failed';
  duration: number;
}

// ============ Event Icon Mapping ============

const EVENT_ICONS: Record<string, React.ReactNode> = {
  'message:received': <MessageSquare className="w-4 h-4" />,
  'message:routed': <MessageSquare className="w-4 h-4" />,
  'task:created': <PlayCircle className="w-4 h-4" />,
  'task:started': <PlayCircle className="w-4 h-4" />,
  'task:completed': <CheckCircle2 className="w-4 h-4" />,
  'task:failed': <XCircle className="w-4 h-4" />,
  'agent:pipeline:start': <Bot className="w-4 h-4" />,
  'agent:pipeline:done': <Bot className="w-4 h-4" />,
  'agent:stage:change': <Bot className="w-4 h-4" />,
  'code:applied': <FileCode className="w-4 h-4" />,
  'code:committed': <GitBranch className="w-4 h-4" />,
  'version:bumped': <Package className="w-4 h-4" />,
  'build:started': <Activity className="w-4 h-4" />,
  'build:completed': <CheckCircle2 className="w-4 h-4" />,
  'build:failed': <XCircle className="w-4 h-4" />,
  'notification:send': <Bell className="w-4 h-4" />,
};

const EVENT_COLORS: Record<string, string> = {
  'message:received': 'bg-blue-100 dark:bg-blue-900 text-blue-600',
  'message:routed': 'bg-blue-100 dark:bg-blue-900 text-blue-600',
  'task:created': 'bg-purple-100 dark:bg-purple-900 text-purple-600',
  'task:started': 'bg-purple-100 dark:bg-purple-900 text-purple-600',
  'task:completed': 'bg-green-100 dark:bg-green-900 text-green-600',
  'task:failed': 'bg-red-100 dark:bg-red-900 text-red-600',
  'agent:pipeline:start': 'bg-orange-100 dark:bg-orange-900 text-orange-600',
  'agent:pipeline:done': 'bg-orange-100 dark:bg-orange-900 text-orange-600',
  'agent:stage:change': 'bg-orange-100 dark:bg-orange-900 text-orange-600',
  'code:applied': 'bg-cyan-100 dark:bg-cyan-900 text-cyan-600',
  'code:committed': 'bg-cyan-100 dark:bg-cyan-900 text-cyan-600',
  'version:bumped': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600',
  'build:started': 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600',
  'build:completed': 'bg-green-100 dark:bg-green-900 text-green-600',
  'build:failed': 'bg-red-100 dark:bg-red-900 text-red-600',
  'notification:send': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
};

const EVENT_LABELS: Record<string, string> = {
  'message:received': '消息接收',
  'message:routed': '消息路由',
  'task:created': '任务创建',
  'task:started': '任务开始',
  'task:completed': '任务完成',
  'task:failed': '任务失败',
  'agent:pipeline:start': 'Agent 流水线启动',
  'agent:pipeline:done': 'Agent 流水线完成',
  'agent:stage:change': 'Agent 阶段变更',
  'code:applied': '代码应用',
  'code:committed': '代码提交',
  'version:bumped': '版本递增',
  'build:started': '构建开始',
  'build:completed': '构建完成',
  'build:failed': '构建失败',
  'notification:send': '通知发送',
};

// ============ Full Chain Pipeline Steps ============

const PIPELINE_STEPS = [
  { event: 'message:received', label: '消息接收' },
  { event: 'task:created', label: '任务创建' },
  { event: 'agent:pipeline:start', label: 'Agent 流水线' },
  { event: 'code:applied', label: '代码应用' },
  { event: 'version:bumped', label: '版本递增' },
  { event: 'build:completed', label: '构建完成' },
  { event: 'notification:send', label: '通知发送' },
];

function getStepStatus(step: string, events: TraceEvent[]): 'pending' | 'done' | 'failed' {
  const failedEvent = events.find(e => e.type === `${step.split(':')[0]}:failed`);
  if (failedEvent) return 'failed';
  const doneEvent = events.find(e => e.type === step);
  return doneEvent ? 'done' : 'pending';
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}分${Math.floor((ms % 60000) / 1000)}秒`;
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
}

// ============ Trace Detail Component ============

function TraceDetail({ traceId }: { traceId: string }) {
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrace = async () => {
    try {
      const res = await fetch(`/api/v1/traces/${traceId}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.data.events);
        setError(null);
      } else {
        setError(data.message || 'Failed to load trace');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

  return (
    <div className="space-y-3">
      {/* Pipeline Timeline */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {PIPELINE_STEPS.map(step => {
          const status = getStepStatus(step.event, events);
          return (
            <div key={step.event} className="flex items-center">
              <div className="flex flex-col items-center min-w-[60px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    status === 'done'
                      ? 'bg-green-500 text-white'
                      : status === 'failed'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {status === 'done' ? '✓' : status === 'failed' ? '✗' : i + 1}
                </div>
                <span className="text-xs mt-1 text-center text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {step.label}
                </span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div
                  className={`w-6 h-0.5 ${
                    status === 'done' ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Duration */}
      {events.length >= 2 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          总耗时：
          {formatDuration(
            new Date(events[events.length - 1].timestamp).getTime() -
              new Date(events[0].timestamp).getTime()
          )}
        </div>
      )}

      {/* Event List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {events.map(event => (
          <div key={event.eventId} className="flex items-start gap-2 text-sm">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                EVENT_COLORS[event.type] || 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              {EVENT_ICONS[event.type] || <Activity className="w-3 h-3" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {EVENT_LABELS[event.type] || event.type}
                </span>
                <span className="text-xs text-gray-400">{formatTimestamp(event.timestamp)}</span>
              </div>
              {Object.keys(event.data).length > 0 && (
                <pre className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-pre-wrap break-all">
                  {JSON.stringify(event.data, null, 0)}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Main Monitor Page ============

export default function MonitorPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [traces, setTraces] = useState<TraceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [showTracePanel, setShowTracePanel] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/v1/health');
      const data = await res.json();
      setHealth(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health');
    } finally {
      setLoading(false);
    }
  };

  const fetchTraces = async () => {
    try {
      const res = await fetch('/api/v1/traces/recent?limit=20');
      const data = await res.json();
      if (data.success) {
        setTraces(data.data.traces);
      }
    } catch {
      // 追踪 API 可能不存在，降级处理
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchTraces();
    const interval = setInterval(() => {
      fetchHealth();
      fetchTraces();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
      case 'completed':
        return 'text-green-500';
      case 'degraded':
      case 'running':
        return 'text-yellow-500';
      case 'error':
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
      case 'completed':
        return '✓';
      case 'degraded':
      case 'running':
        return '⚠';
      case 'error':
      case 'failed':
        return '✗';
      default:
        return '?';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-base text-gray-500 dark:text-gray-400">正在加载系统状态...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <EmptyState
            icon={AlertCircle}
            title="加载失败"
            description={error}
            action={
              <Button variant="outline" onClick={fetchHealth} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                重试
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="page-header">
          <h1 className="page-header-title">System Monitor</h1>
          <div className="flex gap-2">
            <Button
              variant={showTracePanel ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowTracePanel(!showTracePanel)}
              className="gap-2"
            >
              <Activity className="w-4 h-4" />
              全链路追踪
            </Button>
            <Button variant="outline" size="sm" onClick={fetchHealth} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              刷新
            </Button>
          </div>
        </div>

        {/* Overall Status */}
        <div className="bg-white rounded-lg shadow p-6 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                Overall Status
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {health?.timestamp}
              </p>
            </div>
            <div className={`text-4xl font-bold ${getStatusColor(health?.status || 'unknown')}`}>
              {getStatusIcon(health?.status || 'unknown')} {health?.status?.toUpperCase()}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Uptime: <span className="font-mono">{formatUptime(health?.uptime || 0)}</span>
            </p>
          </div>
        </div>

        {/* Service Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {health?.services &&
            Object.entries(health.services).map(([name, service]) => (
              <div key={name} className="bg-white rounded-lg shadow p-6 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 capitalize">
                    {name}
                  </h3>
                  <span className={`text-2xl ${getStatusColor(service.status)}`}>
                    {getStatusIcon(service.status)}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span className={`font-medium ${getStatusColor(service.status)}`}>
                      {service.status.toUpperCase()}
                    </span>
                  </div>
                  {service.latency !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Latency:</span>
                      <span className="font-mono">{service.latency}ms</span>
                    </div>
                  )}
                  {service.error && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-red-600 text-xs dark:bg-red-900/20">
                      {service.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Full Chain Trace Panel */}
        {showTracePanel && (
          <div className="bg-white rounded-lg shadow dark:bg-slate-800">
            <div className="p-4 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                全链路追踪
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                从消息到构建的完整追踪链
              </p>
            </div>

            {selectedTrace ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="font-mono text-sm text-gray-600 dark:text-gray-300">
                      trace: {selectedTrace}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTrace(null)}>
                    返回列表
                  </Button>
                </div>
                <TraceDetail traceId={selectedTrace} />
              </div>
            ) : (
              <div className="p-4">
                {traces.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    暂无追踪记录
                  </p>
                ) : (
                  <div className="space-y-2">
                    {traces.map(trace => (
                      <div
                        key={trace.traceId}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition"
                        onClick={() => setSelectedTrace(trace.traceId)}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-lg ${
                              trace.status === 'completed'
                                ? 'text-green-500'
                                : trace.status === 'failed'
                                  ? 'text-red-500'
                                  : 'text-yellow-500'
                            }`}
                          >
                            {trace.status === 'completed'
                              ? '✓'
                              : trace.status === 'failed'
                                ? '✗'
                                : '⟳'}
                          </span>
                          <div>
                            <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                              {trace.traceId}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {trace.eventCount} 个事件 · {formatTimestamp(trace.lastTimestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              trace.status === 'completed'
                                ? 'success'
                                : trace.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {trace.status === 'completed'
                              ? '已完成'
                              : trace.status === 'failed'
                                ? '失败'
                                : '进行中'}
                          </Badge>
                          {trace.duration > 0 && (
                            <span className="text-xs text-gray-400 font-mono">
                              {formatDuration(trace.duration)}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
