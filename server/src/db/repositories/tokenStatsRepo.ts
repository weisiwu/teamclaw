/**
 * Token Stats Repository — PostgreSQL CRUD
 * Persists token usage records to PostgreSQL
 */

import { query, queryOne, execute } from '../pg.js';

export interface TokenUsageRow {
  id: string;
  task_id: string | null;
  layer: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  model: string | null;
  timestamp: Date;
}

export const tokenStatsRepo = {
  async upsert(record: {
    id: string;
    taskId?: string;
    layer: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
    model?: string;
    timestamp?: string;
  }): Promise<number> {
    return execute(`
      INSERT INTO token_usage (id, task_id, layer, input_tokens, output_tokens, total_tokens, cost, model, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        task_id = EXCLUDED.task_id,
        layer = EXCLUDED.layer,
        input_tokens = EXCLUDED.input_tokens,
        output_tokens = EXCLUDED.output_tokens,
        total_tokens = EXCLUDED.total_tokens,
        cost = EXCLUDED.cost,
        model = EXCLUDED.model
    `, [
      record.id,
      record.taskId ?? null,
      record.layer,
      record.inputTokens,
      record.outputTokens,
      record.totalTokens,
      record.cost,
      record.model ?? null,
      record.timestamp ? new Date(record.timestamp) : new Date(),
    ]);
  },

  async findByDateRange(startDate: string, endDate: string): Promise<TokenUsageRow[]> {
    return query<TokenUsageRow>(
      'SELECT * FROM token_usage WHERE timestamp >= $1 AND timestamp <= $2 ORDER BY timestamp DESC',
      [new Date(startDate), new Date(endDate)]
    );
  },

  async findByTaskId(taskId: string): Promise<TokenUsageRow[]> {
    return query<TokenUsageRow>(
      'SELECT * FROM token_usage WHERE task_id = $1 ORDER BY timestamp DESC',
      [taskId]
    );
  },

  async findAll(): Promise<TokenUsageRow[]> {
    return query<TokenUsageRow>('SELECT * FROM token_usage ORDER BY timestamp DESC LIMIT 10000');
  },

  async count(): Promise<number> {
    const row = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM token_usage');
    return parseInt(row?.count ?? '0', 10);
  },

  async deleteOlderThan(beforeDate: string): Promise<number> {
    return execute('DELETE FROM token_usage WHERE timestamp < $1', [new Date(beforeDate)]);
  },
};
