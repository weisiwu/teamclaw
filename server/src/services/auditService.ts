/**
 * Audit Service
 * 后台管理平台 - 审计日志服务
 * 支持 SQLite DB 写入（audit_log 表）+ JSON 文件回退
 */

import { AuditLog, AuditAction, AuditLogQuery, AuditLogResponse } from '../models/auditLog.js';
import { getDb } from '../db/sqlite.js';
import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'auditLogs.json');

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * DB-backed audit log
 * Falls back to JSON file if DB write fails
 */
function writeToDb(entry: AuditLog): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_log (id, action, user_id, target, details, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.action,
      entry.actor,
      entry.target || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null,
      entry.userAgent || null,
      entry.timestamp,
    );

    // Prune: keep only last 10000 rows in DB
    db.prepare(`
      DELETE FROM audit_log WHERE id NOT IN (
        SELECT id FROM audit_log ORDER BY created_at DESC LIMIT 10000
      )
    `).run();
  } catch {
    // Fallback: also write to JSON file for redundancy
    writeToJsonFile(entry);
  }
}

/**
 * JSON file fallback for audit logs
 */
function writeToJsonFile(entry: AuditLog): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let store: { logs: AuditLog[] } = { logs: [] };
    try {
      if (fs.existsSync(DATA_FILE)) {
        store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      }
    } catch {
      // ignore parse errors
    }
    store.logs.push(entry);
    // Keep last 10000
    const trimmed = store.logs.slice(-10000);
    fs.writeFileSync(DATA_FILE, JSON.stringify({ logs: trimmed }, null, 2), 'utf-8');
  } catch {
    // silently ignore
  }
}

export class AuditService {
  /**
   * 记录审计日志（写入 DB + JSON 回退）
   */
  async log(params: {
    action: AuditAction;
    actor: string;
    target?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const entry: AuditLog = {
      id: generateId('audit'),
      action: params.action,
      actor: params.actor,
      target: params.target,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      timestamp: new Date().toISOString(),
    };
    writeToDb(entry);
    return entry;
  }

  /**
   * 查询审计日志（优先从 DB 读取，fallback 到 JSON）
   */
  async query(query: AuditLogQuery): Promise<AuditLogResponse> {
    try {
      const db = getDb();
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (query.action) {
        conditions.push('action = ?');
        params.push(query.action);
      }
      if (query.actor) {
        conditions.push('user_id = ?');
        params.push(query.actor);
      }
      if (query.target) {
        conditions.push('target = ?');
        params.push(query.target);
      }
      if (query.startDate) {
        conditions.push('created_at >= ?');
        params.push(query.startDate);
      }
      if (query.endDate) {
        conditions.push('created_at <= ?');
        params.push(query.endDate);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total
      const countRow = db.prepare(`SELECT COUNT(*) as total FROM audit_log ${where}`).get(...params) as { total: number };

      // Query with pagination
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      const rows = db.prepare(`
        SELECT id, action, user_id as actor, target, details, ip_address as ipAddress, user_agent as userAgent, created_at as timestamp
        FROM audit_log ${where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as Array<Record<string, unknown>>;

      const list: AuditLog[] = rows.map(row => ({
        id: row.id as string,
        action: row.action as AuditAction,
        actor: row.actor as string,
        target: row.target as string | undefined,
        details: row.details ? JSON.parse(row.details as string) : undefined,
        ipAddress: row.ipAddress as string | undefined,
        userAgent: row.userAgent as string | undefined,
        timestamp: row.timestamp as string,
      }));

      return { list, total: countRow.total };
    } catch {
      // Fallback to JSON file query
      let store: { logs: AuditLog[] } = { logs: [] };
      try {
        if (fs.existsSync(DATA_FILE)) {
          store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        }
      } catch {
        // ignore
      }
      let filtered = store.logs;

      if (query.action) filtered = filtered.filter(l => l.action === query.action);
      if (query.actor) filtered = filtered.filter(l => l.actor === query.actor);
      if (query.target) filtered = filtered.filter(l => l.target === query.target);
      if (query.startDate) filtered = filtered.filter(l => l.timestamp >= query.startDate!);
      if (query.endDate) filtered = filtered.filter(l => l.timestamp <= query.endDate!);
      if (query.keyword) {
        const kw = query.keyword.toLowerCase();
        filtered = filtered.filter(l =>
          l.action.toLowerCase().includes(kw) ||
          l.actor.toLowerCase().includes(kw) ||
          (l.target && l.target.toLowerCase().includes(kw)) ||
          (l.details && JSON.stringify(l.details).toLowerCase().includes(kw))
        );
      }

      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const total = filtered.length;
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      return { list: filtered.slice(offset, offset + limit), total };
    }
  }

  /**
   * 导出 CSV
   */
  async exportCsv(query: AuditLogQuery): Promise<string> {
    const { list } = await this.query({ ...query, limit: 10000 });
    const header = 'ID,时间,操作类型,操作者,目标,IP,详情\n';
    const rows = list.map(l =>
      `"${l.id}","${l.timestamp}","${l.action}","${l.actor}","${l.target || ''}","${l.ipAddress || ''}","${l.details ? JSON.stringify(l.details).replace(/"/g, '""') : ''}"`
    ).join('\n');
    return header + rows;
  }
}

export const auditService = new AuditService();
