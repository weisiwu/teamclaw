/**
 * Download Service - Batch download queue management with ZIP packaging
 */

import fs from 'fs';
import { generateId } from '../utils/generateId.js';
import path from 'path';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { DownloadTask, DownloadStatus, DownloadProgressEvent } from '../models/download.js';
import { query, execute } from '../db/pg.js';
import { EventEmitter } from 'events';
import { getDoc } from './docService.js';
import { getArtifact } from './artifactStore.js';

// SSE event emitter for progress updates
export const downloadEvents = new EventEmitter();

class DownloadQueue {
  private tasks = new Map<string, DownloadTask>();
  private activeDownloads = new Set<string>();
  private readonly maxConcurrent = 3;
  private readonly downloadDir = './downloads';

  constructor() {
    // Ensure download directory exists
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
    // Load pending tasks from database on startup
    this.loadPendingTasks();
  }

  private async loadPendingTasks(): Promise<void> {
    const tasks = await query<any>(
      "SELECT * FROM download_tasks WHERE status IN ('pending', 'downloading') ORDER BY created_at ASC"
    );
    
    for (const row of tasks) {
      const task: DownloadTask = {
        id: row.id,
        userId: row.user_id,
        type: row.type,
        fileIds: JSON.parse(row.file_ids),
        status: row.status,
        progress: row.progress,
        totalBytes: row.total_bytes,
        downloadedBytes: row.downloaded_bytes,
        zipPath: row.zip_path,
        zipName: row.zip_name,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        errorMessage: row.error_message,
      };
      this.tasks.set(task.id, task);
      if (task.status === 'downloading') {
        // Resume downloading tasks
        this.processQueue();
      }
    }
  }

  async createTask(
    userId: string,
    fileIds: string[],
    zipName: string,
    filePaths: Map<string, string>
  ): Promise<DownloadTask> {
    const task: DownloadTask = {
      id: generateId('dl'),
      userId,
      type: fileIds.length > 1 ? 'batch' : 'single',
      fileIds,
      status: 'pending',
      progress: 0,
      totalBytes: await this.calculateTotalSize(filePaths),
      downloadedBytes: 0,
      zipName: zipName || `download_${Date.now()}.zip`,
      createdAt: new Date().toISOString(),
    };

    // Save to database
    await this.saveTaskToDb(task);
    this.tasks.set(task.id, task);
    
    // Start processing queue
    this.processQueue();
    
    return task;
  }

  private async calculateTotalSize(filePaths: Map<string, string>): Promise<number> {
    let total = 0;
    for (const [, filePath] of filePaths) {
      try {
        const stat = fs.statSync(filePath);
        total += stat.size;
      } catch {
        // File not found, skip
      }
    }
    return total;
  }

  private async saveTaskToDb(task: DownloadTask): Promise<void> {
    await execute(
      `INSERT OR REPLACE INTO download_tasks
      (id, user_id, type, file_ids, status, progress, total_bytes, downloaded_bytes, zip_path, zip_name, created_at, completed_at, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        task.id,
        task.userId,
        task.type,
        JSON.stringify(task.fileIds),
        task.status,
        task.progress,
        task.totalBytes,
        task.downloadedBytes,
        task.zipPath,
        task.zipName,
        task.createdAt,
        task.completedAt,
        task.errorMessage,
      ]
    );
  }

  private async processQueue(): Promise<void> {
    if (this.activeDownloads.size >= this.maxConcurrent) return;

    const pending = Array.from(this.tasks.values()).find(
      (t) => t.status === 'pending'
    );

    if (!pending) return;

    this.activeDownloads.add(pending.id);
    pending.status = 'downloading';
    await this.saveTaskToDb(pending);

    try {
      await this.executeDownload(pending);
      pending.status = 'completed';
      pending.completedAt = new Date().toISOString();
    } catch (err: any) {
      pending.status = 'failed';
      pending.errorMessage = err.message || 'Download failed';
      console.error(`[DownloadQueue] Task ${pending.id} failed:`, err);
    } finally {
      this.activeDownloads.delete(pending.id);
      await this.saveTaskToDb(pending);
      this.emitProgress(pending);
      
      // Process next task
      setImmediate(() => this.processQueue());
    }
  }

  private async executeDownload(task: DownloadTask): Promise<void> {
    const zipPath = path.join(this.downloadDir, `${task.id}.zip`);
    task.zipPath = zipPath;

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    // Resolve file paths before entering the Promise executor
    const filePaths: { fileId: string; filePath: string }[] = [];
    for (const fileId of task.fileIds) {
      const filePath = await this.getFilePath(fileId);
      if (filePath && fs.existsSync(filePath)) {
        filePaths.push({ fileId, filePath });
      }
    }

    return new Promise((resolve, reject) => {
      let lastProgress = 0;
      const startTime = Date.now();

      output.on('close', () => {
        task.progress = 100;
        task.downloadedBytes = task.totalBytes;
        this.emitProgress(task);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.on('progress', (progressData) => {
        const processed = progressData.fs.processedBytes;
        task.downloadedBytes = processed;
        task.progress = Math.round((processed / task.totalBytes) * 100);
        
        // Emit progress every 5% or on significant changes
        if (task.progress - lastProgress >= 5 || task.progress >= 100) {
          lastProgress = task.progress;
          this.emitProgress(task);
        }
      });

      archive.pipe(output);

      // Add files to archive
      for (const { filePath } of filePaths) {
        archive.file(filePath, { name: path.basename(filePath) });
      }

      archive.finalize();
    });
  }

  private async getFilePath(fileId: string): Promise<string | null> {
    // Try docService first
    const doc = getDoc(fileId);
    if (doc?.path) {
      return doc.path;
    }

    // Try artifactStore
    const artifact = await getArtifact(fileId);
    if (artifact?.path) {
      return artifact.path;
    }

    // Fallback: assume it's in uploads directory
    const uploadPath = path.join('./uploads', fileId);
    if (fs.existsSync(uploadPath)) {
      return uploadPath;
    }

    return null;
  }

  private emitProgress(task: DownloadTask): void {
    const now = Date.now();
    const elapsed = (now - new Date(task.createdAt).getTime()) / 1000;
    const speed = elapsed > 0 ? task.downloadedBytes / elapsed : 0;
    const remaining = task.totalBytes - task.downloadedBytes;
    const eta = speed > 0 ? remaining / speed : 0;

    const event: DownloadProgressEvent = {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      speed,
      eta,
      downloadedBytes: task.downloadedBytes,
      totalBytes: task.totalBytes,
    };

    downloadEvents.emit(`progress:${task.userId}`, event);
    downloadEvents.emit(`progress:${task.id}`, event);
  }

  getTask(taskId: string): DownloadTask | undefined {
    return this.tasks.get(taskId);
  }

  getUserTasks(userId: string): DownloadTask[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'downloading') {
      // Cannot cancel active download immediately, mark for cancellation
      task.status = 'cancelled';
    } else if (task.status === 'pending') {
      task.status = 'cancelled';
    } else {
      return false;
    }

    task.completedAt = new Date().toISOString();
    await this.saveTaskToDb(task);
    this.emitProgress(task);

    // Clean up partial download
    if (task.zipPath && fs.existsSync(task.zipPath)) {
      fs.unlinkSync(task.zipPath);
    }

    return true;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Clean up file
    if (task.zipPath && fs.existsSync(task.zipPath)) {
      fs.unlinkSync(task.zipPath);
    }

    // Remove from database
    await execute('DELETE FROM download_tasks WHERE id = $1', [taskId]);

    this.tasks.delete(taskId);
    return true;
  }

  getZipFilePath(taskId: string): string | null {
    const task = this.tasks.get(taskId);
    if (task?.zipPath && fs.existsSync(task.zipPath)) {
      return task.zipPath;
    }
    return null;
  }
}

// Singleton instance
export const downloadQueue = new DownloadQueue();

// Service functions
export async function createDownloadTask(
  userId: string,
  fileIds: string[],
  zipName: string,
  filePaths: Map<string, string>
): Promise<DownloadTask> {
  return downloadQueue.createTask(userId, fileIds, zipName, filePaths);
}

export function getDownloadTask(taskId: string): DownloadTask | undefined {
  return downloadQueue.getTask(taskId);
}

export function getUserDownloadTasks(userId: string): DownloadTask[] {
  return downloadQueue.getUserTasks(userId);
}

export async function cancelDownloadTask(taskId: string): Promise<boolean> {
  return downloadQueue.cancelTask(taskId);
}

export function deleteDownloadTask(taskId: string): boolean {
  return downloadQueue.deleteTask(taskId);
}

export function getDownloadFilePath(taskId: string): string | null {
  return downloadQueue.getZipFilePath(taskId);
}

// Cleanup old completed tasks (run periodically)
export async function cleanupOldTasks(maxAgeHours: number = 24): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

  const oldTasks = await query<any>(
    "SELECT * FROM download_tasks WHERE status IN ('completed', 'failed', 'cancelled') AND created_at < $1",
    [cutoff]
  );

  for (const row of oldTasks) {
    if (row.zip_path && fs.existsSync(row.zip_path)) {
      fs.unlinkSync(row.zip_path);
    }
    await execute('DELETE FROM download_tasks WHERE id = $1', [row.id]);
  }

  console.log(`[DownloadService] Cleaned up ${oldTasks.length} old tasks`);
}
