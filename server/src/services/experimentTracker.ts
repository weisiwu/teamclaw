/**
 * 实验追踪服务（Experiment Tracker）
 * 借鉴 autoresearch 的 results.tsv 思路，管理自主实验的结果追踪
 *
 * 持久化：PostgreSQL experiment_results 表
 */

import { generateId } from '../utils/generateId.js';
import { query, queryOne, execute } from '../db/pg.js';

// ========== 类型定义 ==========

export type ExperimentStatus = 'keep' | 'discard' | 'crash' | 'running' | 'pending';
export type MetricDirection = 'lower_is_better' | 'higher_is_better';

export interface ExperimentResult {
  id: string;
  sessionId: string;           // 实验会话 ID
  sessionTag: string;          // 实验会话标签（如 mar26-perf）
  iteration: number;           // 当前轮次（从 1 开始）
  commitHash: string;          // git commit 短哈希
  metricName: string;          // 指标名称
  metricValue: number;         // 指标值
  baselineValue: number;       // 基线值
  delta: number;               // 变化量（正=改进方向）
  status: ExperimentStatus;
  description: string;         // 本轮实验说明
  errorMessage?: string;       // crash 时的错误信息
  durationMs: number;          // 本轮耗时
  agentName: string;           // 执行 Agent
  projectPath: string;         // 项目路径
  branchName?: string;         // 实验分支名
  createdAt: string;
}

export interface ExperimentSession {
  id: string;
  tag: string;                 // 会话标签
  agentName: string;
  projectPath: string;
  verifyCommand: string;       // 验证命令
  metricName: string;          // 主指标名称
  metricDirection: MetricDirection;
  baselineValue: number;       // 初始基线值
  bestValue: number;           // 最佳指标值
  currentIteration: number;    // 当前轮次
  maxIterations: number;       // 最大轮次
  status: 'active' | 'completed' | 'paused' | 'aborted';
  branchName: string;          // 实验分支名
  keepCount: number;           // keep 次数
  discardCount: number;        // discard 次数
  crashCount: number;          // crash 次数
  consecutiveCrashes: number;  // 连续 crash 次数
  totalDurationMs: number;     // 总耗时
  createdAt: string;
  updatedAt: string;
}

// 数据库行类型
interface ExperimentResultRow {
  id: string;
  session_id: string;
  session_tag: string;
  iteration: number;
  commit_hash: string;
  metric_name: string;
  metric_value: number;
  baseline_value: number;
  delta: number;
  status: string;
  description: string;
  error_message: string | null;
  duration_ms: number;
  agent_name: string;
  project_path: string;
  branch_name: string | null;
  created_at: string;
}

interface ExperimentSessionRow {
  id: string;
  tag: string;
  agent_name: string;
  project_path: string;
  verify_command: string;
  metric_name: string;
  metric_direction: string;
  baseline_value: number;
  best_value: number;
  current_iteration: number;
  max_iterations: number;
  status: string;
  branch_name: string;
  keep_count: number;
  discard_count: number;
  crash_count: number;
  consecutive_crashes: number;
  total_duration_ms: number;
  created_at: string;
  updated_at: string;
}

// ========== 行转换 ==========

function rowToResult(row: ExperimentResultRow): ExperimentResult {
  return {
    id: row.id,
    sessionId: row.session_id,
    sessionTag: row.session_tag,
    iteration: row.iteration,
    commitHash: row.commit_hash,
    metricName: row.metric_name,
    metricValue: Number(row.metric_value),
    baselineValue: Number(row.baseline_value),
    delta: Number(row.delta),
    status: row.status as ExperimentStatus,
    description: row.description,
    errorMessage: row.error_message || undefined,
    durationMs: Number(row.duration_ms),
    agentName: row.agent_name,
    projectPath: row.project_path,
    branchName: row.branch_name || undefined,
    createdAt: row.created_at,
  };
}

function rowToSession(row: ExperimentSessionRow): ExperimentSession {
  return {
    id: row.id,
    tag: row.tag,
    agentName: row.agent_name,
    projectPath: row.project_path,
    verifyCommand: row.verify_command,
    metricName: row.metric_name,
    metricDirection: row.metric_direction as MetricDirection,
    baselineValue: Number(row.baseline_value),
    bestValue: Number(row.best_value),
    currentIteration: row.current_iteration,
    maxIterations: row.max_iterations,
    status: row.status as ExperimentSession['status'],
    branchName: row.branch_name,
    keepCount: row.keep_count,
    discardCount: row.discard_count,
    crashCount: row.crash_count,
    consecutiveCrashes: row.consecutive_crashes,
    totalDurationMs: Number(row.total_duration_ms),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ========== 数据库表初始化 ==========

export async function ensureExperimentTables(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS experiment_sessions (
      id TEXT PRIMARY KEY,
      tag TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      project_path TEXT NOT NULL,
      verify_command TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      metric_direction TEXT NOT NULL DEFAULT 'lower_is_better',
      baseline_value REAL NOT NULL DEFAULT 0,
      best_value REAL NOT NULL DEFAULT 0,
      current_iteration INTEGER NOT NULL DEFAULT 0,
      max_iterations INTEGER NOT NULL DEFAULT 50,
      status TEXT NOT NULL DEFAULT 'active',
      branch_name TEXT NOT NULL,
      keep_count INTEGER NOT NULL DEFAULT 0,
      discard_count INTEGER NOT NULL DEFAULT 0,
      crash_count INTEGER NOT NULL DEFAULT 0,
      consecutive_crashes INTEGER NOT NULL DEFAULT 0,
      total_duration_ms REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS experiment_results (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES experiment_sessions(id),
      session_tag TEXT NOT NULL,
      iteration INTEGER NOT NULL,
      commit_hash TEXT NOT NULL DEFAULT '',
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL DEFAULT 0,
      baseline_value REAL NOT NULL DEFAULT 0,
      delta REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      description TEXT NOT NULL DEFAULT '',
      error_message TEXT,
      duration_ms REAL NOT NULL DEFAULT 0,
      agent_name TEXT NOT NULL,
      project_path TEXT NOT NULL,
      branch_name TEXT,
      created_at TEXT NOT NULL
    )
  `);
}

// ========== 会话管理 ==========

/**
 * 创建实验会话
 */
export async function createSession(params: {
  tag: string;
  agentName: string;
  projectPath: string;
  verifyCommand: string;
  metricName: string;
  metricDirection: MetricDirection;
  maxIterations?: number;
  branchName: string;
}): Promise<ExperimentSession> {
  const id = generateId('exps');
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO experiment_sessions (
      id, tag, agent_name, project_path, verify_command,
      metric_name, metric_direction, baseline_value, best_value,
      current_iteration, max_iterations, status, branch_name,
      keep_count, discard_count, crash_count, consecutive_crashes,
      total_duration_ms, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
    [
      id, params.tag, params.agentName, params.projectPath,
      params.verifyCommand, params.metricName, params.metricDirection,
      0, 0, 0, params.maxIterations || 50,
      'active', params.branchName,
      0, 0, 0, 0, 0, now, now,
    ]
  );

  const row = await queryOne<ExperimentSessionRow>(
    'SELECT * FROM experiment_sessions WHERE id = $1', [id]
  );
  return rowToSession(row!);
}

/**
 * 获取实验会话
 */
export async function getSession(sessionId: string): Promise<ExperimentSession | null> {
  const row = await queryOne<ExperimentSessionRow>(
    'SELECT * FROM experiment_sessions WHERE id = $1', [sessionId]
  );
  return row ? rowToSession(row) : null;
}

/**
 * 获取活跃会话列表
 */
export async function getActiveSessions(): Promise<ExperimentSession[]> {
  const rows = await query<ExperimentSessionRow>(
    "SELECT * FROM experiment_sessions WHERE status = 'active' ORDER BY created_at DESC"
  );
  return rows.map(rowToSession);
}

/**
 * 获取所有会话（分页）
 */
export async function getAllSessions(opts?: {
  status?: ExperimentSession['status'];
  agentName?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; items: ExperimentSession[] }> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (opts?.status) {
    conditions.push(`status = $${paramIdx++}`);
    values.push(opts.status);
  }
  if (opts?.agentName) {
    conditions.push(`agent_name = $${paramIdx++}`);
    values.push(opts.agentName);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = opts?.limit || 20;
  const offset = opts?.offset || 0;

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM experiment_sessions ${where}`, values
  );
  const total = parseInt(countRow?.count || '0', 10);

  const rows = await query<ExperimentSessionRow>(
    `SELECT * FROM experiment_sessions ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...values, limit, offset]
  );

  return { total, items: rows.map(rowToSession) };
}

/**
 * 更新会话基线值
 */
export async function updateSessionBaseline(
  sessionId: string,
  baselineValue: number
): Promise<void> {
  await execute(
    `UPDATE experiment_sessions SET baseline_value = $1, best_value = $2, updated_at = $3 WHERE id = $4`,
    [baselineValue, baselineValue, new Date().toISOString(), sessionId]
  );
}

/**
 * 更新会话状态
 */
export async function updateSessionStatus(
  sessionId: string,
  status: ExperimentSession['status']
): Promise<void> {
  await execute(
    `UPDATE experiment_sessions SET status = $1, updated_at = $2 WHERE id = $3`,
    [status, new Date().toISOString(), sessionId]
  );
}

// ========== 实验结果记录 ==========

/**
 * 记录一次实验结果
 */
export async function recordResult(params: {
  sessionId: string;
  commitHash: string;
  metricValue: number;
  status: ExperimentStatus;
  description: string;
  errorMessage?: string;
  durationMs: number;
}): Promise<ExperimentResult> {
  const session = await getSession(params.sessionId);
  if (!session) {
    throw new Error(`Experiment session ${params.sessionId} not found`);
  }

  const iteration = session.currentIteration + 1;
  const id = generateId('expr');
  const now = new Date().toISOString();

  // 计算 delta（正值 = 改进方向）
  const rawDelta = params.metricValue - session.baselineValue;
  const delta = session.metricDirection === 'lower_is_better' ? -rawDelta : rawDelta;

  await execute(
    `INSERT INTO experiment_results (
      id, session_id, session_tag, iteration, commit_hash,
      metric_name, metric_value, baseline_value, delta,
      status, description, error_message, duration_ms,
      agent_name, project_path, branch_name, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      id, session.id, session.tag, iteration, params.commitHash,
      session.metricName, params.metricValue, session.baselineValue, delta,
      params.status, params.description, params.errorMessage || null,
      params.durationMs, session.agentName, session.projectPath,
      session.branchName, now,
    ]
  );

  // 更新会话统计
  const updates: string[] = [
    `current_iteration = $1`,
    `total_duration_ms = total_duration_ms + $2`,
    `updated_at = $3`,
  ];
  const updateValues: unknown[] = [iteration, params.durationMs, now];
  let pIdx = 4;

  if (params.status === 'keep') {
    updates.push(`keep_count = keep_count + 1`);
    updates.push(`consecutive_crashes = 0`);
    // 更新最佳值
    const isBetter = session.metricDirection === 'lower_is_better'
      ? params.metricValue < session.bestValue || session.bestValue === 0
      : params.metricValue > session.bestValue;
    if (isBetter) {
      updates.push(`best_value = $${pIdx++}`);
      updateValues.push(params.metricValue);
    }
  } else if (params.status === 'discard') {
    updates.push(`discard_count = discard_count + 1`);
    updates.push(`consecutive_crashes = 0`);
  } else if (params.status === 'crash') {
    updates.push(`crash_count = crash_count + 1`);
    updates.push(`consecutive_crashes = consecutive_crashes + 1`);
  }

  updateValues.push(session.id);
  await execute(
    `UPDATE experiment_sessions SET ${updates.join(', ')} WHERE id = $${pIdx}`,
    updateValues
  );

  // 检查是否需要自动暂停（连续 3 次 crash）
  const updatedSession = await getSession(session.id);
  if (updatedSession && updatedSession.consecutiveCrashes >= 3) {
    await updateSessionStatus(session.id, 'paused');
    console.warn(`[experimentTracker] Session ${session.tag} paused: 3 consecutive crashes`);
  }

  // 检查是否达到最大轮次
  if (updatedSession && iteration >= updatedSession.maxIterations) {
    await updateSessionStatus(session.id, 'completed');
    console.log(`[experimentTracker] Session ${session.tag} completed: max iterations reached`);
  }

  const row = await queryOne<ExperimentResultRow>(
    'SELECT * FROM experiment_results WHERE id = $1', [id]
  );
  return rowToResult(row!);
}

/**
 * 获取会话的所有实验结果
 */
export async function getSessionResults(sessionId: string): Promise<ExperimentResult[]> {
  const rows = await query<ExperimentResultRow>(
    'SELECT * FROM experiment_results WHERE session_id = $1 ORDER BY iteration ASC',
    [sessionId]
  );
  return rows.map(rowToResult);
}

/**
 * 获取会话摘要（统计信息）
 */
export async function getSessionSummary(sessionId: string): Promise<{
  session: ExperimentSession;
  results: ExperimentResult[];
  improvement: number;
  bestResult: ExperimentResult | null;
} | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  const results = await getSessionResults(sessionId);
  const keepResults = results.filter(r => r.status === 'keep');
  const bestResult = keepResults.length > 0
    ? keepResults.reduce((best, r) => {
        if (session.metricDirection === 'lower_is_better') {
          return r.metricValue < best.metricValue ? r : best;
        }
        return r.metricValue > best.metricValue ? r : best;
      })
    : null;

  const improvement = session.baselineValue !== 0 && bestResult
    ? ((bestResult.metricValue - session.baselineValue) / session.baselineValue) * 100
    : 0;

  return { session, results, improvement, bestResult };
}

// ========== 导出 ==========

export const experimentTracker = {
  ensureExperimentTables,
  createSession,
  getSession,
  getActiveSessions,
  getAllSessions,
  updateSessionBaseline,
  updateSessionStatus,
  recordResult,
  getSessionResults,
  getSessionSummary,
};

export default experimentTracker;
