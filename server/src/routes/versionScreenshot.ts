import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { ScreenshotModel } from '../models/screenshot.js';
import { saveScreenshot, deleteScreenshotFile } from '../services/fileStorage.js';
import { onScreenshotLinked } from '../services/changeTracker.js';

const router = Router();

// GET /api/v1/versions/:id/screenshots - List screenshots for a version
router.get('/:id/screenshots', (req: Request, res: Response) => {
  const { id } = req.params;
  const screenshots = ScreenshotModel.findByVersionId(id);
  res.json(success({ data: screenshots, total: screenshots.length }));
});

// POST /api/v1/versions/:id/screenshots - Upload/link a screenshot
router.post('/:id/screenshots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { imageData, messageId, messageContent, senderName, senderAvatar, screenshotUrl, branchName } = req.body as {
      imageData?: string;
      messageId?: string;
      messageContent?: string;
      senderName?: string;
      senderAvatar?: string;
      screenshotUrl?: string;
      branchName?: string;
    };

    let savedUrl = screenshotUrl || '';

    if (imageData) {
      const result = await saveScreenshot(id, imageData);
      savedUrl = result.url;
    }

    const screenshot = ScreenshotModel.create({
      versionId: id,
      messageId,
      messageContent,
      senderName,
      senderAvatar,
      screenshotUrl: savedUrl,
      thumbnailUrl: savedUrl,
      branchName,
    });

    try {
      onScreenshotLinked(id, screenshot.id, senderName || 'system');
    } catch (err) {
      console.warn('[version] Failed to record screenshot event:', err);
    }

    res.status(201).json(success(screenshot));
  } catch (err) {
    console.error('Screenshot upload error:', err);
    res.status(500).json(error(500, '截图上传失败'));
  }
});

// DELETE /api/v1/versions/:id/screenshots/:screenshotId - Delete a screenshot（仅管理员）
router.delete('/:id/screenshots/:screenshotId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { screenshotId } = req.params;
    const screenshot = ScreenshotModel.findById(screenshotId);

    if (!screenshot) {
      res.status(404).json(error(404, '截图不存在'));
      return;
    }

    if (screenshot.screenshotUrl.startsWith('/screenshots/')) {
      await deleteScreenshotFile(screenshot.versionId, screenshot.screenshotUrl);
    }

    ScreenshotModel.delete(screenshotId);
    res.json(success({ deleted: true }));
  } catch (err) {
    console.error('Screenshot delete error:', err);
    res.status(500).json(error(500, '截图删除失败'));
  }
});

export default router;
