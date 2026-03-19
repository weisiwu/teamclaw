/**
 * Download API client - batch download with SSE progress
 */

const BASE = '/api/v1';

export interface DownloadTaskResponse {
  id: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  type: 'single' | 'batch';
  fileCount: number;
  zipName?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface DownloadProgressEvent {
  taskId: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed: number;
  eta: number;
  downloadedBytes?: number;
  totalBytes?: number;
}

// ========== Download Tasks ==========

/**
 * Create a batch download task
 */
export async function createDownloadTask(
  fileIds: string[],
  options?: { zipName?: string; userId?: string }
): Promise<{ taskId: string; status: string; estimatedSize: number }> {
  const userId = options?.userId || 'default';
  const res = await fetch(`${BASE}/downloads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileIds, zipName: options?.zipName, userId }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message || '创建下载任务失败');
  return data.data;
}

/**
 * Get download task status
 */
export async function getDownloadTask(taskId: string): Promise<DownloadTaskResponse> {
  const res = await fetch(`${BASE}/downloads/${taskId}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message);
  return data.data;
}

/**
 * List user's download tasks
 */
export async function listDownloadTasks(userId = 'default'): Promise<{ list: DownloadTaskResponse[]; total: number }> {
  const res = await fetch(`${BASE}/downloads?userId=${userId}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message);
  return data.data || { list: [], total: 0 };
}

/**
 * Cancel a download task
 */
export async function cancelDownloadTask(taskId: string): Promise<void> {
  const res = await fetch(`${BASE}/downloads/${taskId}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message);
}

/**
 * Get download file URL for a completed task
 */
export function getDownloadFileUrl(taskId: string): string {
  return `${BASE}/downloads/${taskId}/file`;
}

/**
 * Subscribe to SSE progress stream for a download task
 * Returns an unsubscribe function
 */
export function subscribeDownloadProgress(
  taskId: string,
  onEvent: (event: DownloadProgressEvent) => void
): () => void {
  const eventSource = new EventSource(`${BASE}/downloads/${taskId}/progress`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'connected') return; // Skip connection confirmation
      onEvent(data);
    } catch { /* ignore parse errors */ }
  };

  eventSource.onerror = () => {
    // EventSource will auto-reconnect, but if it's a permanent error
    // the caller can handle it
  };

  // Return unsubscribe function
  return () => {
    eventSource.close();
  };
}

/**
 * Trigger browser download of a ZIP file
 */
export function downloadZipFile(taskId: string, zipName?: string): void {
  const url = getDownloadFileUrl(taskId);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName || `download_${taskId}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
