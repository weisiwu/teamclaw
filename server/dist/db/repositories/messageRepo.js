/**
 * Message Repository — PostgreSQL CRUD (migrated from in-memory Map)
 */
import { query, queryOne, execute } from '../pg.js';
export const messageRepo = {
    async upsert(msg) {
        const existing = await this.findById(msg.messageId);
        if (existing) {
            const sets = [];
            const vals = [];
            let idx = 1;
            if (msg.status !== undefined) {
                sets.push(`status = $${idx++}`);
                vals.push(msg.status);
            }
            if (msg.processedAt !== undefined) {
                sets.push(`processed_at = $${idx++}`);
                vals.push(msg.processedAt ? new Date(msg.processedAt) : null);
            }
            if (msg.mergedInto !== undefined) {
                sets.push(`merged_into = $${idx++}`);
                vals.push(msg.mergedInto);
            }
            if (msg.mergedFrom !== undefined) {
                sets.push(`merged_from = $${idx++}`);
                vals.push(JSON.stringify(msg.mergedFrom));
            }
            if (msg.priority !== undefined) {
                sets.push(`priority = $${idx++}`);
                vals.push(msg.priority);
            }
            if (sets.length === 0)
                return 0;
            vals.push(msg.messageId);
            return execute(`UPDATE messages SET ${sets.join(', ')} WHERE message_id = $${idx}`, vals);
        }
        return execute(`
      INSERT INTO messages (message_id, queue_id, channel, user_id, user_name, role, role_weight,
        content, type, urgency, priority, status, created_at, processed_at, merged_into, merged_from, preempted_by, file_info)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
            msg.messageId,
            msg.queueId ?? null,
            msg.channel,
            msg.userId,
            msg.userName ?? '未知用户',
            msg.role ?? 'employee',
            msg.roleWeight ?? 3,
            msg.content,
            msg.type ?? 'text',
            msg.urgency ?? 1,
            msg.priority ?? 5,
            msg.status ?? 'queued',
            msg.createdAt ? new Date(msg.createdAt) : new Date(),
            msg.processedAt ? new Date(msg.processedAt) : null,
            msg.mergedInto ?? null,
            msg.mergedFrom ? JSON.stringify(msg.mergedFrom) : '[]',
            msg.preemptedBy ?? null,
            msg.fileInfo ? JSON.stringify(msg.fileInfo) : null,
        ]);
    },
    async findById(messageId) {
        return queryOne('SELECT * FROM messages WHERE message_id = $1', [messageId]);
    },
    async findPending(limit = 10) {
        return query('SELECT * FROM messages WHERE status = $1 ORDER BY priority DESC, created_at ASC LIMIT $2', ['pending', limit]);
    },
    async findByStatus(status, limit = 100) {
        return query('SELECT * FROM messages WHERE status = $1 ORDER BY priority DESC, created_at ASC LIMIT $2', [status, limit]);
    },
    async findByUser(userId, limit = 50) {
        return query('SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    },
    async findHistory(params) {
        const conditions = ['status = $1'];
        const vals = ['completed'];
        let idx = 2;
        if (params.userId) {
            conditions.push(`user_id = $${idx++}`);
            vals.push(params.userId);
        }
        if (params.startTime) {
            conditions.push(`created_at >= $${idx++}`);
            vals.push(new Date(params.startTime));
        }
        if (params.endTime) {
            conditions.push(`created_at <= $${idx++}`);
            vals.push(new Date(params.endTime));
        }
        vals.push(params.limit ?? 20);
        vals.push(params.offset ?? 0);
        return query(`SELECT * FROM messages WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`, vals);
    },
    async delete(messageId) {
        return execute('DELETE FROM messages WHERE message_id = $1', [messageId]);
    },
    async count() {
        const row = await queryOne('SELECT COUNT(*) as count FROM messages');
        return parseInt(row?.count ?? '0', 10);
    },
    async countPending() {
        const row = await queryOne("SELECT COUNT(*) as count FROM messages WHERE status = 'pending'");
        return parseInt(row?.count ?? '0', 10);
    },
};
