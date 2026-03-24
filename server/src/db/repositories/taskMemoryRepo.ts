/**
 * Task Memory Repository — PostgreSQL CRUD
 * Persists task context/memory to PostgreSQL
 */

import { query, queryOne, execute } from '../pg.js';

export interface TaskMemoryRow {
  id: number;
  task_id: string;
  session_id: string;
  context_key: string;
  messages: Array<{ id: string; role: string; content: string; timestamp: string }>;
  checkpoints: Array<{ id: string; progress: number; summary: string; timestamp: string }>;
  summary: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskMemoryUpsert {
  taskId: string;
  sessionId: string;
  messages?: Array<{ id: string; role: string; content: string; timestamp: string }>;
  checkpoints?: Array<{ id: string; progress: number; summary: string; timestamp: string }>;
  summary?: string;
}

export const taskMemoryRepo = {
  async upsert(data: TaskMemoryUpsert): Promise<number> {
    const contextKey = `${data.sessionId}:${data.taskId}`;
    const existing = await this.findByContextKey(contextKey);

    if (existing) {
      const sets: string[] = ['updated_at = NOW()'];
      const vals: unknown[] = [];
      let idx = 1;

      if (data.messages !== undefined) { sets.push(`messages = $${idx++}`); vals.push(JSON.stringify(data.messages)); }
      if (data.checkpoints !== undefined) { sets.push(`checkpoints = $${idx++}`); vals.push(JSON.stringify(data.checkpoints)); }
      if (data.summary !== undefined) { sets.push(`summary = $${idx++}`); vals.push(data.summary); }

      vals.push(existing.id);
      return execute(`UPDATE task_memory SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    }

    return execute(`
      INSERT INTO task_memory (task_id, session_id, context_key, messages, checkpoints, summary)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      data.taskId,
      data.sessionId,
      contextKey,
      data.messages ? JSON.stringify(data.messages) : '[]',
      data.checkpoints ? JSON.stringify(data.checkpoints) : '[]',
      data.summary ?? null,
    ]);
  },

  async findByContextKey(contextKey: string): Promise<TaskMemoryRow | null> {
    return queryOne<TaskMemoryRow>('SELECT * FROM task_memory WHERE context_key = $1', [contextKey]);
  },

  async findByTaskId(taskId: string): Promise<TaskMemoryRow[]> {
    return query<TaskMemoryRow>(
      'SELECT * FROM task_memory WHERE task_id = $1 ORDER BY updated_at DESC',
      [taskId]
    );
  },

  async findBySessionId(sessionId: string): Promise<TaskMemoryRow[]> {
    return query<TaskMemoryRow>(
      'SELECT * FROM task_memory WHERE session_id = $1 ORDER BY updated_at DESC',
      [sessionId]
    );
  },

  async findAll(): Promise<TaskMemoryRow[]> {
    return query<TaskMemoryRow>('SELECT * FROM task_memory ORDER BY updated_at DESC LIMIT 1000');
  },

  async delete(taskId: string, sessionId: string): Promise<number> {
    const contextKey = `${sessionId}:${taskId}`;
    return execute('DELETE FROM task_memory WHERE context_key = $1', [contextKey]);
  },

  async count(): Promise<number> {
    const row = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM task_memory');
    return parseInt(row?.count ?? '0', 10);
  },
};
