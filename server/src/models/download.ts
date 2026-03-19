/**
 * Download Models - Type definitions for batch download management
 */

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface DownloadTask {
  id: string;                    // Download task ID
  userId: string;               // Initiating user
  type: 'single' | 'batch';    // Single file or batch
  fileIds: string[];            // File IDs to download
  status: DownloadStatus;
  progress: number;             // 0-100
  totalBytes: number;           // Total bytes
  downloadedBytes: number;       // Downloaded bytes
  zipPath?: string;             // Packaged ZIP path
  zipName?: string;             // ZIP filename
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface DownloadProgressEvent {
  taskId: string;
  status: DownloadStatus;
  progress: number;
  speed: number;                 // bytes/s
  eta: number;                   // seconds remaining
  downloadedBytes?: number;
  totalBytes?: number;
}

export interface DocPreviewConfig {
  maxFileSize: number;           // Max preview file size (default 10MB)
  supportedTypes: string[];      // Supported preview types
  pdfRenderDpi: number;          // PDF render DPI
  codePreviewLines: number;      // Max code preview lines
}

export interface DocPreviewResult {
  type: 'html' | 'pdf' | 'code' | 'text' | 'unsupported' | 'image';
  content?: string;              // HTML content or text content
  url?: string;                  // Original file URL
  pages?: number;                // PDF total pages
  currentPage?: number;          // Current page
  size: number;
  canPreview: boolean;
  message?: string;              // Message when preview unavailable
  filename?: string;
}
