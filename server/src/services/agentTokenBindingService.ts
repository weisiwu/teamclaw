/**
 * Agent Token Binding 服务
 * 绑定 CRUD + 调度查询
 */

import { query, queryOne, execute } from '../db/pg.js';
import type {
  AgentTokenBinding,
  AgentTokenBindingRow,
  AgentTokenBindingDetail,
  CreateAgentTokenBindingParams,
  UpdateAgentTokenBindingParams,
  BindingOverviewRow,
  ResolvedToken,
  TokenResolutionContext,
} from '../models/agentTokenBinding.js';
import { apiTokenService } from './apiTokenService.js';
import { AGENT_TEAM } from '../constants/agents.js';

/**
 * 将数据库行转换为 AgentTokenBinding
 */
function rowToBinding(row: AgentTokenBindingRow): AgentTokenBinding {
  return {
    id: row.id,
    agentName: row.agent_name,
    tokenId: row.token_id,
    priority: row.priority,
    modelFilter: row.model_filter ? JSON.parse(row.model_filter) : undefined,
    tierFilter: row.tier_filter ? JSON.parse(row.tier_filter) : undefined,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `bind_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 获取 Agent 的显示名称
 */
function getAgentDisplayName(agentName: string): string | undefined {
  const agent = AGENT_TEAM.find(a => a.name === agentName);
  return agent?.role;
}

// ========== CRUD 操作 ==========

/**
 * 获取指定 Agent 的所有 Token 绑定
 * @param agentName Agent 名称
 * @returns 绑定列表（按优先级排序）
 */
export async function getBindingsByAgent(agentName: string): Promise<AgentTokenBindingDetail[]> {
  const rows = await query<AgentTokenBindingRow & {
    token_alias: string;
    token_provider: string;
    token_status: string;
  }>(
    `SELECT 
      b.*,
      t.alias as token_alias,
      t.provider as token_provider,
      t.status as token_status
     FROM agent_token_bindings b
     JOIN api_tokens t ON b.token_id = t.id
     WHERE b.agent_name = $1
     ORDER BY b.priority ASC, b.created_at ASC`,
    [agentName]
  );

  return rows.map(row => ({
    ...rowToBinding(row),
    tokenAlias: row.token_alias,
    tokenProvider: row.token_provider,
    tokenStatus: row.token_status,
    agentDisplayName: getAgentDisplayName(agentName),
  }));
}

/**
 * 获取指定 Token 的所有 Agent 绑定
 * @param tokenId Token ID
 * @returns 绑定列表
 */
export async function getBindingsByToken(tokenId: string): Promise<AgentTokenBinding[]> {
  const rows = await query<AgentTokenBindingRow>(
    'SELECT * FROM agent_token_bindings WHERE token_id = $1 ORDER BY priority ASC',
    [tokenId]
  );
  return rows.map(rowToBinding);
}

/**
 * 根据 ID 获取绑定
 * @param id 绑定 ID
 * @returns 绑定详情，不存在返回 null
 */
export async function getBindingById(id: string): Promise<AgentTokenBindingDetail | null> {
  const row = await queryOne<AgentTokenBindingRow & {
    token_alias: string;
    token_provider: string;
    token_status: string;
  }>(
    `SELECT 
      b.*,
      t.alias as token_alias,
      t.provider as token_provider,
      t.status as token_status
     FROM agent_token_bindings b
     JOIN api_tokens t ON b.token_id = t.id
     WHERE b.id = $1`,
    [id]
  );

  if (!row) return null;

  return {
    ...rowToBinding(row),
    tokenAlias: row.token_alias,
    tokenProvider: row.token_provider,
    tokenStatus: row.token_status,
    agentDisplayName: getAgentDisplayName(row.agent_name),
  };
}

/**
 * 创建绑定
 * @param params 创建参数
 * @returns 新创建的绑定
 */
export async function createBinding(
  params: CreateAgentTokenBindingParams
): Promise<AgentTokenBindingDetail> {
  // 验证 Token 是否存在
  const token = await apiTokenService.getTokenById(params.tokenId);
  if (!token) {
    throw new Error(`Token ${params.tokenId} not found`);
  }

  // 验证 Agent 是否存在
  const agent = AGENT_TEAM.find(a => a.name === params.agentName);
  if (!agent) {
    throw new Error(`Agent ${params.agentName} not found`);
  }

  // 检查是否已存在相同的绑定
  const existing = await queryOne<AgentTokenBindingRow>(
    'SELECT * FROM agent_token_bindings WHERE agent_name = $1 AND token_id = $2',
    [params.agentName, params.tokenId]
  );
  if (existing) {
    throw new Error(`Binding already exists for agent ${params.agentName} and token ${params.tokenId}`);
  }

  const id = generateId();
  const now = new Date().toISOString();
  const priority = params.priority ?? 1;

  await execute(
    `INSERT INTO agent_token_bindings (
      id, agent_name, token_id, priority, model_filter, tier_filter,
      enabled, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      params.agentName,
      params.tokenId,
      priority,
      params.modelFilter ? JSON.stringify(params.modelFilter) : null,
      params.tierFilter ? JSON.stringify(params.tierFilter) : null,
      1, // enabled
      now,
      now,
    ]
  );

  const created = await getBindingById(id);
  if (!created) {
    throw new Error('Failed to create binding');
  }
  return created;
}

/**
 * 更新绑定
 * @param id 绑定 ID
 * @param params 更新参数
 * @returns 更新后的绑定，不存在返回 null
 */
export async function updateBinding(
  id: string,
  params: UpdateAgentTokenBindingParams
): Promise<AgentTokenBindingDetail | null> {
  // 检查绑定是否存在
  const existing = await queryOne<AgentTokenBindingRow>(
    'SELECT * FROM agent_token_bindings WHERE id = $1',
    [id]
  );
  if (!existing) return null;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (params.priority !== undefined) {
    updates.push(`priority = $${paramIndex++}`);
    values.push(params.priority);
  }

  if (params.modelFilter !== undefined) {
    updates.push(`model_filter = $${paramIndex++}`);
    values.push(params.modelFilter ? JSON.stringify(params.modelFilter) : null);
  }

  if (params.tierFilter !== undefined) {
    updates.push(`tier_filter = $${paramIndex++}`);
    values.push(params.tierFilter ? JSON.stringify(params.tierFilter) : null);
  }

  if (params.enabled !== undefined) {
    updates.push(`enabled = $${paramIndex++}`);
    values.push(params.enabled ? 1 : 0);
  }

  // 始终更新 updated_at
  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date().toISOString());

  // 添加 ID 作为最后一个参数
  values.push(id);

  await execute(
    `UPDATE agent_token_bindings SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  return getBindingById(id);
}

/**
 * 删除绑定
 * @param id 绑定 ID
 * @returns 是否删除成功
 */
export async function deleteBinding(id: string): Promise<boolean> {
  const affectedRows = await execute('DELETE FROM agent_token_bindings WHERE id = $1', [id]);
  return affectedRows > 0;
}

/**
 * 切换绑定启用状态
 * @param id 绑定 ID
 * @param enabled 是否启用
 * @returns 更新后的绑定，不存在返回 null
 */
export async function toggleBindingEnabled(id: string, enabled: boolean): Promise<AgentTokenBindingDetail | null> {
  return updateBinding(id, { enabled });
}

// ========== 调度查询 ==========

/**
 * 解析 Token（调度器）
 * 根据 Agent 和层级返回可用的 Token 列表（按优先级排序）
 * @param context 调度上下文
 * @returns 解析后的 Token 列表（已解密）
 */
export async function resolveTokens(
  context: TokenResolutionContext
): Promise<ResolvedToken[]> {
  const { agentName, tier, preferredModel } = context;

  // 查询该 Agent 的所有启用的绑定，按优先级排序
  const rows = await query<AgentTokenBindingRow>(
    `SELECT * FROM agent_token_bindings 
     WHERE agent_name = $1 AND enabled = 1
     ORDER BY priority ASC, created_at ASC`,
    [agentName]
  );

  const resolved: ResolvedToken[] = [];

  for (const row of rows) {
    const binding = rowToBinding(row);

    // 筛选 tierFilter 匹配的绑定
    if (binding.tierFilter && binding.tierFilter.length > 0) {
      if (!binding.tierFilter.includes(tier)) {
        continue;
      }
    }

    // 如果指定了 preferredModel，筛选 modelFilter 匹配的绑定
    if (preferredModel && binding.modelFilter && binding.modelFilter.length > 0) {
      if (!binding.modelFilter.some(m => preferredModel.includes(m) || m.includes(preferredModel))) {
        continue;
      }
    }

    // 获取 Token 详情（包含解密后的 API Key）
    const fullToken = await apiTokenService.getFullTokenById(binding.tokenId);
    if (!fullToken) {
      continue;
    }

    // 检查 Token 状态
    if (fullToken.status !== 'active') {
      continue;
    }

    // 检查预算是否超限
    if (fullToken.monthlyBudgetUsd && fullToken.currentMonthUsageUsd >= fullToken.monthlyBudgetUsd) {
      continue;
    }

    resolved.push({
      bindingId: binding.id,
      tokenId: fullToken.id,
      apiKey: fullToken.apiKey,
      provider: fullToken.provider,
      baseUrl: fullToken.baseUrl,
      models: fullToken.models,
      priority: binding.priority,
    });
  }

  return resolved;
}

/**
 * 获取首选 Token
 * 返回优先级最高的可用 Token
 * @param context 调度上下文
 * @returns 首选 Token，无可用返回 null
 */
export async function getPreferredToken(
  context: TokenResolutionContext
): Promise<ResolvedToken | null> {
  const tokens = await resolveTokens(context);
  return tokens.length > 0 ? tokens[0] : null;
}

// ========== 概览统计 ==========

/**
 * 获取全局绑定概览（矩阵视图数据）
 * @returns 绑定概览列表
 */
export async function getBindingOverview(): Promise<BindingOverviewRow[]> {
  const rows = await query<{
    agent_name: string;
    binding_id: string;
    token_alias: string;
    token_provider: string;
    priority: number;
    tier_filter: string | null;
    enabled: number;
  }>(
    `SELECT 
      b.agent_name,
      b.id as binding_id,
      t.alias as token_alias,
      t.provider as token_provider,
      b.priority,
      b.tier_filter,
      b.enabled
     FROM agent_token_bindings b
     JOIN api_tokens t ON b.token_id = t.id
     ORDER BY b.agent_name, b.priority ASC`
  );

  // 按 Agent 分组
  const agentMap = new Map<string, BindingOverviewRow>();

  for (const row of rows) {
    if (!agentMap.has(row.agent_name)) {
      agentMap.set(row.agent_name, {
        agentName: row.agent_name,
        agentDisplayName: getAgentDisplayName(row.agent_name),
        bindings: [],
      });
    }

    const agentRow = agentMap.get(row.agent_name)!;
    agentRow.bindings.push({
      bindingId: row.binding_id,
      tokenAlias: row.token_alias,
      tokenProvider: row.token_provider,
      priority: row.priority,
      tierFilter: row.tier_filter ? JSON.parse(row.tier_filter) : undefined,
      enabled: row.enabled === 1,
    });
  }

  // 包含没有绑定的 Agent
  for (const agent of AGENT_TEAM) {
    if (!agentMap.has(agent.name)) {
      agentMap.set(agent.name, {
        agentName: agent.name,
        agentDisplayName: agent.role,
        bindings: [],
      });
    }
  }

  return Array.from(agentMap.values()).sort((a, b) =>
    a.agentName.localeCompare(b.agentName)
  );
}

/**
 * 获取统计信息
 * @returns 统计数据
 */
export async function getBindingStats(): Promise<{
  totalBindings: number;
  activeBindings: number;
  agentsWithBindings: number;
  tokensInUse: number;
}> {
  const totalResult = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM agent_token_bindings');
  const activeResult = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM agent_token_bindings WHERE enabled = 1');
  const agentsResult = await queryOne<{ count: string }>(
    'SELECT COUNT(DISTINCT agent_name) as count FROM agent_token_bindings'
  );
  const tokensResult = await queryOne<{ count: string }>(
    'SELECT COUNT(DISTINCT token_id) as count FROM agent_token_bindings'
  );

  return {
    totalBindings: parseInt(totalResult?.count || '0', 10),
    activeBindings: parseInt(activeResult?.count || '0', 10),
    agentsWithBindings: parseInt(agentsResult?.count || '0', 10),
    tokensInUse: parseInt(tokensResult?.count || '0', 10),
  };
}

// ========== 导出 ==========

export const agentTokenBindingService = {
  // CRUD
  getBindingsByAgent,
  getBindingsByToken,
  getBindingById,
  createBinding,
  updateBinding,
  deleteBinding,
  toggleBindingEnabled,

  // 调度
  resolveTokens,
  getPreferredToken,

  // 概览
  getBindingOverview,
  getBindingStats,
};

export default agentTokenBindingService;
