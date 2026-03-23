/**
 * Webhook Router
 * 后台管理平台 - Webhook 配置 API
 */
import { Router } from 'express';
import { success, error } from '../utils/response.js';
import { webhookService } from '../services/webhookService.js';
const router = Router();
// GET /api/v1/admin/webhooks - 获取 Webhook 列表
router.get('/', async (req, res) => {
    try {
        const result = await webhookService.list();
        res.json(success(result));
    }
    catch (e) {
        res.status(500).json(error(500, e.message, 'INTERNAL_ERROR'));
    }
});
// GET /api/v1/admin/webhooks/:id - 获取单个 Webhook
router.get('/:id', async (req, res) => {
    try {
        const webhook = await webhookService.get(req.params.id);
        if (!webhook) {
            res.status(404).json(error(404, 'Webhook not found', 'NOT_FOUND'));
            return;
        }
        res.json(success(webhook));
    }
    catch (e) {
        res.status(500).json(error(500, e.message, 'INTERNAL_ERROR'));
    }
});
// POST /api/v1/admin/webhooks - 创建 Webhook
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        if (!body.name || !body.url || !body.events) {
            res.status(400).json(error(400, 'Missing required fields: name, url, events', 'BAD_REQUEST'));
            return;
        }
        const webhook = await webhookService.create(body, req.headers['x-admin-id'] || 'admin');
        res.json(success(webhook));
    }
    catch (e) {
        res.status(400).json(error(400, e.message, 'BAD_REQUEST'));
    }
});
// PUT /api/v1/admin/webhooks/:id - 更新 Webhook
router.put('/:id', async (req, res) => {
    try {
        const body = req.body;
        const webhook = await webhookService.update(req.params.id, body, req.headers['x-admin-id'] || 'admin');
        if (!webhook) {
            res.status(404).json(error(404, 'Webhook not found', 'NOT_FOUND'));
            return;
        }
        res.json(success(webhook));
    }
    catch (e) {
        res.status(400).json(error(400, e.message, 'BAD_REQUEST'));
    }
});
// DELETE /api/v1/admin/webhooks/:id - 删除 Webhook
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await webhookService.delete(req.params.id, req.headers['x-admin-id'] || 'admin');
        if (!deleted) {
            res.status(404).json(error(404, 'Webhook not found', 'NOT_FOUND'));
            return;
        }
        res.json(success({ deleted: true }));
    }
    catch (e) {
        res.status(400).json(error(400, e.message, 'BAD_REQUEST'));
    }
});
// POST /api/v1/admin/webhooks/:id/test - 发送测试通知
router.post('/:id/test', async (req, res) => {
    try {
        const result = await webhookService.test(req.params.id);
        res.json(success(result));
    }
    catch (e) {
        res.status(500).json(error(500, e.message, 'INTERNAL_ERROR'));
    }
});
// GET /api/v1/admin/webhooks/:id/history - 获取通知历史
router.get('/:id/history', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const history = await webhookService.getHistory(req.params.id, limit);
        res.json(success({ list: history, total: history.length }));
    }
    catch (e) {
        res.status(500).json(error(500, e.message, 'INTERNAL_ERROR'));
    }
});
export default router;
