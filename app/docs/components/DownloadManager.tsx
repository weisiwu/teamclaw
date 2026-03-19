'use client';

import { useState, useEffect } from 'react';
import { Download, X, Trash2, CheckCircle, AlertCircle, Loader2, Archive, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getDownloadTasks,
  cancelDownloadTask,
  getDownloadFileUrl,
} from '@/lib/api/download';
import { useDownloadProgress } from '@/lib/hooks/useDownloadProgress';
import { DownloadTask } from '@/lib/api/types';

interface DownloadManagerProps {
  selectedFiles?: string[];
  onClearSelection?: () => void;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + '/s';
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
  return `${Math.round(seconds / 3600)}小时`;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'failed':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'downloading':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'pending':
      return <Archive className="w-5 h-5 text-gray-400" />;
    case 'cancelled':
      return <X className="w-5 h-5 text-gray-400" />;
    default:
      return null;
  }
}

function getStatusText(status: string) {
  const statusMap: Record<string, string> = {
    pending: '等待中',
    downloading: '下载中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
}

export function DownloadManager({
  selectedFiles = [],
  onClearSelection,
  className = '',
}: DownloadManagerProps) {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Load tasks
  const loadTasks = async () => {
    try {
      const data = await getDownloadTasks();
      setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to load download tasks:', err);
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to active task progress
  const { progress, speed, eta } = useDownloadProgress(activeTaskId, {
    onComplete: () => {
      loadTasks();
      setActiveTaskId(null);
    },
  });

  // Create download task for selected files
  const handleCreateDownload = async () => {
    if (selectedFiles.length === 0) return;

    setIsLoading(true);
    try {
      const { createDownloadTask } = await import('@/lib/api/download');
      const result = await createDownloadTask({
        fileIds: selectedFiles,
        zipName: `download_${Date.now()}.zip`,
      });
      setActiveTaskId(result.taskId);
      onClearSelection?.();
      loadTasks();
      setIsOpen(true);
    } catch (err) {
      console.error('Failed to create download:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel task
  const handleCancel = async (taskId: string) => {
    try {
      await cancelDownloadTask(taskId);
      loadTasks();
    } catch (err) {
      console.error('Failed to cancel task:', err);
    }
  };

  // Download file
  const handleDownload = (taskId: string) => {
    const url = getDownloadFileUrl(taskId);
    window.open(url, '_blank');
  };

  const pendingCount = tasks.filter((t) => ['pending', 'downloading'].includes(t.status)).length;

  return (
    <div className={className}>
      {/* Selection actions */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg mb-4">
          <FileArchive className="w-5 h-5 text-blue-600" />
          <span className="flex-1 text-sm">已选择 {selectedFiles.length} 个文件</span>
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            清除
          </Button>
          <Button size="sm" onClick={handleCreateDownload} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            打包下载
          </Button>
        </div>
      )}

      {/* Download manager button */}
      <Button variant="outline" className="relative" onClick={() => setIsOpen(true)}>
        <Download className="w-4 h-4 mr-2" />
        下载管理
        {pendingCount > 0 && <Badge variant="info" className="ml-2">{pendingCount}</Badge>}
      </Button>

      {/* Download manager dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              下载管理
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 mt-4">
            {tasks.length === 0 ? (
              <div className="text-center py-10 text-gray-500">暂无下载任务</div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(task.status)}
                      <div>
                        <p className="font-medium">{task.zipName || '下载任务'}</p>
                        <p className="text-sm text-gray-500">
                          {task.fileCount || task.fileIds.length} 个文件 · {formatBytes(task.totalBytes)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={task.status === 'completed' ? 'success' : task.status === 'failed' ? 'error' : 'info'}>
                        {getStatusText(task.status)}
                      </Badge>

                      {task.status === 'completed' && (
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(task.id)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      )}

                      {['pending', 'downloading'].includes(task.status) && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(task.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}

                      {['completed', 'failed', 'cancelled'].includes(task.status) && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(task.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {task.status === 'downloading' && (
                    <div className="space-y-2">
                      <Progress value={task.id === activeTaskId ? progress : task.progress} />
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>
                          {task.id === activeTaskId
                            ? `${formatBytes((progress / 100) * task.totalBytes)} / ${formatBytes(task.totalBytes)}`
                            : `${task.progress}%`}
                        </span>
                        {task.id === activeTaskId && speed > 0 && (
                          <span>{formatSpeed(speed)} · 剩余 {formatEta(eta)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {task.status === 'failed' && task.errorMessage && (
                    <p className="text-sm text-red-600">{task.errorMessage}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
