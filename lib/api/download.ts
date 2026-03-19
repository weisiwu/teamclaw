/**
 * Download API - Batch download management
 */

import {
  DownloadTask,
  DownloadProgressEvent,
} from './types';

// Re-export types for backward compatibility
export type { DownloadTask, DownloadProgressEvent };

const API_BASE = '/api/v1';

export interface CreateDownloadRequest {
  fileIds: string[];
  zipName?: string;
}

export interface CreateDownloadResponse {
  taskId: string;
  status: string;
  estimatedSize: number;
}

// Create download task
export async function createDownloadTask(
  request: CreateDownloadRequest
): Promise<CreateDownloadResponse> {
  const res = await fetch(`${API_BASE}/downloads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data;
}

// Get user's download tasks
export async function getDownloadTasks(): Promise<{
  tasks: DownloadTask[];
  total: number;
}> {
  const res = await fetch(`${API_BASE}/downloads`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data;
}

// Get specific download task
export async function getDownloadTask(taskId: string): Promise<DownloadTask> {
  const res = await fetch(`${API_BASE}/downloads/${taskId}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data;
}

// Cancel or delete download task
export async function cancelDownloadTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/downloads/${taskId}`, { method: 'DELETE' });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
}

// Get download file URL
export function getDownloadFileUrl(taskId: string): string {
  return `${API_BASE}/downloads/${taskId}/file`;
}

// Download ZIP file
export function downloadZipFile(taskId: string, zipName?: string): void {
  const url = getDownloadFileUrl(taskId);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipName || 'download.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Subscribe to download progress via SSE
export function subscribeDownloadProgress(
  taskId: string,
  onProgress: (event: DownloadProgressEvent) => void,
  onError?: (error: Error) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE}/downloads/${taskId}/progress`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as DownloadProgressEvent & { done?: boolean };
      onProgress(data);
      if (data.done) {
        eventSource.close();
      }
    } catch {
      onError?.(new Error('Failed to parse progress data'));
    }
  };

  eventSource.onerror = () => {
    onError?.(new Error('SSE connection error'));
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

// Legacy type alias for backward compatibility
export type DownloadTaskResponse = DownloadTask;
