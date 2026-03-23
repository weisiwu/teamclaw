/**
 * AuditLog Router
 * 后台管理平台 - 审计日志 API
 */
import { Router } from 'express';
import { success } from '../utils/response.js';
import { auditService } from '../services/auditService.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
// GET /api/v1/admin/audit-logs - 查询审计日志
router.get('/', requireAuth, async (req, res) => {
    try {
        const query = {
            action: req.query.action,
            actor: req.query.actor,
            target: req.query.target,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            keyword: req.query.keyword,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0,
        };
        const result = await auditService.query(query);
        res.json(success(result));
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// GET /api/v1/admin/audit-logs/export - 导出 CSV
router.get('/export', requireAuth, async (req, res) => {
    try {
        const query = {
            action: req.query.action,
            actor: req.query.actor,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            limit: 10000,
        };
        const csv = await auditService.exportCsv(query);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
        res.send(csv);
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
export default router;
