/**
 * Audit Service
 * 后台管理平台 - 审计日志服务
 */
import * as fs from 'fs';
import * as path from 'path';
const DATA_FILE = path.join(process.cwd(), 'data', 'auditLogs.json');
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function loadStore() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    }
    catch {
        // ignore
    }
    return { logs: [] };
}
function saveStore(store) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    // 只保留最近 10000 条
    const logs = store.logs.slice(-10000);
    fs.writeFileSync(DATA_FILE, JSON.stringify({ logs }, null, 2), 'utf-8');
}
let storeCache = null;
function getStore() {
    if (!storeCache) {
        storeCache = loadStore();
    }
    return storeCache;
}
export class AuditService {
    /**
     * 记录审计日志
     */
    async log(params) {
        const store = getStore();
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
        store.logs.push(entry);
        saveStore(store);
        return entry;
    }
    /**
     * 查询审计日志
     */
    async query(query) {
        const store = getStore();
        let filtered = store.logs;
        if (query.action) {
            filtered = filtered.filter(l => l.action === query.action);
        }
        if (query.actor) {
            filtered = filtered.filter(l => l.actor === query.actor);
        }
        if (query.target) {
            filtered = filtered.filter(l => l.target === query.target);
        }
        if (query.startDate) {
            filtered = filtered.filter(l => l.timestamp >= query.startDate);
        }
        if (query.endDate) {
            filtered = filtered.filter(l => l.timestamp <= query.endDate);
        }
        if (query.keyword) {
            const kw = query.keyword.toLowerCase();
            filtered = filtered.filter(l => l.action.toLowerCase().includes(kw) ||
                l.actor.toLowerCase().includes(kw) ||
                (l.target && l.target.toLowerCase().includes(kw)) ||
                (l.details && JSON.stringify(l.details).toLowerCase().includes(kw)));
        }
        // 按时间倒序
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const total = filtered.length;
        const limit = query.limit || 50;
        const offset = query.offset || 0;
        const list = filtered.slice(offset, offset + limit);
        return { list, total };
    }
    /**
     * 导出 CSV
     */
    async exportCsv(query) {
        const { list } = await this.query({ ...query, limit: 10000 });
        const header = 'ID,时间,操作类型,操作者,目标,IP,详情\n';
        const rows = list.map(l => `"${l.id}","${l.timestamp}","${l.action}","${l.actor}","${l.target || ''}","${l.ipAddress || ''}","${l.details ? JSON.stringify(l.details).replace(/"/g, '""') : ''}"`).join('\n');
        return header + rows;
    }
}
export const auditService = new AuditService();
