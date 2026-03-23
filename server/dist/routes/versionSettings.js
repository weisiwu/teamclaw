import { Router } from 'express';
import { success } from '../utils/response.js';
import { getSettings, updateSettings } from '../services/versionSettingsStore.js';
const router = Router();
// GET /api/v1/versions/settings — 获取设置
router.get('/settings', (req, res) => {
    res.json(success({ ...getSettings() }));
});
// PUT /api/v1/versions/settings — 更新设置
router.put('/settings', (req, res) => {
    const partial = req.body;
    const updated = updateSettings(partial);
    if (partial.autoBump !== undefined || partial.bumpType !== undefined) {
        updated.lastBumpedAt = new Date().toISOString();
    }
    res.json(success({ ...updated }));
});
export default router;
