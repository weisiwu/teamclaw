'use client';

import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

interface BuildLog {
  id: string;
  versionName: string;
  buildId: string;
  startTime: Date;
  endTime?: Date;
  status: 'success' | 'failed' | 'building';
  logs: string[];
}

interface BuildLogViewerProps {
  buildLogs: BuildLog[];
  onClear?: () => void;
}

export function BuildLogViewer({ buildLogs, onClear }: BuildLogViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 键盘快捷键：Escape 折叠当前展开项
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedId) {
        setExpandedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedId]);

  const handleCopy = (logs: string[], id: string) => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = buildLogs.filter((log) => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return '进行中';
    const ms = end.getTime() - start.getTime();
    return `${(ms / 1000).toFixed(1)}s`;
  };



  if (buildLogs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <span className="text-4xl mb-2 block">📦</span>
        <p>暂无构建记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded ${
              filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            全部 ({buildLogs.length})
          </button>
          <button
            onClick={() => setFilter('success')}
            className={`px-3 py-1 text-xs rounded ${
              filter === 'success' ? 'bg-green-600 text-white' : 'bg-muted'
            }`}
          >
            成功 ({buildLogs.filter((l) => l.status === 'success').length})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-3 py-1 text-xs rounded ${
              filter === 'failed' ? 'bg-red-600 text-white' : 'bg-muted'
            }`}
          >
            失败 ({buildLogs.filter((l) => l.status === 'failed').length})
          </button>
        </div>
        
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            清空记录
          </button>
        )}
      </div>

      <div className="space-y-2">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="border rounded-lg overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted"
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
            >
              <div className="flex items-center gap-2">
                <span>
                  {log.status === 'success' ? '✅' : log.status === 'failed' ? '❌' : '🔄'}
                </span>
                <span className="font-medium text-sm">{log.versionName}</span>
                <span className="text-xs text-muted-foreground">
                  {log.startTime.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {formatDuration(log.startTime, log.endTime)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {expandedId === log.id ? '▼' : '▶'}
                </span>
              </div>
            </div>
            
            {expandedId === log.id && (
              <div className="p-3 border-t bg-background">
                <div className="flex justify-end gap-2 mb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(log.logs, log.id);
                    }}
                    className="text-xs flex items-center gap-1"
                    style={{ color: copiedId === log.id ? '#22c55e' : undefined }}
                  >
                    {copiedId === log.id ? '✅ 已复制' : '📋 复制日志'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // 触发重新构建（通过自定义事件通知父组件）
                      window.dispatchEvent(new CustomEvent('rebuild-version', {
                        detail: { versionName: log.versionName, buildId: log.buildId }
                      }));
                    }}
                    className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    重新构建
                  </button>
                </div>
                <div className="font-mono text-xs bg-muted p-2 rounded max-h-48 overflow-y-auto">
                  {log.logs.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.includes('error') || line.includes('Error')
                          ? 'text-red-500'
                          : line.includes('warn') || line.includes('Warn')
                          ? 'text-yellow-500'
                          : 'text-muted-foreground'
                      }
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 构建历史记录管理 Hook
const BUILD_HISTORY_KEY = 'teamclaw_build_history';

interface BuildLogStored {
  id: string;
  versionName: string;
  buildId: string;
  startTime: string;
  endTime?: string;
  status: 'success' | 'failed' | 'building';
  logs: string[];
}

export function getBuildHistory(): BuildLog[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(BUILD_HISTORY_KEY);
  if (!stored) return [];
  
  try {
    const logs = JSON.parse(stored) as BuildLogStored[];
    return logs.map((log: BuildLogStored) => ({
      ...log,
      startTime: new Date(log.startTime),
      endTime: log.endTime ? new Date(log.endTime) : undefined,
    }));
  } catch {
    return [];
  }
}

export function addBuildLog(log: Omit<BuildLog, 'id'>) {
  const history = getBuildHistory();
  const newLog: BuildLog = {
    ...log,
    id: `build-${Date.now()}`,
  };
  
  // 只保留最近 20 条
  const updated = [newLog, ...history].slice(0, 20);
  localStorage.setItem(BUILD_HISTORY_KEY, JSON.stringify(updated));
  
  return newLog;
}

export function updateBuildLog(id: string, updates: Partial<BuildLog>) {
  const history = getBuildHistory();
  const updated = history.map((log) =>
    log.id === id ? { ...log, ...updates } : log
  );
  localStorage.setItem(BUILD_HISTORY_KEY, JSON.stringify(updated));
}

export function clearBuildHistory() {
  localStorage.removeItem(BUILD_HISTORY_KEY);
}
