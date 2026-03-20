/**
 * Dashboard Routes
 * 后台管理平台 - 仪表盘概览 API
 */
import { Router } from 'express';
import { dashboardService } from '../services/dashboardService.js';
import { success, error } from '../utils/response.js';
const router = Router();
// GET /api/v1/dashboard/overview - 仪表盘概览
router.get('/overview', async (req, res) => {
    try {
        const overview = await dashboardService.getOverview();
        res.json(success(overview));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
export default router;
