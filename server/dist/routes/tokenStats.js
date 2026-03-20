/**
 * TokenStats Routes
 * 后台管理平台 - Token 消费统计 API
 */
import { Router } from 'express';
import { tokenStatsService } from '../services/tokenStatsService.js';
import { success, error } from '../utils/response.js';
const router = Router();
// GET /api/v1/token-stats/summary - 汇总
router.get('/summary', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const summary = await tokenStatsService.getSummary(startDate, endDate);
        res.json(success(summary));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
// GET /api/v1/token-stats/daily - 按天统计
router.get('/daily', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const daily = await tokenStatsService.getDailyStats(startDate, endDate);
        res.json(success(daily));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
// GET /api/v1/token-stats/tasks - 按任务统计
router.get('/tasks', async (req, res) => {
    try {
        const { startDate, endDate, limit } = req.query;
        const tasks = await tokenStatsService.getTaskStats(startDate, endDate, limit ? parseInt(limit) : 50);
        res.json(success(tasks));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
// GET /api/v1/token-stats/trend - 趋势
router.get('/trend', async (req, res) => {
    try {
        const { days } = req.query;
        const trend = await tokenStatsService.getTrend(days ? parseInt(days) : 7);
        res.json(success(trend));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
export default router;
