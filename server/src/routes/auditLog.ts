/**
 * AuditLog Router
 * 后台管理平台 - 审计日志 API
 */

import { Router } from 'express';
import { success } from '../utils/response.js';
import { auditService } from '../services/auditService.js';
import { AuditAction, AuditLogQuery } from '../models/auditLog.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/admin/audit-logs - 查询审计日志
router.get('/', requireAuth, async (req, res) => {
  try {
    const query: AuditLogQuery = {
      action: req.query.action as AuditAction | undefined,
      actor: req.query.actor as string | undefined,
      target: req.query.target as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      keyword: req.query.keyword as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };
    const result = await auditService.query(query);
    res.json(success(result));
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// GET /api/v1/admin/audit-logs/export - 导出 CSV
router.get('/export', requireAuth, async (req, res) => {
  try {
    const query: AuditLogQuery = {
      action: req.query.action as AuditAction | undefined,
      actor: req.query.actor as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      limit: 10000,
    };
    const csv = await auditService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

export default router;
