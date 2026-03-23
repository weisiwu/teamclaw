/**
 * Audit Service
 * 后台管理平台 - 审计日志服务
 * PostgreSQL 持久化 + JSON 文件回退
 */
import { execute, query, queryOne } from '../db/pg.js';
import * as fs from 'fs';
import * as path from 'path';
const DATA_FILE = path.join(process.cwd(), 'data', 'auditLogs.json');
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
/**
 * DB-backed audit log — PostgreSQL
 * Falls back to JSON file if DB write fails
 */
async function writeToDb(entry) {
    try {
        await execute(`
      INSERT INTO audit_log (id, action, user_id, target, details, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
            entry.id,
            entry.action,
            entry.actor,
            entry.target || null,
            entry.details ? JSON.stringify(entry.details) : null,
            entry.ipAddress || null,
            entry.userAgent || null,
            entry.timestamp,
        ]);
        // Prune: keep only last 10000 rows in DB
        await execute(`
      DELETE FROM audit_log WHERE id NOT IN (
        SELECT id FROM audit_log ORDER BY created_at DESC LIMIT 10000
      )
    `);
    }
    catch {
        // Fallback: also write to JSON file for redundancy
        writeToJsonFile(entry);
    }
}
/**
 * JSON file fallback for audit logs
 */
function writeToJsonFile(entry) {
    try {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        let store = { logs: [] };
        try {
            if (fs.existsSync(DATA_FILE)) {
                store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            }
        }
        catch {
            // ignore parse errors
        }
        store.logs.push(entry);
        // Keep last 10000
        const trimmed = store.logs.slice(-10000);
        fs.writeFileSync(DATA_FILE, JSON.stringify({ logs: trimmed }, null, 2), 'utf-8');
    }
    catch {
        // silently ignore
    }
}
export class AuditService {
    /**
     * 记录审计日志（写入 DB + JSON 回退）
     */
    async log(params) {
        const entry = {
            id: generateId('audit'),
            action: params.action,
            actor: params.actor,
            target: params.target,
            details: params.details,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            timestamp: new Date().toISOString(),
        };
        await writeToDb(entry);
        return entry;
    }
    /**
     * 查询审计日志（PostgreSQL + JSON fallback）
     */
    async query(q) {
        try {
            const conditions = [];
            const params = [];
            const countParams = [];
            let idx = 1;
            if (q.action) {
                conditions.push(`action = $${idx++}`);
                params.push(q.action);
                countParams.push(q.action);
            }
            if (q.actor) {
                conditions.push(`user_id = $${idx++}`);
                params.push(q.actor);
                countParams.push(q.actor);
            }
            if (q.target) {
                conditions.push(`target = $${idx++}`);
                params.push(q.target);
                countParams.push(q.target);
            }
            if (q.startDate) {
                conditions.push(`created_at >= $${idx++}`);
                params.push(new Date(q.startDate));
                countParams.push(new Date(q.startDate));
            }
            if (q.endDate) {
                conditions.push(`created_at <= $${idx++}`);
                params.push(new Date(q.endDate));
                countParams.push(new Date(q.endDate));
            }
            const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            // Count total
            const countRow = await queryOne(`SELECT COUNT(*) as count FROM audit_log ${where}`, countParams);
            // Query with pagination
            const limit = q.limit || 50;
            const offset = q.offset || 0;
            const rows = await query(`SELECT id, action, user_id as actor, target, details, ip_address as ipAddress, user_agent as userAgent, created_at as timestamp
         FROM audit_log ${where}
         ORDER BY created_at DESC
         LIMIT $${idx++} OFFSET $${idx}`, [...params, limit, offset]);
            const list = rows.map(row => ({
                id: row.id,
                action: row.action,
                actor: row.actor,
                target: row.target,
                details: row.details ? JSON.parse(row.details) : undefined,
                ipAddress: row.ipAddress,
                userAgent: row.userAgent,
                timestamp: row.timestamp,
            }));
            return { list, total: parseInt(countRow?.count ?? '0', 10) };
        }
        catch {
            // Fallback to JSON file query
            let store = { logs: [] };
            try {
                if (fs.existsSync(DATA_FILE)) {
                    store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
                }
            }
            catch {
                // ignore
            }
            let filtered = store.logs;
            if (q.action)
                filtered = filtered.filter(l => l.action === q.action);
            if (q.actor)
                filtered = filtered.filter(l => l.actor === q.actor);
            if (q.target)
                filtered = filtered.filter(l => l.target === q.target);
            if (q.startDate)
                filtered = filtered.filter(l => l.timestamp >= q.startDate);
            if (q.endDate)
                filtered = filtered.filter(l => l.timestamp <= q.endDate);
            if (q.keyword) {
                const kw = q.keyword.toLowerCase();
                filtered = filtered.filter(l => l.action.toLowerCase().includes(kw) ||
                    l.actor.toLowerCase().includes(kw) ||
                    (l.target && l.target.toLowerCase().includes(kw)) ||
                    (l.details && JSON.stringify(l.details).toLowerCase().includes(kw)));
            }
            filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const total = filtered.length;
            const limit = q.limit || 50;
            const offset = q.offset || 0;
            return { list: filtered.slice(offset, offset + limit), total };
        }
    }
    /**
     * 导出 CSV
     */
    async exportCsv(q) {
        const { list } = await this.query({ ...q, limit: 10000 });
        const header = 'ID,时间,操作类型,操作者,目标,IP,详情\n';
        const rows = list.map(l => `"${l.id}","${l.timestamp}","${l.action}","${l.actor}","${l.target || ''}","${l.ipAddress || ''}","${l.details ? JSON.stringify(l.details).replace(/"/g, '""') : ''}"`).join('\n');
        return header + rows;
    }
}
export const auditService = new AuditService();
