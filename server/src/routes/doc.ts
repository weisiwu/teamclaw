/**
 * Doc Routes - API endpoints for document preview and management
 */

import { Router } from 'express';
import { z } from 'zod';
import { generatePreview } from '../services/docPreviewService.js';
import { getDoc } from '../services/docService.js';
import { success, error } from '../utils/response.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// Validation schemas
const previewQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  maxLines: z.coerce.number().min(1).max(1000).optional(),
});

/**
 * GET /api/v1/docs/:docId/preview
 * Get document preview content
 */
router.get('/:docId/preview', async (req, res) => {
  try {
    const { docId } = req.params;
    const parsed = previewQuerySchema.safeParse(req.query);
    
    if (!parsed.success) {
      const body = error(400, 'Invalid query parameters', 'BAD_REQUEST');
      return res.status(400).json({ ...body, errors: parsed.error.errors });
    }

    const { page, maxLines } = parsed.data;

    // Get document info
    const doc = await getDoc(docId);
    if (!doc) {
      return res.status(404).json(error(404, 'Document not found', 'NOT_FOUND'));
    }

    // Check if file exists
    if (!doc.path || !fs.existsSync(doc.path)) {
      return res.status(404).json(error(404, 'Document file not found', 'NOT_FOUND'));
    }

    // Generate preview
    const preview = await generatePreview(docId, doc.path, { page, maxLines });

    return res.json(success(preview));
  } catch (err: any) {
    console.error('[DocRoutes] Preview error:', err);
    return res.status(500).json(error(500, err.message || 'Failed to generate preview', 'INTERNAL_ERROR'));
  }
});

/**
 * GET /api/v1/docs/:docId/download
 * Download document file
 */
router.get('/:docId/download', async (req, res) => {
  try {
    const { docId } = req.params;
    
    // Get document info
    const doc = await getDoc(docId);
    if (!doc) {
      return res.status(404).json(error(404, 'Document not found', 'NOT_FOUND'));
    }

    // Check if file exists
    if (!doc.path || !fs.existsSync(doc.path)) {
      return res.status(404).json(error(404, 'Document file not found', 'NOT_FOUND'));
    }

    // Get file stats
    const stat = fs.statSync(doc.path);
    const filename = doc.name || path.basename(doc.path);

    // Set headers
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Last-Modified', stat.mtime.toUTCString());

    // Stream file
    const stream = fs.createReadStream(doc.path);
    stream.pipe(res);
  } catch (err: any) {
    console.error('[DocRoutes] Download error:', err);
    res.status(500).json(error(500, err.message || 'Failed to download document', 'INTERNAL_ERROR'));
  }
});

/**
 * GET /api/v1/docs/preview-supported
 * Get list of supported preview types
 */
router.get('/preview-supported', async (_req, res) => {
  try {
    const supportedTypes = [
      { type: 'md', name: 'Markdown', ext: ['.md', '.markdown'] },
      { type: 'txt', name: 'Plain Text', ext: ['.txt', '.text', '.log'] },
      { type: 'pdf', name: 'PDF', ext: ['.pdf'] },
      { type: 'code', name: 'Code Files', ext: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.swift', '.kt', '.json', '.yaml', '.yml', '.xml', '.css', '.scss', '.html', '.vue', '.sql', '.sh', '.bash'] },
      { type: 'image', name: 'Images', ext: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'] },
      { type: 'html', name: 'HTML', ext: ['.html', '.htm'] },
    ];

    return res.json(success({
      types: supportedTypes,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    }));
  } catch (err: any) {
    console.error('[DocRoutes] Get supported types error:', err);
    res.status(500).json(error(500, err.message || 'Failed to get supported types', 'INTERNAL_ERROR'));
  }
});

export default router;
