/**
 * CronJob Routes
 * 后台管理平台 - 定时任务 API
 */
import { Router } from 'express';
import { cronService } from '../services/cronService.js';
import { success, error } from '../utils/response.js';
const router = Router();
// GET /api/v1/cron-jobs - 列表
router.get('/', async (req, res) => {
    try {
        const result = await cronService.list();
        res.json(success(result));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
// GET /api/v1/cron-jobs/:id - 单个
router.get('/:id', async (req, res) => {
    try {
        const job = await cronService.get(req.params.id);
        if (!job) {
            return res.status(404).json(error('Cron job not found'));
        }
        res.json(success(job));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
// POST /api/v1/cron-jobs - 创建
router.post('/', async (req, res) => {
    try {
        const { name, cron, prompt, enabled } = req.body;
        if (!name || !cron || !prompt) {
            return res.status(400).json(error('name, cron, prompt are required'));
        }
        if (!cronService.validateCronExpression(cron)) {
            return res.status(400).json(error('Invalid cron expression'));
        }
        const job = await cronService.create({ name, cron, prompt, enabled });
        res.json(success(job));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
// PUT /api/v1/cron-jobs/:id - 更新
router.put('/:id', async (req, res) => {
    try {
        const { name, cron, prompt, enabled } = req.body;
        if (cron && !cronService.validateCronExpression(cron)) {
            return res.status(400).json(error('Invalid cron expression'));
        }
        const job = await cronService.update(req.params.id, { name, cron, prompt, enabled });
        if (!job) {
            return res.status(404).json(error('Cron job not found'));
        }
        res.json(success(job));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
// DELETE /api/v1/cron-jobs/:id - 删除
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await cronService.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json(error('Cron job not found'));
        }
        res.json(success({ deleted: true }));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
// PUT /api/v1/cron-jobs/:id/toggle - 启停
router.put('/:id/toggle', async (req, res) => {
    try {
        const job = await cronService.get(req.params.id);
        if (!job) {
            return res.status(404).json(error('Cron job not found'));
        }
        const updated = job.enabled
            ? await cronService.stop(req.params.id)
            : await cronService.start(req.params.id);
        res.json(success(updated));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
// POST /api/v1/cron-jobs/:id/trigger - 手动触发
router.post('/:id/trigger', async (req, res) => {
    try {
        const run = await cronService.trigger(req.params.id);
        if (!run) {
            return res.status(404).json(error('Cron job not found'));
        }
        res.json(success(run));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
// GET /api/v1/cron-jobs/:id/runs - 运行记录
router.get('/:id/runs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const runs = await cronService.getRuns(req.params.id, limit);
        res.json(success(runs));
    }
    catch (e) {
        res.status(500).json(error(e instanceof Error ? e.message : 'Unknown error'));
    }
});
export default router;
