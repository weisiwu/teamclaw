/**
 * Version History Timeline
 * 记录版本操作历史：创建时间、构建次数、发布时间线
 */
'use client';

import { useState } from 'react';
import { Version } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RollbackDialog } from './RollbackDialog';
import {
  Calendar,
  GitBranch,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  X,
  RotateCcw,
} from 'lucide-react';

interface VersionHistoryProps {
  version: Version | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 版本操作类型
type OperationType = 'created' | 'built' | 'published' | 'branched' | 'updated' | 'archived';

interface HistoryEvent {
  id: string;
  type: OperationType;
  timestamp: string;
  description: string;
  user?: string;
  details?: string;
}

export function VersionHistory({ version, open, onOpenChange }: VersionHistoryProps) {
  const [filter, setFilter] = useState<OperationType | 'all'>('all');
  const [rollbackOpen, setRollbackOpen] = useState(false);

  if (!version || !open) return null;

  // 模拟历史记录数据（实际应从 API 获取）
  const historyEvents: HistoryEvent[] = [
    {
      id: '1',
      type: 'created',
      timestamp: version.createdAt,
      description: '版本创建',
      user: 'system',
      details: `创建版本 ${version.version}`,
    },
    {
      id: '2',
      type: 'built',
      timestamp: new Date(new Date(version.createdAt).getTime() + 3600000).toISOString(),
      description: '首次构建',
      user: 'CI',
      details: '构建成功',
    },
    {
      id: '3',
      type: 'updated',
      timestamp: new Date(new Date(version.createdAt).getTime() + 7200000).toISOString(),
      description: '版本更新',
      user: 'developer',
      details: '更新描述和标签',
    },
  ];

  // 如果已发布，添加发布事件
  if (version.releasedAt) {
    historyEvents.push({
      id: '4',
      type: 'published',
      timestamp: version.releasedAt,
      description: '版本发布',
      user: 'release-manager',
      details: '正式发布版本',
    });
  }

  // 如果是主版本，添加主版本事件
  if (version.isMain) {
    historyEvents.push({
      id: '5',
      type: 'branched',
      timestamp: version.releasedAt || version.createdAt,
      description: '设为主版本',
      user: 'admin',
      details: '设为主版本',
    });
  }

  const filteredEvents =
    filter === 'all' ? historyEvents : historyEvents.filter(e => e.type === filter);

  const getEventIcon = (type: OperationType) => {
    switch (type) {
      case 'created':
        return <FileText className="w-4 h-4" />;
      case 'built':
        return <Play className="w-4 h-4" />;
      case 'published':
        return <CheckCircle className="w-4 h-4" />;
      case 'branched':
        return <GitBranch className="w-4 h-4" />;
      case 'updated':
        return <Clock className="w-4 h-4" />;
      case 'archived':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: OperationType) => {
    switch (type) {
      case 'created':
        return 'bg-blue-500';
      case 'built':
        return 'bg-purple-500';
      case 'published':
        return 'bg-green-500';
      case 'branched':
        return 'bg-yellow-500';
      case 'updated':
        return 'bg-orange-500';
      case 'archived':
        return 'bg-gray-500 dark:bg-slate-500';
      default:
        return 'bg-gray-500 dark:bg-slate-500';
    }
  };

  const getEventLabel = (type: OperationType) => {
    const labels: Record<OperationType, string> = {
      created: '创建',
      built: '构建',
      published: '发布',
      branched: '分支',
      updated: '更新',
      archived: '归档',
    };
    return labels[type] || type;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* 背景遮罩 */}
        <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

        {/* 模态框 */}
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden m-4">
          {/* 标题栏 */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <h2 className="text-lg font-semibold">版本历史 - {version.version}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRollbackOpen(true)}
                className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                回退
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* 筛选器 */}
          <div className="flex gap-2 p-4 border-b flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              全部
            </Button>
            <Button
              variant={filter === 'created' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('created')}
            >
              创建
            </Button>
            <Button
              variant={filter === 'built' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('built')}
            >
              构建
            </Button>
            <Button
              variant={filter === 'published' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('published')}
            >
              发布
            </Button>
          </div>

          {/* 时间线内容 */}
          <div className="p-4 overflow-y-auto max-h-[50vh]">
            {filteredEvents.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">暂无历史记录</p>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    {/* 时间 */}
                    <div className="w-16 text-sm text-gray-500 dark:text-gray-400 text-right shrink-0">
                      {new Date(event.timestamp).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>

                    {/* 连接线 */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full ${getEventColor(event.type)} flex items-center justify-center text-white`}
                      >
                        {getEventIcon(event.type)}
                      </div>
                      {index < filteredEvents.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 dark:bg-slate-700 my-1" />
                      )}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="default"
                          className={getEventColor(event.type).replace('bg-', 'text-')}
                        >
                          {getEventLabel(event.type)}
                        </Badge>
                        <span className="font-medium">{event.description}</span>
                      </div>
                      {event.details && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{event.details}</p>
                      )}
                      {event.user && (
                        <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                          操作者: {event.user}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4 p-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold">{historyEvents.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">总事件</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {historyEvents.filter(e => e.type === 'built').length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">构建次数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{version.commitCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">提交数</p>
            </div>
          </div>
        </div>
      </div>

      {/* 回退对话框 - 放在 modal 外部 */}
      <RollbackDialog
        version={version}
        open={rollbackOpen}
        onOpenChange={setRollbackOpen}
        onRollbackComplete={() => {
          onOpenChange(false);
        }}
      />
    </>
  );
}
