/**
 * Token Usage Service
 * DB queries for token usage records and aggregations
 */

import { query, queryOne } from '../db/pg.js';
import * as crypto from 'crypto';

export interface TokenUsageRecord {
  id: string;
  api_token_id: string | null;
  agent_name: string | null;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
  status: 'success' | 'error' | 'timeout';
  error_message: string | null;
  cost_usd: number;
  created_at: Date;
}

export interface TokenUsageSummary {
  tokenId: string;
  tokenName: string;
  tokenPrefix: string;
  monthlyBudget: number;
  currentMonthUsage: number;
  totalUsage: number;
  callCount: number;
  successCount: number;
  failCount: number;
  avgResponseTime: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentUsageSummary {
  agentName: string;
  callCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  avgTokensPerCall: number;
  modelDistribution: Record<string, number>;
  tokenDistribution: Record<string, number>;
  lastCalledAt: string;
}

export interface LLMCallRecord {
  id: string;
  timestamp: string;
  agentName: string;
  tokenId: string;
  tokenName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage: string | null;
  cost: number;
}

export interface UsageFilters {
  startDate?: string;
  endDate?: string;
  agent?: string;
  tokenId?: string;
  model?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

// ============ Recording ============

/**
 * Record a single LLM call to the database
 */
export async function recordTokenUsage(params: {
  apiTokenId?: string;
  agentName?: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  costUsd: number;
}): Promise<void> {
  const id = 'tur_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const sql = `
    INSERT INTO token_usage_records
      (id, api_token_id, agent_name, model, provider, input_tokens, output_tokens,
       total_tokens, latency_ms, status, error_message, cost_usd)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `;
  await query(sql, [
    id,
    params.apiTokenId ?? null,
    params.agentName ?? null,
    params.model,
    params.provider,
    params.inputTokens,
    params.outputTokens,
    params.inputTokens + params.outputTokens,
    params.latencyMs,
    params.status,
    params.errorMessage ?? null,
    params.costUsd,
  ]);
}

// ============ Token Summary (per API Token) ============

/**
 * Get usage summary for all API tokens
 */
export async function getTokenUsageSummary(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<TokenUsageSummary[]> {
  // Build date filter
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const dateFilter = filters?.startDate
    ? `AND r.created_at >= '${filters.startDate}'`
    : `AND r.created_at >= '${monthStart}'`;

  const sql = `
    WITH token_stats AS (
      SELECT
        t.id                              AS token_id,
        COALESCE(t.name, t.id)            AS token_name,
        COALESCE(t.prefix, LEFT(t.id, 8)) AS token_prefix,
        COALESCE(t.monthly_budget, 0)     AS monthly_budget,
        -- Current month stats
        COALESCE(SUM(CASE WHEN r.created_at >= '${monthStart}'
          THEN r.total_tokens ELSE 0 END), 0) AS current_month_usage,
        -- Total stats
        COALESCE(SUM(r.total_tokens), 0) AS total_usage,
        COALESCE(SUM(CASE WHEN r.created_at >= '${monthStart}' THEN 1 ELSE 0 END), 0) AS call_count,
        COALESCE(SUM(CASE WHEN r.created_at >= '${monthStart}' AND r.status = 'success' THEN 1 ELSE 0 END), 0) AS success_count,
        COALESCE(SUM(CASE WHEN r.created_at >= '${monthStart}' AND r.status != 'success' THEN 1 ELSE 0 END), 0) AS fail_count,
        COALESCE(AVG(CASE WHEN r.created_at >= '${monthStart}' THEN r.latency_ms END), 0) AS avg_response_time,
        COALESCE(SUM(CASE WHEN r.created_at >= '${monthStart}' THEN r.input_tokens ELSE 0 END), 0) AS input_tokens,
        COALESCE(SUM(CASE WHEN r.created_at >= '${monthStart}' THEN r.output_tokens ELSE 0 END), 0) AS output_tokens,
        COALESCE(SUM(CASE WHEN r.created_at >= '${monthStart}' THEN r.cost_usd ELSE 0 END), 0) AS cost
      FROM api_token t
      LEFT JOIN token_usage_records r ON r.api_token_id = t.id ${dateFilter}
      GROUP BY t.id, t.name, t.prefix, t.monthly_budget
    )
    SELECT * FROM token_stats
    ORDER BY total_usage DESC
  `;

  try {
    const rows = await query<{
      token_id: string;
      token_name: string;
      token_prefix: string;
      monthly_budget: number;
      current_month_usage: string;
      total_usage: string;
      call_count: string;
      success_count: string;
      fail_count: string;
      avg_response_time: string;
      input_tokens: string;
      output_tokens: string;
      cost: string;
    }>(sql);

    return rows.map((r) => ({
      tokenId: r.token_id,
      tokenName: r.token_name,
      tokenPrefix: r.token_prefix + '****',
      monthlyBudget: Number(r.monthly_budget),
      currentMonthUsage: Number(r.current_month_usage),
      totalUsage: Number(r.total_usage),
      callCount: Number(r.call_count),
      successCount: Number(r.success_count),
      failCount: Number(r.fail_count),
      avgResponseTime: Math.round(Number(r.avg_response_time)),
      inputTokens: Number(r.input_tokens),
      outputTokens: Number(r.output_tokens),
      cost: parseFloat(Number(r.cost).toFixed(4)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    // If tables don't exist, return empty array
    console.warn('[tokenUsageService] getTokenUsageSummary error:', err);
    return [];
  }
}

/**
 * Get usage detail for a single API token
 */
export async function getTokenUsageDetail(tokenId: string, filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<TokenUsageSummary | null> {
  const summaries = await getTokenUsageSummary(filters);
  return summaries.find((s) => s.tokenId === tokenId) ?? null;
}

// ============ Agent Usage Summary ============

/**
 * Get usage summary grouped by agent
 */
export async function getAgentUsageSummary(filters?: {
  startDate?: string;
  endDate?: string;
  agentName?: string;
}): Promise<AgentUsageSummary[]> {
  const conditions: string[] = [];
  if (filters?.startDate) conditions.push(`created_at >= '${filters.startDate}'`);
  if (filters?.endDate) conditions.push(`created_at <= '${filters.endDate}'`);
  if (filters?.agentName) conditions.push(`agent_name = '${filters.agentName}'`);
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT
      COALESCE(agent_name, 'unknown')          AS agent_name,
      COUNT(*)                                  AS call_count,
      SUM(input_tokens)                         AS total_input_tokens,
      SUM(output_tokens)                        AS total_output_tokens,
      SUM(total_tokens)                         AS total_tokens,
      SUM(cost_usd)                             AS total_cost,
      ROUND(AVG(total_tokens), 0)::bigint       AS avg_tokens_per_call,
      MAX(created_at)                           AS last_called_at,
      -- model distribution (call counts per model)
      (SELECT jsonb_object_agg(model, cnt)
       FROM (SELECT model, COUNT(*) AS cnt FROM token_usage_records r2
             WHERE r2.agent_name = token_usage_records.agent_name ${filters?.startDate ? `AND r2.created_at >= '${filters.startDate}'` : ''} ${filters?.endDate ? `AND r2.created_at <= '${filters.endDate}'` : ''}
             GROUP BY model) sub) AS model_distribution,
      -- token distribution (tokens per model)
      (SELECT jsonb_object_agg(model, tok)
       FROM (SELECT model, SUM(total_tokens)::bigint AS tok FROM token_usage_records r3
             WHERE r3.agent_name = token_usage_records.agent_name ${filters?.startDate ? `AND r3.created_at >= '${filters.startDate}'` : ''} ${filters?.endDate ? `AND r3.created_at <= '${filters.endDate}'` : ''}
             GROUP BY model) sub2) AS token_distribution
    FROM token_usage_records
    ${where}
    GROUP BY COALESCE(agent_name, 'unknown')
    ORDER BY total_tokens DESC
  `;

  try {
    const rows = await query<{
      agent_name: string;
      call_count: string;
      total_input_tokens: string;
      total_output_tokens: string;
      total_tokens: string;
      total_cost: string;
      avg_tokens_per_call: string;
      last_called_at: Date;
      model_distribution: Record<string, number> | null;
      token_distribution: Record<string, number> | null;
    }>(sql);

    return rows.map((r) => ({
      agentName: r.agent_name,
      callCount: Number(r.call_count),
      totalInputTokens: Number(r.total_input_tokens),
      totalOutputTokens: Number(r.total_output_tokens),
      totalTokens: Number(r.total_tokens),
      totalCost: parseFloat(Number(r.total_cost).toFixed(4)),
      avgTokensPerCall: Number(r.avg_tokens_per_call),
      modelDistribution: r.model_distribution ?? {},
      tokenDistribution: r.token_distribution ?? {},
      lastCalledAt: r.last_called_at?.toISOString() ?? new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('[tokenUsageService] getAgentUsageSummary error:', err);
    return [];
  }
}

// ============ LLM Call Logs (paginated) ============

/**
 * Get paginated LLM call logs
 */
export async function getLLMCallLogs(filters: UsageFilters): Promise<{
  data: LLMCallRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  if (filters.startDate) conditions.push(`r.created_at >= '${filters.startDate}'`);
  if (filters.endDate) conditions.push(`r.created_at <= '${filters.endDate}'`);
  if (filters.agent) conditions.push(`r.agent_name = '${filters.agent}'`);
  if (filters.tokenId) conditions.push(`r.api_token_id = '${filters.tokenId}'`);
  if (filters.model) conditions.push(`r.model = '${filters.model}'`);
  if (filters.status && filters.status !== 'all') conditions.push(`r.status = '${filters.status}'`);
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countSql = `SELECT COUNT(*)::int AS total FROM token_usage_records r ${where}`;
  const dataSql = `
    SELECT
      r.id,
      r.created_at                              AS timestamp,
      COALESCE(r.agent_name, 'unknown')         AS agent_name,
      COALESCE(r.api_token_id, '')              AS token_id,
      COALESCE(t.name, r.api_token_id, '')     AS token_name,
      r.model,
      r.input_tokens,
      r.output_tokens,
      r.total_tokens,
      r.latency_ms                              AS duration_ms,
      r.status,
      r.error_message,
      r.cost_usd                               AS cost
    FROM token_usage_records r
    LEFT JOIN api_token t ON t.id = r.api_token_id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  try {
    const [countResult, rows] = await Promise.all([
      query<{ total: number }>(countSql),
      query<{
        id: string;
        timestamp: Date;
        agent_name: string;
        token_id: string;
        token_name: string;
        model: string;
        input_tokens: string;
        output_tokens: string;
        total_tokens: string;
        duration_ms: string;
        status: 'success' | 'error' | 'timeout';
        error_message: string | null;
        cost: string;
      }>(dataSql),
    ]);

    const total = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    const data: LLMCallRecord[] = rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp?.toISOString() ?? new Date().toISOString(),
      agentName: r.agent_name,
      tokenId: r.token_id,
      tokenName: r.token_name || r.token_id,
      model: r.model,
      inputTokens: Number(r.input_tokens),
      outputTokens: Number(r.output_tokens),
      totalTokens: Number(r.total_tokens),
      durationMs: Number(r.duration_ms),
      status: r.status,
      errorMessage: r.error_message,
      cost: parseFloat(Number(r.cost).toFixed(6)),
    }));

    return { data, total, page, pageSize, totalPages };
  } catch (err) {
    console.warn('[tokenUsageService] getLLMCallLogs error:', err);
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }
}

// ============ Mock data (when DB not ready) ============

export function getMockTokenSummary(): TokenUsageSummary[] {
  return [
    {
      tokenId: 'tok_001',
      tokenName: 'Production Key',
      tokenPrefix: 'tok_prod_****',
      monthlyBudget: 1000000,
      currentMonthUsage: 823456,
      totalUsage: 2345678,
      callCount: 156,
      successCount: 150,
      failCount: 6,
      avgResponseTime: 1240,
      inputTokens: 512345,
      outputTokens: 311111,
      cost: 12.34,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      tokenId: 'tok_002',
      tokenName: 'Development Key',
      tokenPrefix: 'tok_dev_****',
      monthlyBudget: 500000,
      currentMonthUsage: 412345,
      totalUsage: 1234567,
      callCount: 89,
      successCount: 87,
      failCount: 2,
      avgResponseTime: 980,
      inputTokens: 234567,
      outputTokens: 177778,
      cost: 6.78,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      tokenId: 'tok_003',
      tokenName: 'Test Key',
      tokenPrefix: 'tok_test_****',
      monthlyBudget: 100000,
      currentMonthUsage: 45678,
      totalUsage: 234567,
      callCount: 34,
      successCount: 34,
      failCount: 0,
      avgResponseTime: 756,
      inputTokens: 23456,
      outputTokens: 22222,
      cost: 0.89,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function getMockAgentUsage(): AgentUsageSummary[] {
  return [
    {
      agentName: 'coder',
      callCount: 245,
      totalInputTokens: 1234567,
      totalOutputTokens: 987654,
      totalTokens: 2222221,
      totalCost: 45.67,
      avgTokensPerCall: 9070,
      modelDistribution: { 'gpt-4o': 180, 'claude-3.5-sonnet': 65 },
      tokenDistribution: { 'gpt-4o': 1567890, 'claude-3.5-sonnet': 654331 },
      lastCalledAt: new Date().toISOString(),
    },
    {
      agentName: 'pm',
      callCount: 89,
      totalInputTokens: 456789,
      totalOutputTokens: 234567,
      totalTokens: 691356,
      totalCost: 14.23,
      avgTokensPerCall: 7768,
      modelDistribution: { 'gpt-4o': 89 },
      tokenDistribution: { 'gpt-4o': 691356 },
      lastCalledAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      agentName: 'architect',
      callCount: 56,
      totalInputTokens: 345678,
      totalOutputTokens: 178901,
      totalTokens: 524579,
      totalCost: 10.89,
      avgTokensPerCall: 9367,
      modelDistribution: { 'claude-3.5-sonnet': 56 },
      tokenDistribution: { 'claude-3.5-sonnet': 524579 },
      lastCalledAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

export function getMockLLMCalls(filters: UsageFilters): {
  data: LLMCallRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const total = 100;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;

  const agents = ['coder', 'pm', 'architect'];
  const models = ['gpt-4o', 'claude-3.5-sonnet', 'gpt-4'];
  const statuses: Array<'success' | 'error' | 'timeout'> = ['success', 'success', 'success', 'error', 'timeout'];
  const tokens = ['tok_001', 'tok_002', 'tok_003'];
  const tokenNames = ['Production Key', 'Development Key', 'Test Key'];

  const data: LLMCallRecord[] = Array.from({ length: pageSize }, (_, i) => {
    const idx = start + i;
    const agent = agents[idx % agents.length];
    const model = models[idx % models.length];
    const status = statuses[idx % statuses.length];
    const inputTokens = Math.floor(Math.random() * 5000) + 500;
    const outputTokens = Math.floor(Math.random() * 3000) + 200;
    const totalTokens = inputTokens + outputTokens;
    const pricePerK = model.includes('claude') ? 0.003 : 0.002;
    const cost = (totalTokens / 1000) * pricePerK;

    return {
      id: `call_${String(idx).padStart(5, '0')}`,
      timestamp: new Date(Date.now() - idx * 60000).toISOString(),
      agentName: agent,
      tokenId: tokens[idx % tokens.length],
      tokenName: tokenNames[idx % tokenNames.length],
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      durationMs: Math.floor(Math.random() * 3000) + 300,
      status,
      errorMessage: status === 'error' ? 'Rate limit exceeded' : status === 'timeout' ? 'Request timeout after 30s' : null,
      cost: parseFloat(cost.toFixed(4)),
    };
  });

  return { data, total, page, pageSize, totalPages };
}
