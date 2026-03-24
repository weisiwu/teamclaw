/**
 * Demo Data Routes
 * 管理 Demo 数据的 Seed / Clear / Status 接口
 */

import { Router } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { seedDemoData, clearDemoData, getDemoStatus } from '../services/demoSeed.js';

const router = Router();

// GET /api/v1/admin/demo/status - 查看 Demo 数据状态
router.get('/status', requireAdmin, async (req, res) => {
  try {
    const status = await getDemoStatus();
    res.json(success(status));
  } catch (err) {
    console.error('[demo] Status error:', err);
    res.status(500).json(error(500, (err as Error).message, 'INTERNAL_ERROR'));
  }
});

// POST /api/v1/admin/demo/seed - 手动触发 seed Demo 数据
router.post('/seed', requireAdmin, async (req, res) => {
  try {
    const result = await seedDemoData();
    res.json(success(result));
  } catch (err) {
    console.error('[demo] Seed error:', err);
    res.status(500).json(error(500, (err as Error).message, 'INTERNAL_ERROR'));
  }
});

// DELETE /api/v1/admin/demo/clear - 清除所有 Demo 数据
router.delete('/clear', requireAdmin, async (req, res) => {
  try {
    const result = await clearDemoData();
    res.json(success(result));
  } catch (err) {
    console.error('[demo] Clear error:', err);
    res.status(500).json(error(500, (err as Error).message, 'INTERNAL_ERROR'));
  }
});

export default router;
