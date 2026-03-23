/**
 * Admin Config Router
 * 后台管理平台 - 系统配置 API
 */
import { Router } from 'express';
import { success } from '../utils/response.js';
import { configService } from '../services/configService.js';
import { requireAdmin } from '../middleware/auth.js';
const router = Router();
// GET /api/v1/admin/config - 获取系统配置
router.get('/', requireAdmin, async (req, res) => {
    try {
        const config = await configService.get();
        res.json(success(config));
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// PUT /api/v1/admin/config - 更新配置
router.put('/', requireAdmin, async (req, res) => {
    try {
        const body = req.body;
        const config = await configService.update(body, req.headers['x-admin-id'] || 'admin');
        res.json(success(config));
    }
    catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});
// POST /api/v1/admin/config/reset - 重置为默认配置
router.post('/reset', requireAdmin, async (req, res) => {
    try {
        const config = await configService.reset(req.headers['x-admin-id'] || 'admin');
        res.json(success(config));
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// POST /api/v1/admin/config/export - 导出配置
router.get('/export', requireAdmin, async (req, res) => {
    try {
        const json = await configService.export();
        res.json(success({ config: JSON.parse(json) }));
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// POST /api/v1/admin/config/import - 导入配置
router.post('/import', requireAdmin, async (req, res) => {
    try {
        const body = req.body;
        if (!body.config) {
            res.status(400).json({ success: false, error: 'Missing config field' });
            return;
        }
        const configStr = typeof body.config === 'string' ? body.config : JSON.stringify(body.config);
        const config = await configService.import(configStr, req.headers['x-admin-id'] || 'admin');
        res.json(success(config));
    }
    catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});
export default router;
