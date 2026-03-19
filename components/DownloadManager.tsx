'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  createDownloadTask,
  listDownloadTasks,
  cancelDownloadTask,
  downloadZipFile,
  DownloadTaskResponse,
} from '@/lib/api/download';
import { useDownloadProgress, formatSpeed, formatEta } from '@/hooks/useDownloadProgress';

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

interface DownloadManagerProps {
  selectedFiles: SelectedFile[];
  onClose?: () => void;
  onClear?: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(type: string): string {
  const icons: Record<string, string> = {
    md: '📝', txt: '📄', json: '{ }', xml: '📋',
    pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗',
    csv: '📊', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️',
    zip: '📦',
  };
  return icons[type.toLowerCase()] || '📄';
}

interface TaskItemProps {
  task: DownloadTaskResponse;
}

function TaskItem({ task }: TaskItemProps) {
  const { progress, speed, eta, status } = useDownloadProgress({
    taskId: task.status === 'pending' || task.status === 'downloading' ? task.id : null,
  });

  const handleDownload = () => {
    downloadZipFile(task.id, task.zipName);
  };

  const handleCancel = async () => {
    if (!confirm('确认取消该下载任务？')) return;
    try {
      await cancelDownloadTask(task.id);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const displayProgress = status === 'downloading' || status === 'pending' ? progress : task.progress;
  const displaySpeed = status === 'downloading' ? speed : 0;
  const displayEta = status === 'downloading' ? eta : 0;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
      {/* Status Icon */}
      <div className="text-2xl flex-shrink-0">
        {task.status === 'completed' ? '✅' :
         task.status === 'failed' ? '❌' :
         task.status === 'cancelled' ? '🚫' :
         task.status === 'downloading' ? '⏬' : '⏳'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">
            {task.zipName || `批量下载 (${task.fileCount} 个文件)`}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
            task.status === 'completed' ? 'bg-green-100 text-green-700' :
            task.status === 'failed' ? 'bg-red-100 text-red-700' :
            task.status === 'cancelled' ? 'bg-gray-200 text-gray-600' :
            'bg-blue-100 text-blue-700'
          }`}>
            {task.status === 'downloading' ? '下载中' :
             task.status === 'completed' ? '已完成' :
             task.status === 'failed' ? '失败' :
             task.status === 'cancelled' ? '已取消' : '等待中'}
          </span>
        </div>

        {/* Progress bar */}
        {(status === 'downloading' || status === 'pending' || task.status === 'downloading') && (
          <div className="mt-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
              <span>{displayProgress}% · {formatSpeed(displaySpeed)}</span>
              <span>剩余 {formatEta(displayEta)}</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Failed message */}
        {task.status === 'failed' && task.errorMessage && (
          <p className="text-xs text-red-500 mt-1">{task.errorMessage}</p>
        )}

        {/* Meta */}
        <p className="text-xs text-gray-400 mt-1">
          {task.fileCount} 个文件 · {formatSize(task.totalBytes)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {task.status === 'completed' && (
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-sm bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition"
          >
            ⬇ 下载
          </button>
        )}
        {(status === 'downloading' || task.status === 'pending') && (
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
          >取消</button>
        )}
      </div>
    </div>
  );
}

export function DownloadManager({ selectedFiles, onClose, onClear }: DownloadManagerProps) {
  const [tasks, setTasks] = useState<DownloadTaskResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDownloadTasks();
      setTasks(data.list);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStartDownload = async () => {
    if (selectedFiles.length === 0) return;
    setCreating(true);
    try {
      const zipName = `批量下载_${new Date().toISOString().slice(0, 10)}_${selectedFiles.length}个文件.zip`;
      await createDownloadTask(
        selectedFiles.map(f => f.id),
        { zipName }
      );
      await fetchTasks();
      onClear?.();
      setShowHistory(true);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">📦</span>
          <h3 className="font-semibold text-gray-900">批量下载</h3>
          {selectedFiles.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {selectedFiles.length} 个文件 · {formatSize(totalSize)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(h => !h)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            {showHistory ? '📋 下载列表' : '📜 历史记录'}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-auto">
        {showHistory ? (
          /* Task History */
          <div className="p-3 space-y-2">
            {loading && tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-3xl mb-2">📦</p>
                <p>暂无下载记录</p>
              </div>
            ) : (
              tasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))
            )}
          </div>
        ) : (
          /* Selected Files */
          <div className="p-3">
            {selectedFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-3xl mb-2">📂</p>
                <p>未选择文件</p>
                <p className="text-xs mt-1">在下方文档列表勾选要下载的文件</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5 mb-3">
                  {selectedFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-sm py-1 px-2 bg-gray-50 rounded">
                      <span className="text-lg flex-shrink-0">{getFileIcon(f.type)}</span>
                      <span className="flex-1 truncate text-gray-700">{f.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(f.size)}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleStartDownload}
                  disabled={creating || selectedFiles.length === 0}
                  className="w-full py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      正在创建下载任务...
                    </>
                  ) : (
                    <>📦 打包下载 {selectedFiles.length} 个文件 ({formatSize(totalSize)})</>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
