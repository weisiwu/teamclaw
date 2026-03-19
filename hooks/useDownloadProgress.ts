'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeDownloadProgress,
  getDownloadTask,
  downloadZipFile,
  DownloadProgressEvent,
  DownloadTaskResponse,
} from '@/lib/api/download';

export interface UseDownloadProgressOptions {
  taskId: string | null;
  autoStart?: boolean;
  onComplete?: (task: DownloadTaskResponse) => void;
  onError?: (error: string) => void;
}

export interface UseDownloadProgressReturn {
  task: DownloadTaskResponse | null;
  progress: number;
  speed: number;
  eta: number;
  status: DownloadTaskResponse['status'] | null;
  isConnected: boolean;
  downloadFile: () => void;
  refresh: () => Promise<void>;
}

export function useDownloadProgress({
  taskId,
  autoStart = false,
  onComplete,
  onError,
}: UseDownloadProgressOptions): UseDownloadProgressReturn {
  const [task, setTask] = useState<DownloadTaskResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);
  const [status, setStatus] = useState<DownloadTaskResponse['status'] | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const clearSubscriptions = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!taskId) return;
    try {
      const t = await getDownloadTask(taskId);
      setTask(t);
      setProgress(t.progress);
      setStatus(t.status);
    } catch (err) {
      onError?.((err as Error).message);
    }
  }, [taskId, onError]);

  const downloadFile = useCallback(() => {
    if (!task) return;
    downloadZipFile(taskId!, task.zipName);
  }, [task, taskId]);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setProgress(0);
      setStatus(null);
      clearSubscriptions();
      return;
    }

    clearSubscriptions();

    // Initial fetch
    refresh();

    // Subscribe to SSE progress
    const unsub = subscribeDownloadProgress(taskId, (event: DownloadProgressEvent) => {
      setIsConnected(true);
      setProgress(event.progress);
      setSpeed(event.speed);
      setEta(event.eta);
      setStatus(event.status);

      if (event.status === 'completed') {
        setTask(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);
        onComplete?.({ ...task!, status: 'completed', progress: 100 } as DownloadTaskResponse);
      } else if (event.status === 'failed' || event.status === 'cancelled') {
        onError?.(event.status);
      }
    });
    unsubscribeRef.current = unsub;

    // Fallback polling (every 5s) in case SSE disconnects
    pollRef.current = setInterval(async () => {
      try {
        const t = await getDownloadTask(taskId);
        setTask(t);
        setProgress(t.progress);
        setStatus(t.status);
        if (t.status === 'completed' || t.status === 'failed') {
          clearSubscriptions();
          if (t.status === 'completed') onComplete?.(t);
        }
      } catch { /* ignore polling errors */ }
    }, 5000);

    return clearSubscriptions;
  }, [taskId, clearSubscriptions, refresh, onComplete, onError]);

  return { task, progress, speed, eta, status, isConnected, downloadFile, refresh };
}

// Helper to format speed
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

// Helper to format ETA
export function formatEta(seconds: number): string {
  if (seconds <= 0) return '--';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
