/**
 * Download Manager Service
 * Manages download queues, progress tracking, and batch ZIP packaging
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { docService } from './docService.js';
const downloadsRoot = path.join(os.tmpdir(), 'teamclaw-downloads');
// In-memory download queue
const downloadTasks = new Map();
function ensureDownloadsDir() {
    if (!fs.existsSync(downloadsRoot)) {
        fs.mkdirSync(downloadsRoot, { recursive: true });
    }
}
// Generate unique task ID
function generateTaskId() {
    return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
// Create a new download task
export function createDownloadTask(userId, files) {
    ensureDownloadsDir();
    const task = {
        id: generateTaskId(),
        userId,
        files,
        status: 'queued',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: files.reduce((sum, f) => sum + f.size, 0),
        createdAt: new Date().toISOString(),
    };
    downloadTasks.set(task.id, task);
    return task;
}
// Get download task by ID
export function getDownloadTask(taskId) {
    return downloadTasks.get(taskId) || null;
}
// List download tasks for a user
export function listDownloadTasks(userId) {
    return Array.from(downloadTasks.values())
        .filter(t => t.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
// Update task progress
function updateTaskProgress(taskId, downloadedBytes, status) {
    const task = downloadTasks.get(taskId);
    if (!task)
        return;
    task.downloadedBytes = downloadedBytes;
    if (task.totalBytes > 0) {
        task.progress = Math.round((downloadedBytes / task.totalBytes) * 100);
    }
    if (status)
        task.status = status;
}
// Mark task as done
function completeTask(taskId, outputPath) {
    const task = downloadTasks.get(taskId);
    if (!task)
        return;
    task.status = 'done';
    task.progress = 100;
    task.outputPath = outputPath;
    task.completedAt = new Date().toISOString();
}
// Mark task as failed
function failTask(taskId, error) {
    const task = downloadTasks.get(taskId);
    if (!task)
        return;
    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date().toISOString();
}
/**
 * Execute a download task: package files into a ZIP archive
 * Returns the path to the created ZIP file
 */
export async function executeDownloadTask(taskId) {
    const task = downloadTasks.get(taskId);
    if (!task)
        return null;
    ensureDownloadsDir();
    updateTaskProgress(taskId, 0, 'packaging');
    const outputDir = path.join(downloadsRoot, task.userId);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const zipPath = path.join(outputDir, `${task.id}.zip`);
    try {
        // Create a temporary directory to hold files for zipping
        const tmpDir = path.join(downloadsRoot, 'tmp', task.id);
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tmpDir, { recursive: true });
        // Copy/download files to tmp dir (for now, files are local URLs)
        let copiedBytes = 0;
        for (const file of task.files) {
            try {
                // file.url can be a local path or a URL
                const srcPath = file.url;
                // If it's a relative URL path, convert to local
                if (srcPath.startsWith('/')) {
                    // Convert API path to actual file path
                    // For now, treat as direct path
                }
                if (fs.existsSync(srcPath)) {
                    const destPath = path.join(tmpDir, file.name);
                    fs.copyFileSync(srcPath, destPath);
                }
                copiedBytes += file.size;
                updateTaskProgress(taskId, Math.round((copiedBytes / task.totalBytes) * 50));
            }
            catch {
                // Skip missing files
            }
        }
        updateTaskProgress(taskId, 50);
        // Create ZIP using system zip command
        await runZip(tmpDir, zipPath);
        updateTaskProgress(taskId, 100);
        completeTask(taskId, zipPath);
        // Cleanup tmp dir
        fs.rmSync(tmpDir, { recursive: true, force: true });
        return zipPath;
    }
    catch (err) {
        failTask(taskId, err instanceof Error ? err.message : 'Unknown error');
        return null;
    }
}
// Run zip command to create archive
function runZip(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
        const zip = spawn('zip', ['-r', '-q', outputPath, '.'], { cwd: sourceDir });
        let stderr = '';
        zip.stderr.on('data', d => { stderr += d.toString(); });
        zip.on('close', code => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`zip failed: ${stderr}`));
        });
        zip.on('error', reject);
    });
}
/**
 * Create a download task from document IDs
 */
export function createDocDownloadTask(userId, docIds) {
    const files = [];
    for (const docId of docIds) {
        const doc = docService.getDoc(docId);
        if (!doc)
            continue;
        const filePath = docService.getDocFilePath(docId);
        if (!filePath || !fs.existsSync(filePath))
            continue;
        try {
            const stats = fs.statSync(filePath);
            files.push({
                url: filePath,
                name: doc.name,
                size: stats.size,
                type: doc.type,
            });
        }
        catch {
            // Skip
        }
    }
    if (files.length === 0)
        return null;
    return createDownloadTask(userId, files);
}
/**
 * Create a download task from artifact paths
 */
export function createArtifactDownloadTask(userId, artifacts) {
    const files = artifacts.map(a => ({
        url: a.path,
        name: a.name,
        size: a.size,
        type: a.type,
    }));
    return createDownloadTask(userId, files);
}
/**
 * Get the download file path for a completed task
 */
export function getDownloadFilePath(taskId) {
    const task = downloadTasks.get(taskId);
    if (!task || task.status !== 'done' || !task.outputPath)
        return null;
    if (!fs.existsSync(task.outputPath))
        return null;
    return task.outputPath;
}
/**
 * Clean up old completed download tasks (older than 1 hour)
 */
export function cleanupOldTasks() {
    const cutoff = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;
    for (const [taskId, task] of downloadTasks.entries()) {
        const created = new Date(task.createdAt).getTime();
        if (created < cutoff && (task.status === 'done' || task.status === 'failed')) {
            // Remove output file if exists
            if (task.outputPath && fs.existsSync(task.outputPath)) {
                try {
                    fs.unlinkSync(task.outputPath);
                }
                catch { /* ignore */ }
            }
            downloadTasks.delete(taskId);
            cleaned++;
        }
    }
    return cleaned;
}
