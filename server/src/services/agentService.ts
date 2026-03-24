/**
 * Agent 管理服务
 * 管理 Agent 的运行时状态、配置查询、团队概览
 * 持久化层：PostgreSQL agents 表
 * 内存缓存：Agent 列表，TTL 30 秒或变更时失效
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { query, queryOne, execute } from "../db/pg.js";
import {
  AGENT_TEAM,
  DISPATCH_MATRIX,
  AgentConfig,
} from "../constants/agents.js";
import {
  AgentDetail,
  AgentRuntime,
  AgentStatus,
  TeamOverview,
} from "../models/agent.js";

// ============ 持久化字段类型（对应 agents 表）===========
interface PersistedAgent {
  id: string;
  name: string;
  role: string;
  level: number;
  description: string | null;
  in_group: boolean;
  default_model: string | null;
  capabilities: string | null; // JSON text
  workspace: string | null;
  session_key: string | null;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
}

// ============ 内存存储：Agent 运行时状态 ============
const agentRuntimes: Map<string, AgentRuntime> = new Map();

// 初始化运行时状态（从 DB 加载后填充）
function ensureRuntime(name: string): void {
  if (!agentRuntimes.has(name)) {
    agentRuntimes.set(name, {
      name,
      status: "offline",
      currentTask: null,
      currentTaskStartedAt: null,
      lastHeartbeat: null,
      loadScore: 0,
    });
  }
}

// ============ Agent 列表内存缓存（TTL 30 秒）===========
interface CacheEntry {
  agents: AgentDetail[];
  fetchedAt: number;
}

let agentsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 30_000;

function getCachedAgents(): AgentDetail[] | null {
  if (!agentsCache) return null;
  if (Date.now() - agentsCache.fetchedAt > CACHE_TTL_MS) {
    agentsCache = null;
    return null;
  }
  return agentsCache.agents;
}

function setCachedAgents(agents: AgentDetail[]): void {
  agentsCache = { agents, fetchedAt: Date.now() };
}

function invalidateCache(): void {
  agentsCache = null;
}

// ============ 数据转换：DB row → AgentDetail ==========
function toAgentDetail(row: PersistedAgent, runtime?: AgentRuntime): AgentDetail {
  let capabilities: string[] = [];
  try {
    if (row.capabilities) capabilities = JSON.parse(row.capabilities);
  } catch { /* ignore */ }

  return {
    id: row.id,
    name: row.name,
    role: row.role as AgentDetail["role"],
    level: row.level as AgentDetail["level"],
    description: row.description || "",
    inGroup: row.in_group,
    defaultModel: row.default_model || "",
    capabilities,
    workspace: row.workspace || "",
    sessionKey: row.session_key,
    status: row.status, // persisted: 'active' | 'disabled'
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // runtime fields
    statusRuntime: runtime?.status || "offline",
    currentTask: runtime?.currentTask || null,
    currentTaskStartedAt: runtime?.currentTaskStartedAt || null,
    lastHeartbeat: runtime?.lastHeartbeat || null,
    loadScore: runtime?.loadScore || 0,
  };
}

// ============ Seed：首次启动时从 AGENT_TEAM 填充 ==========
export async function seedDefaultAgents(): Promise<void> {
  const row = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM agents");
  if (row && parseInt(row.count) > 0) return;

  console.log("[agentService] Seeding default agents from AGENT_TEAM...");
  for (const agent of AGENT_TEAM) {
    const id = `agent_${agent.name}_${Date.now()}`;
    await execute(
      `INSERT INTO agents (id, name, role, level, description, in_group, default_model, capabilities, workspace, session_key, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active')
       ON CONFLICT (name) DO NOTHING`,
      [
        id,
        agent.name,
        agent.role,
        agent.level,
        agent.description,
        agent.inGroup,
        agent.defaultModel,
        JSON.stringify(agent.capabilities),
        agent.workspace,
        agent.sessionKey,
      ]
    );
  }
  invalidateCache();
  console.log(`[agentService] Seeded ${AGENT_TEAM.length} agents`);
}

// ============ Agent 服务 ============

/**
 * 获取所有 Agent 列表（配置 + 运行时），带内存缓存
 */
export async function getAllAgents(): Promise<AgentDetail[]> {
  const cached = getCachedAgents();
  if (cached) return cached;

  const rows = await query<PersistedAgent>(
    "SELECT * FROM agents ORDER BY level DESC, name ASC"
  );

  // Ensure runtime entries exist
  rows.forEach((row) => ensureRuntime(row.name));

  const agents = rows.map((row) => toAgentDetail(row, agentRuntimes.get(row.name)));
  setCachedAgents(agents);
  return agents;
}

/**
 * 获取单个 Agent 详情
 */
export async function getAgent(name: string): Promise<AgentDetail | null> {
  const cached = getCachedAgents();
  if (cached) {
    return cached.find((a) => a.name === name) || null;
  }

  const row = await queryOne<PersistedAgent>(
    "SELECT * FROM agents WHERE name = $1",
    [name]
  );
  if (!row) return null;

  ensureRuntime(name);
  return toAgentDetail(row, agentRuntimes.get(name));
}

/**
 * 获取单个 Agent 详情（按 name 查询，DB 直接查）
 */
export async function getAgentByName(name: string): Promise<AgentDetail | null> {
  return getAgent(name);
}

/**
 * 更新 Agent 配置（部分字段，写 DB）
 */
export async function updateAgentConfig(
  name: string,
  updates: Partial<Pick<AgentDetail, "defaultModel" | "capabilities">>
): Promise<AgentDetail | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  if (updates.defaultModel !== undefined) {
    sets.push(`default_model = $${idx++}`);
    vals.push(updates.defaultModel);
  }
  if (updates.capabilities !== undefined) {
    sets.push(`capabilities = $${idx++}`);
    vals.push(JSON.stringify(updates.capabilities));
  }

  if (sets.length === 0) return getAgent(name);

  sets.push(`updated_at = NOW()`);
  vals.push(name);

  await execute(
    `UPDATE agents SET ${sets.join(", ")} WHERE name = $${idx}`,
    vals
  );

  invalidateCache();
  return getAgent(name);
}

/**
 * 创建新 Agent
 */
export async function createAgent(
  config: Omit<AgentConfig, "sessionKey"> & { sessionKey?: string }
): Promise<AgentDetail | null> {
  const id = `agent_${config.name}_${Date.now()}`;
  const sessionKey = config.sessionKey || `agent:${config.name}:feishu`;

  try {
    await execute(
      `INSERT INTO agents (id, name, role, level, description, in_group, default_model, capabilities, workspace, session_key, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active')`,
      [
        id,
        config.name,
        config.role,
        config.level,
        config.description,
        config.inGroup,
        config.defaultModel,
        JSON.stringify(config.capabilities),
        config.workspace,
        sessionKey,
      ]
    );
    ensureRuntime(config.name);
    invalidateCache();
    return getAgent(config.name);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      throw new Error(`Agent '${config.name}' 已存在`);
    }
    throw err;
  }
}

/**
 * 删除 Agent
 */
export async function deleteAgent(name: string): Promise<boolean> {
  // 运行时状态清理
  agentRuntimes.delete(name);
  const rowCount = await execute("DELETE FROM agents WHERE name = $1", [name]);
  if (rowCount > 0) {
    invalidateCache();
    return true;
  }
  return false;
}

/**
 * 更新 Agent 状态（启用/禁用）
 */
export async function updateAgentStatus(
  name: string,
  status: "active" | "disabled"
): Promise<AgentDetail | null> {
  const rowCount = await execute(
    "UPDATE agents SET status = $1, updated_at = NOW() WHERE name = $2",
    [status, name]
  );
  if (rowCount === 0) return null;
  invalidateCache();
  return getAgent(name);
}

/**
 * 获取 Agent 历史会话列表（真实数据）
 * 从 ~/.openclaw/agents/{name}/sessions/ 目录读取
 */
export async function getAgentSessions(
  name: string
): Promise<{ sessionId: string; updatedAt: string; label: string }[]> {
  const config = (await getAgent(name)) as AgentDetail | null;
  if (!config) return [];

  const sessionsDir = path.join(
    os.homedir(),
    ".openclaw",
    "agents",
    name,
    "sessions"
  );

  if (!fs.existsSync(sessionsDir)) {
    return [
      {
        sessionId: `session_${name}_001`,
        updatedAt: new Date().toISOString(),
        label: `${config.role} 当前会话（无历史）`,
      },
    ];
  }

  try {
    const files = fs
      .readdirSync(sessionsDir)
      .filter((f) => f.endsWith(".jsonl"));

    const sorted = files
      .map((file) => {
        const filePath = path.join(sessionsDir, file);
        const stat = fs.statSync(filePath);
        return {
          sessionId: file.replace(".jsonl", ""),
          updatedAt: stat.mtime.toISOString(),
          label: `${config.role} 会话 ${file.slice(0, 8)}`,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 20);

    return sorted.length > 0
      ? sorted
      : [
          {
            sessionId: `session_${name}_001`,
            updatedAt: new Date().toISOString(),
            label: `${config.role} 当前会话（无历史）`,
          },
        ];
  } catch {
    return [
      {
        sessionId: `session_${name}_001`,
        updatedAt: new Date().toISOString(),
        label: `${config.role} 当前会话（读取失败）`,
      },
    ];
  }
}

/**
 * 获取团队概览
 */
export async function getTeamOverviewData(): Promise<TeamOverview> {
  const agents = await getAllAgents();

  const levelsMap: Record<number, AgentDetail[]> = {};
  for (const a of agents) {
    if (!levelsMap[a.level]) levelsMap[a.level] = [];
    levelsMap[a.level].push(a);
  }

  const levels = [3, 2, 1]
    .filter((l) => levelsMap[l]?.length)
    .map((level) => ({
      level: level as 1 | 2 | 3,
      label: `Lv${level}`,
      agents: levelsMap[level] || [],
    }));

  return {
    levels,
    dispatchMatrix: DISPATCH_MATRIX,
  };
}

/**
 * 更新 Agent 运行时状态
 */
export function updateRuntimeStatus(
  name: string,
  status: AgentStatus,
  taskId?: string
): boolean {
  ensureRuntime(name);
  const runtime = agentRuntimes.get(name)!;
  runtime.status = status;
  runtime.lastHeartbeat = new Date().toISOString();
  if (taskId) {
    runtime.currentTask = taskId;
    runtime.currentTaskStartedAt = new Date().toISOString();
  }
  return true;
}

/**
 * 释放 Agent 任务（任务完成时调用）
 */
export function releaseAgent(name: string): boolean {
  const runtime = agentRuntimes.get(name);
  if (!runtime) return false;
  runtime.status = "idle";
  runtime.currentTask = null;
  runtime.currentTaskStartedAt = null;
  runtime.loadScore = Math.max(0, runtime.loadScore - 20);
  return true;
}

/**
 * 更新 Agent 负载评分
 */
export function updateLoadScore(name: string, delta: number): boolean {
  const runtime = agentRuntimes.get(name);
  if (!runtime) return false;
  runtime.loadScore = Math.max(0, Math.min(100, runtime.loadScore + delta));
  return true;
}

/**
 * 获取可用 Agent（用于负载均衡选择 coder）
 */
export async function getAvailableAgents(level?: number): Promise<string[]> {
  const agents = await getAllAgents();
  const filtered = level ? agents.filter((a) => a.level === level) : agents;

  return filtered
    .filter((a) => {
      const runtime = agentRuntimes.get(a.name);
      return (
        a.status !== "disabled" &&
        (runtime?.status === "idle" || (runtime?.loadScore || 0) < 70)
      );
    })
    .sort((a, b) => {
      const scoreA = agentRuntimes.get(a.name)?.loadScore || 0;
      const scoreB = agentRuntimes.get(b.name)?.loadScore || 0;
      return scoreA - scoreB;
    })
    .map((a) => a.name);
}

// Alias for backward compatibility
export { getAgent as getAgentDetail };
