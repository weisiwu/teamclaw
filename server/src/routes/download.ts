/**
 * Download Routes - Batch download management with SSE progress
 */

import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { downloadQueue } from '../services/downloadService.js';
import { success, error } from '../utils/response.js';

const router = Router();

// SSE progress stream GET /api/v1/downloads/:taskId/progress
router.get('/:taskId/progress', (req, res) => {
  const { taskId } = req.params;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', taskId })}\n\n`);

  const unsubscribe = downloadQueue.subscribeSse(taskId, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// Create download task POST /api/v1/downloads
router.post('/', async (req, res) => {
  const { fileIds, zipName, userId = 'default' } = req.body;

  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json(error(400, '需要 fileIds 数组参数'));
  }

  try {
    const task = await downloadQueue.createTask(userId, fileIds, zipName);
    res.json(success({
      taskId: task.id,
      status: task.status,
      estimatedSize: task.totalBytes,
      zipName: task.zipName,
    }));
  } catch (err: any) {
    res.status(500).json(error(500, err?.message || '创建下载任务失败'));
  }
});

// Get task status GET /api/v1/downloads/:taskId
router.get('/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = downloadQueue.getTask(taskId);

  if (!task) {
    return res.status(404).json(error(404, '下载任务不存在'));
  }

  res.json(success({
    id: task.id,
    status: task.status,
    progress: task.progress,
    totalBytes: task.totalBytes,
    downloadedBytes: task.downloadedBytes,
    zipPath: task.zipPath ? `/api/v1/downloads/${taskId}/file` : undefined,
    zipName: task.zipName,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    errorMessage: task.errorMessage,
  }));
});

// Download ZIP file GET /api/v1/downloads/:taskId/file
router.get('/:taskId/file', (req, res) => {
  const { taskId } = req.params;
  const task = downloadQueue.getTask(taskId);

  if (!task) {
    return res.status(404).json(error(404, '下载任务不存在'));
  }

  if (task.status !== 'completed') {
    return res.status(400).json(error(400, `任务状态为 ${task.status}，文件尚未就绪`));
  }

  if (!task.zipPath || !fs.existsSync(task.zipPath)) {
    return res.status(404).json(error(404, 'ZIP 文件不存在或已被清理'));
  }

  const filename = task.zipName || `download_${taskId}.zip`;
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Length', fs.statSync(task.zipPath).size);

  // Support Range requests for resume
  const range = req.headers['range'];
  if (range) {
    const stat = fs.statSync(task.zipPath);
    const fileSize = stat.size;
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
    });
    fs.createReadStream(task.zipPath, { start, end }).pipe(res);
  } else {
    fs.createReadStream(task.zipPath).pipe(res);
  }
});

// Cancel download task DELETE /api/v1/downloads/:taskId
router.delete('/:taskId', (req, res) => {
  const { taskId } = req.params;
  const ok = downloadQueue.cancelTask(taskId);
  if (!ok) {
    return res.status(400).json(error(400, '无法取消任务（可能已完成或不存在）'));
  }
  res.json(success({ message: '下载任务已取消' }));
});

// List user's download tasks GET /api/v1/downloads?userId=xxx
router.get('/', (req, res) => {
  const { userId = 'default' } = req.query;
  const tasks = downloadQueue.getTasksByUser(userId as string);
  res.json(success({
    list: tasks.map(t => ({
      id: t.id,
      status: t.status,
      progress: t.progress,
      totalBytes: t.totalBytes,
      downloadedBytes: t.downloadedBytes,
      type: t.type,
      fileCount: t.fileIds.length,
      zipName: t.zipName,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      errorMessage: t.errorMessage,
    })),
    total: tasks.length,
  }));
});

export default router;
