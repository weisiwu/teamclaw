/**
 * Download Manager Routes
 * Manages download queues, progress, and batch ZIP packaging
 */

import { Router, Request, Response } from 'express';
import {
  createDocDownloadTask,
  createArtifactDownloadTask,
  getDownloadTask,
  listDownloadTasks,
  executeDownloadTask,
  getDownloadFilePath,
  cleanupOldTasks,
} from '../services/downloadManager.js';
import { success, error } from '../utils/response.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// Create download task from doc IDs POST /api/v1/downloads/docs
router.post('/docs', async (req: Request, res: Response) => {
  const { userId = 'default', docIds } = req.body as { userId?: string; docIds: string[] };
  if (!docIds || !Array.isArray(docIds) || docIds.length === 0) {
    return res.status(400).json(error('INVALID_PARAMS', '需要 docIds 数组'));
  }
  const task = createDocDownloadTask(userId, docIds);
  if (!task) {
    return res.status(400).json(error('NO_DOCS_FOUND', '未找到有效文档'));
  }
  // Execute async
  executeDownloadTask(task.id).catch(() => {});
  res.json(success(task));
});

// Create download task from artifacts POST /api/v1/downloads/artifacts
router.post('/artifacts', async (req: Request, res: Response) => {
  const { userId = 'default', artifacts } = req.body as { userId?: string; artifacts: Array<{ path: string; name: string; size: number; type: string }> };
  if (!artifacts || !Array.isArray(artifacts) || artifacts.length === 0) {
    return res.status(400).json(error('INVALID_PARAMS', '需要 artifacts 数组'));
  }
  const task = createArtifactDownloadTask(userId, artifacts);
  // Execute async
  executeDownloadTask(task.id).catch(() => {});
  res.json(success(task));
});

// Get task status GET /api/v1/downloads/:taskId
router.get('/:taskId', (req: Request, res: Response) => {
  const task = getDownloadTask(req.params.taskId);
  if (!task) {
    return res.status(404).json(error('NOT_FOUND', '下载任务不存在'));
  }
  res.json(success(task));
});

// List user tasks GET /api/v1/downloads?userId=xxx
router.get('/', (req: Request, res: Response) => {
  const { userId = 'default' } = req.query;
  const tasks = listDownloadTasks(userId as string);
  res.json(success({ tasks }));
});

// Download completed ZIP GET /api/v1/downloads/:taskId/download
router.get('/:taskId/download', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const filePath = getDownloadFilePath(taskId);

  if (!filePath) {
    return res.status(404).json(error('NOT_READY', '文件不存在或下载未完成'));
  }

  const filename = path.basename(filePath);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', fs.statSync(filePath).size);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// Cleanup old tasks DELETE /api/v1/downloads/cleanup
router.delete('/cleanup', (req: Request, res: Response) => {
  const cleaned = cleanupOldTasks();
  res.json(success({ cleaned }));
});

export default router;
