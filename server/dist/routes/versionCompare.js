import { Router } from 'express';
import { success, error } from '../utils/response.js';
import { compareTwoVersions, quickCompare } from '../services/versionCompare.js';
const router = Router();
// GET /api/v1/versions/compare — Compare two versions
router.get('/compare', async (req, res) => {
    const { from, to, fromId, toId } = req.query;
    if (!from || !to) {
        res.status(400).json(error(400, 'from and to query parameters are required'));
        return;
    }
    try {
        const result = await compareTwoVersions(fromId || from, toId || to, from, to);
        res.json(success(result));
    }
    catch (err) {
        console.error('Version compare error:', err);
        res.status(500).json(error(500, `版本对比失败: ${err instanceof Error ? err.message : String(err)}`));
    }
});
// GET /api/v1/versions/compare/quick — Quick diff summary
router.get('/compare/quick', async (req, res) => {
    const { from, to, fromId, toId } = req.query;
    if (!from || !to) {
        res.status(400).json(error(400, 'from and to query parameters are required'));
        return;
    }
    try {
        const result = await quickCompare(fromId || from, toId || to, from, to);
        res.json(success(result));
    }
    catch (err) {
        res.status(500).json(error(500, `快速对比失败: ${err instanceof Error ? err.message : String(err)}`));
    }
});
export default router;
