/**
 * Download Service - Batch download queue with ZIP streaming and SSE progress
 */

import archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import { getDb } from '../db/sqlite.js';
import { docService } from './docService.js';
import { DownloadTask, DownloadStatus, DownloadProgressEvent } from '../models/download.js';

const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || '/tmp/teamclaw/downloads';

// Ensure download directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// SSE clients map: taskId -> Set of response objects
const sseClients = new Map<string, Set<(event: DownloadProgressEvent) => void>>();

function getDb() {
  // Dynamic import to avoid circular
  const { getDb } = require('../db/sqlite.js');
  return getDb();
}

class DownloadQueue {
  private tasks = new Map<string, DownloadTask>();
  private activeDownloads = new Set<string>();
  private maxConcurrent = 3;

  constructor() {
    // Restore tasks from DB on startup
    this.restoreFromDb();
  }

  private restoreFromDb(): void {
    try {
      const db = getDb();
      if (!db) return;
      const rows = db.prepare('SELECT * FROM download_tasks WHERE status IN (?, ?)').all('pending', 'downloading') as any[];
      for (const row of rows) {
        const task: DownloadTask = {
          id: row.id,
          userId: row.user_id,
          type: row.type as 'single' | 'batch',
          fileIds: JSON.parse(row.file_ids || '[]'),
          status: row.status as DownloadStatus,
          progress: row.progress || 0,
          totalBytes: row.total_bytes || 0,
          downloadedBytes: row.downloaded_bytes || 0,
          zipPath: row.zip_path,
          zipName: row.zip_name,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          errorMessage: row.error_message,
        };
        this.tasks.set(task.id, task);
        if (task.status === 'downloading') {
          this.tasks.set(task.id, { ...task, status: 'pending' });
        }
      }
    } catch {
      // DB not available, ignore
    }
  }

  async createTask(userId: string, fileIds: string[], zipName?: string): Promise<DownloadTask> {
    const id = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const totalBytes = await this.calculateTotalSize(fileIds);
    const type = fileIds.length > 1 ? 'batch' : 'single';

    const task: DownloadTask = {
      id,
      userId,
      type,
      fileIds,
      status: 'pending',
      progress: 0,
      totalBytes,
      downloadedBytes: 0,
      zipPath: path.join(DOWNLOADS_DIR, `${id}.zip`),
      zipName: zipName || (type === 'batch' ? `批量下载_${new Date().toISOString().slice(0, 10)}.zip` : undefined),
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(id, task);
    this.saveToDb(task);
    this.processQueue();
    return task;
  }

  getTask(taskId: string): DownloadTask | undefined {
    return this.tasks.get(taskId);
  }

  getTasksByUser(userId: string): DownloadTask[] {
    return Array.from(this.tasks.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') return false;

    task.status = 'cancelled';
    this.saveToDb(task);

    // Clean up temp file
    if (task.zipPath && fs.existsSync(task.zipPath)) {
      try { fs.unlinkSync(task.zipPath); } catch { /* ignore */ }
    }
    this.broadcastProgress(task, 0, 0);
    return true;
  }

  deleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Clean up temp file
    if (task.zipPath && fs.existsSync(task.zipPath)) {
      try { fs.unlinkSync(task.zipPath); } catch { /* ignore */ }
    }

    this.tasks.delete(taskId);
    try {
      const db = getDb();
      db?.prepare('DELETE FROM download_tasks WHERE id = ?').run(taskId);
    } catch { /* ignore */ }
    return true;
  }

  private async calculateTotalSize(fileIds: string[]): Promise<number> {
    let total = 0;
    for (const fileId of fileIds) {
      const doc = docService.getDoc(fileId);
      if (doc) total += doc.size;
    }
    return total;
  }

  private async processQueue(): Promise<void> {
    if (this.activeDownloads.size >= this.maxConcurrent) return;

    const pending = Array.from(this.tasks.values())
      .find(t => t.status === 'pending');

    if (!pending) return;

    this.activeDownloads.add(pending.id);
    pending.status = 'downloading';
    this.saveToDb(pending);

    try {
      await this.executeDownload(pending);
      pending.status = 'completed';
      pending.completedAt = new Date().toISOString();
      pending.progress = 100;
      pending.downloadedBytes = pending.totalBytes;
    } catch (err: any) {
      pending.status = 'failed';
      pending.errorMessage = err?.message || 'Unknown error';
    } finally {
      this.activeDownloads.delete(pending.id);
      this.saveToDb(pending);
      this.broadcastProgress(pending, 0, 0);
      this.processQueue(); // Process next
    }
  }

  private async executeDownload(task: DownloadTask): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(task.zipPath!);
      const archive = archiver('zip', { zlib: { level: 6 } });

      let lastEmitted = 0;
      const EMIT_INTERVAL = 500; // ms

      output.on('close', () => {
        task.downloadedBytes = task.totalBytes;
        task.progress = 100;
      });

      archive.on('progress', (progress) => {
        task.downloadedBytes = progress.fs.processedBytes || 0;
        const pct = task.totalBytes > 0 ? Math.round((task.downloadedBytes / task.totalBytes) * 100) : 0;
        task.progress = pct;

        const now = Date.now();
        if (now - lastEmitted > EMIT_INTERVAL) {
          lastEmitted = now;
          const speed = this.estimateSpeed(task);
          const eta = this.estimateEta(task, speed);
          this.broadcastProgress(task, speed, eta);
        }
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add files to archive
      let filesAdded = 0;
      for (const fileId of task.fileIds) {
        const filePath = docService.getDocFilePath(fileId);
        if (filePath && fs.existsSync(filePath)) {
          const doc = docService.getDoc(fileId);
          archive.file(filePath, { name: doc?.name || path.basename(filePath) });
          filesAdded++;
        }
      }

      if (filesAdded === 0) {
        output.close();
        reject(new Error('No files available for download'));
        return;
      }

      archive.finalize().then(() => {
        resolve();
      }).catch(reject);
    });
  }

  private estimateSpeed(task: DownloadTask): number {
    const elapsed = (new Date(task.createdAt).getTime()) > 0
      ? (Date.now() - new Date(task.createdAt).getTime()) / 1000
      : 1;
    return elapsed > 0 ? Math.round(task.downloadedBytes / elapsed) : 0;
  }

  private estimateEta(task: DownloadTask, speed: number): number {
    if (speed <= 0) return 0;
    const remaining = task.totalBytes - task.downloadedBytes;
    return Math.round(remaining / speed);
  }

  private saveToDb(task: DownloadTask): void {
    try {
      const db = getDb();
      if (!db) return;
      db.prepare(`
        INSERT OR REPLACE INTO download_tasks
        (id, user_id, type, file_ids, status, progress, total_bytes, downloaded_bytes, zip_path, zip_name, created_at, completed_at, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        task.id, task.userId, task.type, JSON.stringify(task.fileIds),
        task.status, task.progress, task.totalBytes, task.downloadedBytes,
        task.zipPath || null, task.zipName || null, task.createdAt,
        task.completedAt || null, task.errorMessage || null
      );
    } catch { /* ignore */ }
  }

  // SSE support
  subscribeSse(taskId: string, callback: (event: DownloadProgressEvent) => void): () => void {
    if (!sseClients.has(taskId)) {
      sseClients.set(taskId, new Set());
    }
    sseClients.get(taskId)!.add(callback);

    // Return unsubscribe function
    return () => {
      sseClients.get(taskId)?.delete(callback);
      if (sseClients.get(taskId)?.size === 0) {
        sseClients.delete(taskId);
      }
    };
  }

  private broadcastProgress(task: DownloadTask, speed: number, eta: number): void {
    const clients = sseClients.get(task.id);
    if (!clients || clients.size === 0) return;

    const event: DownloadProgressEvent = {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      speed,
      eta,
      downloadedBytes: task.downloadedBytes,
      totalBytes: task.totalBytes,
    };

    for (const cb of clients) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

// Singleton
const downloadQueue = new DownloadQueue();
export { downloadQueue };
