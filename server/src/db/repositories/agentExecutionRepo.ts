/**
 * Agent Execution Repository — PostgreSQL CRUD
 * Persists agent execution logs and states to PostgreSQL
 */

import { query, queryOne, execute } from '../pg.js';

export interface AgentExecutionRow {
  execution_id: string;
  task_id: string | null;
  dispatcher: string;
  target_agent: string;
  prompt: string;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  status: string;
  result: string | null;
  error: string | null;
  model: string | null;
  duration_ms: number | null;
  usage_input_tokens: number | null;
  usage_output_tokens: number | null;
  usage_total_tokens: number | null;
  cost_usd: number | null;
}

export const agentExecutionRepo = {
  async upsert(ctx: {
    executionId: string;
    taskId?: string;
    dispatcher?: string;
    targetAgent?: string;
    prompt?: string;
    createdAt?: string;
    startedAt?: string;
    completedAt?: string;
    status?: string;
    result?: string;
    error?: string;
    model?: string;
    durationMs?: number;
    usageInputTokens?: number;
    usageOutputTokens?: number;
    usageTotalTokens?: number;
    costUsd?: number;
  }): Promise<number> {
    const existing = await this.findById(ctx.executionId);
    if (existing) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;

      const fields: [string, unknown, number][] = [
        ['status', ctx.status, idx++],
        ['result', ctx.result ?? null, idx++],
        ['error', ctx.error ?? null, idx++],
        ['completed_at', ctx.completedAt ? new Date(ctx.completedAt) : null, idx++],
        ['model', ctx.model ?? null, idx++],
        ['duration_ms', ctx.durationMs ?? null, idx++],
        ['usage_input_tokens', ctx.usageInputTokens ?? null, idx++],
        ['usage_output_tokens', ctx.usageOutputTokens ?? null, idx++],
        ['usage_total_tokens', ctx.usageTotalTokens ?? null, idx++],
        ['cost_usd', ctx.costUsd ?? null, idx++],
      ];

      for (const [field, value, i] of fields) {
        if (value !== undefined) {
          sets.push(`${field} = $${i}`);
          vals.push(value);
        }
      }

      if (sets.length === 0) return 0;
      vals.push(ctx.executionId);
      return execute(`UPDATE agent_executions SET ${sets.join(', ')} WHERE execution_id = $${idx}`, vals);
    }

    return execute(`
      INSERT INTO agent_executions (
        execution_id, task_id, dispatcher, target_agent, prompt,
        created_at, started_at, completed_at, status, result, error,
        model, duration_ms, usage_input_tokens, usage_output_tokens, usage_total_tokens, cost_usd
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `, [
      ctx.executionId,
      ctx.taskId ?? null,
      ctx.dispatcher ?? 'system',
      ctx.targetAgent ?? 'unknown',
      ctx.prompt ?? '',
      ctx.createdAt ? new Date(ctx.createdAt) : new Date(),
      ctx.startedAt ? new Date(ctx.startedAt) : null,
      ctx.completedAt ? new Date(ctx.completedAt) : null,
      ctx.status ?? 'pending',
      ctx.result ?? null,
      ctx.error ?? null,
      ctx.model ?? null,
      ctx.durationMs ?? null,
      ctx.usageInputTokens ?? null,
      ctx.usageOutputTokens ?? null,
      ctx.usageTotalTokens ?? null,
      ctx.costUsd ?? null,
    ]);
  },

  async findById(executionId: string): Promise<AgentExecutionRow | null> {
    return queryOne<AgentExecutionRow>('SELECT * FROM agent_executions WHERE execution_id = $1', [executionId]);
  },

  async findByTaskId(taskId: string): Promise<AgentExecutionRow[]> {
    return query<AgentExecutionRow>(
      'SELECT * FROM agent_executions WHERE task_id = $1 ORDER BY created_at DESC',
      [taskId]
    );
  },

  async findRunningByAgent(targetAgent: string): Promise<AgentExecutionRow | null> {
    return queryOne<AgentExecutionRow>(
      "SELECT * FROM agent_executions WHERE target_agent = $1 AND status = 'running' LIMIT 1",
      [targetAgent]
    );
  },

  async findByFilters(params: {
    agentName?: string;
    dispatcher?: string;
    taskId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: AgentExecutionRow[]; total: number }> {
    const conditions: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (params.agentName) { conditions.push(`target_agent = $${idx++}`); vals.push(params.agentName); }
    if (params.dispatcher) { conditions.push(`dispatcher = $${idx++}`); vals.push(params.dispatcher); }
    if (params.taskId) { conditions.push(`task_id = $${idx++}`); vals.push(params.taskId); }
    if (params.status) { conditions.push(`status = $${idx++}`); vals.push(params.status); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM agent_executions ${where}`,
      vals
    );
    const total = parseInt(countResult?.count ?? '0', 10);

    vals.push(limit, offset);
    const rows = await query<AgentExecutionRow>(
      `SELECT * FROM agent_executions ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      vals
    );

    return { rows, total };
  },

  async delete(executionId: string): Promise<number> {
    return execute('DELETE FROM agent_executions WHERE execution_id = $1', [executionId]);
  },

  async count(): Promise<number> {
    const row = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM agent_executions');
    return parseInt(row?.count ?? '0', 10);
  },
};
