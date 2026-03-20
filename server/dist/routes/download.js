/**
 * Download Routes - API endpoints for batch download management
 */
import { Router } from 'express';
import { z } from 'zod';
import { createDownloadTask, getDownloadTask, getUserDownloadTasks, cancelDownloadTask, deleteDownloadTask, getDownloadFilePath, downloadEvents, } from '../services/downloadService.js';
import { getDoc } from '../services/docService.js';
import { getArtifact } from '../services/artifactStore.js';
import path from 'path';
import fs from 'fs';
const router = Router();
// Validation schemas
const createDownloadSchema = z.object({
    fileIds: z.array(z.string()).min(1),
    zipName: z.string().optional(),
});
// Get file paths for file IDs (docs and artifacts)
async function resolveFilePaths(fileIds) {
    const paths = new Map();
    for (const fileId of fileIds) {
        // Try docService first
        const doc = await getDoc(fileId);
        if (doc?.path) {
            paths.set(fileId, doc.path);
            continue;
        }
        // Try artifactStore
        const artifact = await getArtifact(fileId);
        if (artifact?.path) {
            paths.set(fileId, artifact.path);
            continue;
        }
        // Fallback: assume it's in uploads directory
        const uploadPath = path.join('./uploads', fileId);
        if (fs.existsSync(uploadPath)) {
            paths.set(fileId, uploadPath);
        }
    }
    return paths;
}
/**
 * POST /api/v1/downloads
 * Create a new download task
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.user?.id || 'anonymous';
        const parsed = createDownloadSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid request body',
                errors: parsed.error.errors,
            });
        }
        const { fileIds, zipName } = parsed.data;
        // Resolve file paths
        const filePaths = await resolveFilePaths(fileIds);
        if (filePaths.size === 0) {
            return res.status(404).json({
                code: 404,
                message: 'No valid files found',
            });
        }
        // Create download task
        const task = await createDownloadTask(userId, Array.from(filePaths.keys()), zipName || `download_${Date.now()}.zip`, filePaths);
        // Calculate estimated size
        let estimatedSize = 0;
        for (const [, filePath] of filePaths) {
            try {
                const stat = fs.statSync(filePath);
                estimatedSize += stat.size;
            }
            catch {
                // Ignore errors
            }
        }
        return res.status(201).json({
            code: 0,
            message: 'success',
            data: {
                taskId: task.id,
                status: task.status,
                estimatedSize,
            },
        });
    }
    catch (err) {
        console.error('[DownloadRoutes] Create task error:', err);
        return res.status(500).json({
            code: 500,
            message: err.message || 'Failed to create download task',
        });
    }
});
/**
 * GET /api/v1/downloads
 * Get user's download tasks
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id || 'anonymous';
        const tasks = getUserDownloadTasks(userId);
        return res.json({
            code: 0,
            message: 'success',
            data: {
                tasks: tasks.map(t => ({
                    id: t.id,
                    type: t.type,
                    status: t.status,
                    progress: t.progress,
                    totalBytes: t.totalBytes,
                    downloadedBytes: t.downloadedBytes,
                    fileCount: t.fileIds.length,
                    zipName: t.zipName,
                    createdAt: t.createdAt,
                    completedAt: t.completedAt,
                    errorMessage: t.errorMessage,
                })),
                total: tasks.length,
            },
        });
    }
    catch (err) {
        console.error('[DownloadRoutes] Get tasks error:', err);
        return res.status(500).json({
            code: 500,
            message: err.message || 'Failed to get download tasks',
        });
    }
});
/**
 * GET /api/v1/downloads/:taskId
 * Get specific download task
 */
router.get('/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = getDownloadTask(taskId);
        if (!task) {
            return res.status(404).json({
                code: 404,
                message: 'Download task not found',
            });
        }
        return res.json({
            code: 0,
            message: 'success',
            data: {
                id: task.id,
                type: task.type,
                status: task.status,
                progress: task.progress,
                totalBytes: task.totalBytes,
                downloadedBytes: task.downloadedBytes,
                fileIds: task.fileIds,
                zipName: task.zipName,
                zipPath: task.zipPath,
                createdAt: task.createdAt,
                completedAt: task.completedAt,
                errorMessage: task.errorMessage,
            },
        });
    }
    catch (err) {
        console.error('[DownloadRoutes] Get task error:', err);
        return res.status(500).json({
            code: 500,
            message: err.message || 'Failed to get download task',
        });
    }
});
/**
 * GET /api/v1/downloads/:taskId/progress
 * SSE endpoint for download progress
 */
router.get('/:taskId/progress', async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user?.id || 'anonymous';
        const task = getDownloadTask(taskId);
        if (!task) {
            return res.status(404).json({
                code: 404,
                message: 'Download task not found',
            });
        }
        // Verify user owns this task
        if (task.userId !== userId) {
            return res.status(403).json({
                code: 403,
                message: 'Access denied',
            });
        }
        // Set up SSE
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });
        // Send initial state
        res.write(`data: ${JSON.stringify({
            taskId: task.id,
            status: task.status,
            progress: task.progress,
            speed: 0,
            eta: 0,
            downloadedBytes: task.downloadedBytes,
            totalBytes: task.totalBytes,
        })}\n\n`);
        // If already completed/failed/cancelled, close connection
        if (['completed', 'failed', 'cancelled'].includes(task.status)) {
            res.write(`data: ${JSON.stringify({
                taskId: task.id,
                status: task.status,
                progress: task.progress,
                done: true,
            })}\n\n`);
            return res.end();
        }
        // Listen for progress events
        const onProgress = (event) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
            if (['completed', 'failed', 'cancelled'].includes(event.status)) {
                res.write(`data: ${JSON.stringify({ ...event, done: true })}\n\n`);
                cleanup();
                res.end();
            }
        };
        const cleanup = () => {
            downloadEvents.off(`progress:${taskId}`, onProgress);
            downloadEvents.off(`progress:${userId}`, onProgress);
        };
        downloadEvents.on(`progress:${taskId}`, onProgress);
        downloadEvents.on(`progress:${userId}`, onProgress);
        // Handle client disconnect
        req.on('close', () => {
            cleanup();
        });
    }
    catch (err) {
        console.error('[DownloadRoutes] SSE error:', err);
        res.status(500).json({
            code: 500,
            message: err.message || 'Failed to setup progress stream',
        });
    }
});
/**
 * GET /api/v1/downloads/:taskId/file
 * Download the completed ZIP file
 */
router.get('/:taskId/file', async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user?.id || 'anonymous';
        const task = getDownloadTask(taskId);
        if (!task) {
            return res.status(404).json({
                code: 404,
                message: 'Download task not found',
            });
        }
        // Verify user owns this task
        if (task.userId !== userId) {
            return res.status(403).json({
                code: 403,
                message: 'Access denied',
            });
        }
        // Check if task is completed
        if (task.status !== 'completed') {
            return res.status(400).json({
                code: 400,
                message: `Download not ready, current status: ${task.status}`,
            });
        }
        const filePath = getDownloadFilePath(taskId);
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({
                code: 404,
                message: 'Download file not found',
            });
        }
        // Set headers for file download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${task.zipName || 'download.zip'}"`);
        res.setHeader('Content-Length', fs.statSync(filePath).size);
        // Stream file
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    }
    catch (err) {
        console.error('[DownloadRoutes] Download file error:', err);
        res.status(500).json({
            code: 500,
            message: err.message || 'Failed to download file',
        });
    }
});
/**
 * DELETE /api/v1/downloads/:taskId
 * Cancel or delete a download task
 */
router.delete('/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user?.id || 'anonymous';
        const task = getDownloadTask(taskId);
        if (!task) {
            return res.status(404).json({
                code: 404,
                message: 'Download task not found',
            });
        }
        // Verify user owns this task
        if (task.userId !== userId) {
            return res.status(403).json({
                code: 403,
                message: 'Access denied',
            });
        }
        // Cancel if still pending or downloading
        if (['pending', 'downloading'].includes(task.status)) {
            const cancelled = await cancelDownloadTask(taskId);
            if (cancelled) {
                return res.json({
                    code: 0,
                    message: 'Download cancelled',
                    data: { taskId, status: 'cancelled' },
                });
            }
        }
        // Delete completed/failed/cancelled tasks
        deleteDownloadTask(taskId);
        return res.json({
            code: 0,
            message: 'Download task deleted',
            data: { taskId },
        });
    }
    catch (err) {
        console.error('[DownloadRoutes] Delete task error:', err);
        res.status(500).json({
            code: 500,
            message: err.message || 'Failed to delete download task',
        });
    }
});
export default router;
