/**
 * Doc Routes - API endpoints for document preview and management
 */

import { Router } from 'express';
import { z } from 'zod';
import { generatePreview } from '../services/docPreviewService.js';
import { getDoc } from '../services/docService.js';
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
      return res.status(400).json({
        code: 400,
        message: 'Invalid query parameters',
        errors: parsed.error.errors,
      });
    }

    const { page, maxLines } = parsed.data;

    // Get document info
    const doc = await getDoc(docId);
    if (!doc) {
      return res.status(404).json({
        code: 404,
        message: 'Document not found',
      });
    }

    // Check if file exists
    if (!doc.path || !fs.existsSync(doc.path)) {
      return res.status(404).json({
        code: 404,
        message: 'Document file not found',
      });
    }

    // Generate preview
    const preview = await generatePreview(docId, doc.path, { page, maxLines });

    return res.json({
      code: 0,
      message: 'success',
      data: preview,
    });
  } catch (err: any) {
    console.error('[DocRoutes] Preview error:', err);
    return res.status(500).json({
      code: 500,
      message: err.message || 'Failed to generate preview',
    });
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
      return res.status(404).json({
        code: 404,
        message: 'Document not found',
      });
    }

    // Check if file exists
    if (!doc.path || !fs.existsSync(doc.path)) {
      return res.status(404).json({
        code: 404,
        message: 'Document file not found',
      });
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
    res.status(500).json({
      code: 500,
      message: err.message || 'Failed to download document',
    });
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

    return res.json({
      code: 0,
      message: 'success',
      data: {
        types: supportedTypes,
        maxFileSize: 10 * 1024 * 1024, // 10MB
      },
    });
  } catch (err: any) {
    console.error('[DocRoutes] Get supported types error:', err);
    res.status(500).json({
      code: 500,
      message: err.message || 'Failed to get supported types',
    });
  }
});

export default router;
