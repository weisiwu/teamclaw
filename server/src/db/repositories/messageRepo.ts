/**
 * Message Repository — PostgreSQL CRUD (migrated from in-memory Map)
 */

import { query, queryOne, execute } from '../pg.js';

export interface MessageRow {
  message_id: string;
  queue_id: string | null;
  channel: string;
  user_id: string;
  user_name: string;
  role: string;
  role_weight: number;
  content: string;
  type: string;
  urgency: number;
  priority: number;
  status: string;
  created_at: Date;
  processed_at: Date | null;
  merged_into: string | null;
  merged_from: string[];
  preempted_by: string | null;
  file_info: Record<string, unknown> | null;
}

export const messageRepo = {
  async upsert(msg: {
    messageId: string;
    queueId?: string;
    channel: string;
    userId: string;
    userName?: string;
    role?: string;
    roleWeight?: number;
    content: string;
    type?: string;
    urgency?: number;
    priority?: number;
    status?: string;
    createdAt?: string;
    processedAt?: string;
    mergedInto?: string;
    mergedFrom?: string[];
    preemptedBy?: string;
    fileInfo?: Record<string, unknown>;
  }): Promise<number> {
    const existing = await this.findById(msg.messageId);
    if (existing) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;

      if (msg.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(msg.status); }
      if (msg.processedAt !== undefined) { sets.push(`processed_at = $${idx++}`); vals.push(msg.processedAt ? new Date(msg.processedAt) : null); }
      if (msg.mergedInto !== undefined) { sets.push(`merged_into = $${idx++}`); vals.push(msg.mergedInto); }
      if (msg.mergedFrom !== undefined) { sets.push(`merged_from = $${idx++}`); vals.push(JSON.stringify(msg.mergedFrom)); }
      if (msg.priority !== undefined) { sets.push(`priority = $${idx++}`); vals.push(msg.priority); }

      if (sets.length === 0) return 0;
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

  async findById(messageId: string): Promise<MessageRow | null> {
    return queryOne<MessageRow>('SELECT * FROM messages WHERE message_id = $1', [messageId]);
  },

  async findPending(limit = 10): Promise<MessageRow[]> {
    return query<MessageRow>(
      'SELECT * FROM messages WHERE status = $1 ORDER BY priority DESC, created_at ASC LIMIT $2',
      ['pending', limit]
    );
  },

  async findByStatus(status: string, limit = 100): Promise<MessageRow[]> {
    return query<MessageRow>(
      'SELECT * FROM messages WHERE status = $1 ORDER BY priority DESC, created_at ASC LIMIT $2',
      [status, limit]
    );
  },

  async findByUser(userId: string, limit = 50): Promise<MessageRow[]> {
    return query<MessageRow>(
      'SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
  },

  async findHistory(params: {
    userId?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
  }): Promise<MessageRow[]> {
    const conditions: string[] = ['status = $1'];
    const vals: unknown[] = ['completed'];
    let idx = 2;

    if (params.userId) { conditions.push(`user_id = $${idx++}`); vals.push(params.userId); }
    if (params.startTime) { conditions.push(`created_at >= $${idx++}`); vals.push(new Date(params.startTime)); }
    if (params.endTime) { conditions.push(`created_at <= $${idx++}`); vals.push(new Date(params.endTime)); }

    vals.push(params.limit ?? 20);
    vals.push(params.offset ?? 0);
    return query<MessageRow>(
      `SELECT * FROM messages WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      vals
    );
  },

  async delete(messageId: string): Promise<number> {
    return execute('DELETE FROM messages WHERE message_id = $1', [messageId]);
  },

  async count(): Promise<number> {
    const row = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM messages');
    return parseInt(row?.count ?? '0', 10);
  },

  async countPending(): Promise<number> {
    const row = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM messages WHERE status = 'pending'");
    return parseInt(row?.count ?? '0', 10);
  },
};
