/**
 * Agent-Tool Binding 服务
 * 绑定 CRUD + 权限查询
 */

import { query, queryOne, execute } from '../db/pg.js';
import type {
  AgentToolBinding,
  AgentToolBindingRow,
  AgentToolBindingDetail,
  CreateAgentToolBindingParams,
  UpdateAgentToolBindingParams,
  AgentToolMatrixRow,
  AgentToolDefaultStrategy,
} from '../models/agentToolBinding.js';
import { AGENT_TEAM } from '../constants/agents.js';
import { toolService } from './toolService.js';

/**
 * 将数据库行转换为 AgentToolBinding
 */
function rowToBinding(row: AgentToolBindingRow): AgentToolBinding {
  return {
    id: row.id,
    agentName: row.agent_name,
    toolId: row.tool_id,
    enabled: row.enabled === 1,
    requiresApproval: row.requires_approval === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `atb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 获取 Agent 的显示名称
 */
function getAgentDisplayName(agentName: string): string | undefined {
  const agent = AGENT_TEAM.find(a => a.name === agentName);
  return agent?.role;
}

// ========== 权限核心方法 ==========

/**
 * 检查 Agent 是否可以使用指定 Tool
 * @param agentName Agent 名称
 * @param toolId Tool ID
 * @returns 是否允许使用
 */
export async function canUse(agentName: string, toolId: string): Promise<boolean> {
  // 1. 检查 Tool 是否存在且全局启用
  const tool = await toolService.getToolById(toolId);
  if (!tool || !tool.enabled) {
    return false;
  }

  // 2. 查询该 Agent 对该 Tool 的显式绑定
  const binding = await queryOne<AgentToolBindingRow>(
    'SELECT * FROM agent_tool_bindings WHERE agent_name = $1 AND tool_id = $2',
    [agentName, toolId]
  );

  if (binding) {
    // 有显式绑定时，使用绑定的 enabled 字段
    return binding.enabled === 1;
  }

  // 3. 无显式绑定，使用默认策略（默认：allow_all）
  // TODO: 从系统配置读取实际策略
  const strategy: AgentToolDefaultStrategy = 'allow_all';

  if (strategy === 'deny_all') {
    return false;
  }

  if (strategy === 'by_level') {
    const agent = AGENT_TEAM.find(a => a.name === agentName);
    if (!agent) return false;

    const riskOrder = { low: 0, medium: 1, high: 2 };
    const maxRisk = { 1: 'low', 2: 'medium', 3: 'high' }[agent.level] || 'low';
    return riskOrder[tool.riskLevel] <= riskOrder[maxRisk];
  }

  // allow_all: 默认允许
  return true;
}

/**
 * 检查 Agent 使用指定 Tool 是否需要人工审批
 * @param agentName Agent 名称
 * @param toolId Tool ID
 * @returns 是否需要审批
 */
export async function needsApproval(agentName: string, toolId: string): Promise<boolean> {
  // 1. 查询显式绑定
  const binding = await queryOne<AgentToolBindingRow>(
    'SELECT * FROM agent_tool_bindings WHERE agent_name = $1 AND tool_id = $2',
    [agentName, toolId]
  );

  if (binding) {
    // 有显式绑定：优先使用绑定的 requiresApproval
    // requiresApproval = 1: 强制需要审批
    // requiresApproval = 0: 跟随 Tool 默认设置
    if (binding.requires_approval === 1) {
      return true;
    }
    if (binding.requires_approval === 0) {
      // 跟随 Tool 默认设置
      const tool = await toolService.getToolById(toolId);
      return tool?.requiresApproval ?? false;
    }
  }

  // 2. 无显式绑定，使用 Tool 默认设置
  const tool = await toolService.getToolById(toolId);
  return tool?.requiresApproval ?? false;
}

// ========== CRUD 操作 ==========

/**
 * 获取 Agent 的所有 Tool 绑定
 * @param agentName Agent 名称
 * @returns 绑定列表
 */
export async function getBindingsByAgent(agentName: string): Promise<AgentToolBindingDetail[]> {
  const rows = await query<AgentToolBindingRow & {
    tool_name: string;
    tool_display_name: string;
    tool_category: string;
    tool_risk_level: string;
    tool_requires_approval: number;
    tool_enabled: number;
  }>(
    `SELECT 
      b.*,
      t.name as tool_name,
      t.display_name as tool_display_name,
      t.category as tool_category,
      t.risk_level as tool_risk_level,
      t.requires_approval as tool_requires_approval,
      t.enabled as tool_enabled
     FROM agent_tool_bindings b
     JOIN tools t ON b.tool_id = t.id
     WHERE b.agent_name = $1
     ORDER BY t.category, t.display_name`,
    [agentName]
  );

  return rows.map(row => ({
    ...rowToBinding(row),
    toolName: row.tool_name,
    toolDisplayName: row.tool_display_name,
    toolCategory: row.tool_category,
    toolRiskLevel: row.tool_risk_level,
    toolRequiresApproval: row.tool_requires_approval === 1,
    toolEnabled: row.tool_enabled === 1,
  }));
}

/**
 * 获取 Tool 的所有 Agent 绑定
 * @param toolId Tool ID
 * @returns 绑定列表
 */
export async function getBindingsByTool(toolId: string): Promise<AgentToolBinding[]> {
  const rows = await query<AgentToolBindingRow>(
    'SELECT * FROM agent_tool_bindings WHERE tool_id = $1 ORDER BY agent_name',
    [toolId]
  );
  return rows.map(rowToBinding);
}

/**
 * 根据 ID 获取绑定
 * @param id 绑定 ID
 * @returns 绑定详情，不存在返回 null
 */
export async function getBindingById(id: string): Promise<AgentToolBindingDetail | null> {
  const row = await queryOne<AgentToolBindingRow & {
    tool_name: string;
    tool_display_name: string;
    tool_category: string;
    tool_risk_level: string;
    tool_requires_approval: number;
    tool_enabled: number;
  }>(
    `SELECT 
      b.*,
      t.name as tool_name,
      t.display_name as tool_display_name,
      t.category as tool_category,
      t.risk_level as tool_risk_level,
      t.requires_approval as tool_requires_approval,
      t.enabled as tool_enabled
     FROM agent_tool_bindings b
     JOIN tools t ON b.tool_id = t.id
     WHERE b.id = $1`,
    [id]
  );

  if (!row) return null;

  return {
    ...rowToBinding(row),
    toolName: row.tool_name,
    toolDisplayName: row.tool_display_name,
    toolCategory: row.tool_category,
    toolRiskLevel: row.tool_risk_level,
    toolRequiresApproval: row.tool_requires_approval === 1,
    toolEnabled: row.tool_enabled === 1,
  };
}

/**
 * 获取或创建绑定（upsert）
 * @param agentName Agent 名称
 * @param toolId Tool ID
 * @returns 绑定详情
 */
export async function getOrCreateBinding(
  agentName: string,
  toolId: string
): Promise<AgentToolBindingDetail> {
  const existing = await queryOne<AgentToolBindingRow>(
    'SELECT * FROM agent_tool_bindings WHERE agent_name = $1 AND tool_id = $2',
    [agentName, toolId]
  );

  if (existing) {
    const detail = await getBindingById(existing.id);
    return detail!;
  }

  const id = generateId();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO agent_tool_bindings (id, agent_name, tool_id, enabled, requires_approval, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (agent_name, tool_id) DO NOTHING`,
    [id, agentName, toolId, 1, 0, now, now]
  );

  // 重新查询以获取完整信息
  const row = await queryOne<AgentToolBindingRow>(
    'SELECT * FROM agent_tool_bindings WHERE agent_name = $1 AND tool_id = $2',
    [agentName, toolId]
  );
  return getBindingById(row!.id)!;
}

/**
 * 批量设置 Agent 的 Tool 绑定
 * @param agentName Agent 名称
 * @param bindings 要设置的绑定数组
 * @returns 更新后的绑定列表
 */
export async function setAgentToolBindings(
  agentName: string,
  bindings: Array<{ toolId: string; enabled: boolean; requiresApproval?: boolean }>
): Promise<AgentToolBindingDetail[]> {
  const now = new Date().toISOString();
  const results: AgentToolBindingDetail[] = [];

  for (const binding of bindings) {
    const existing = await queryOne<AgentToolBindingRow>(
      'SELECT * FROM agent_tool_bindings WHERE agent_name = $1 AND tool_id = $2',
      [agentName, binding.toolId]
    );

    if (existing) {
      // 更新
      await execute(
        `UPDATE agent_tool_bindings 
         SET enabled = $1, requires_approval = $2, updated_at = $3
         WHERE agent_name = $4 AND tool_id = $5`,
        [binding.enabled ? 1 : 0, binding.requiresApproval ? 1 : 0, now, agentName, binding.toolId]
      );
    } else {
      // 创建
      const id = generateId();
      await execute(
        `INSERT INTO agent_tool_bindings (id, agent_name, tool_id, enabled, requires_approval, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (agent_name, tool_id) DO UPDATE SET
           enabled = $4, requires_approval = $5, updated_at = $6`,
        [id, agentName, binding.toolId, binding.enabled ? 1 : 0, binding.requiresApproval ? 1 : 0, now, now]
      );
    }

    const detail = await getOrCreateBinding(agentName, binding.toolId);
    results.push(detail);
  }

  return results;
}

/**
 * 更新单个绑定
 * @param id 绑定 ID
 * @param params 更新参数
 * @returns 更新后的绑定，不存在返回 null
 */
export async function updateBinding(
  id: string,
  params: UpdateAgentToolBindingParams
): Promise<AgentToolBindingDetail | null> {
  const existing = await queryOne<AgentToolBindingRow>(
    'SELECT * FROM agent_tool_bindings WHERE id = $1',
    [id]
  );
  if (!existing) return null;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (params.enabled !== undefined) {
    updates.push(`enabled = $${paramIndex++}`);
    values.push(params.enabled ? 1 : 0);
  }

  if (params.requiresApproval !== undefined) {
    updates.push(`requires_approval = $${paramIndex++}`);
    values.push(params.requiresApproval ? 1 : 0);
  }

  if (updates.length === 0) {
    return getBindingById(id);
  }

  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date().toISOString());
  values.push(id);

  await execute(
    `UPDATE agent_tool_bindings SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
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
  const affectedRows = await execute('DELETE FROM agent_tool_bindings WHERE id = $1', [id]);
  return affectedRows > 0;
}

// ========== 矩阵视图 ==========

/**
 * 获取全局 Agent-Tool 绑定矩阵
 * @returns 矩阵数据
 */
export async function getAgentToolMatrix(): Promise<AgentToolMatrixRow[]> {
  // 获取所有工具
  const tools = await toolService.getAllTools(true);

  // 获取所有绑定
  const bindingRows = await query<AgentToolBindingRow & {
    tool_name: string;
    tool_display_name: string;
    tool_category: string;
    tool_risk_level: string;
  }>(
    `SELECT 
      b.*,
      t.name as tool_name,
      t.display_name as tool_display_name,
      t.category as tool_category,
      t.risk_level as tool_risk_level
     FROM agent_tool_bindings b
     JOIN tools t ON b.tool_id = t.id`
  );

  // 按 Agent 分组
  const agentMap = new Map<string, AgentToolMatrixRow>();

  // 初始化所有 Agent
  for (const agent of AGENT_TEAM) {
    agentMap.set(agent.name, {
      agentName: agent.name,
      agentDisplayName: agent.role,
      bindings: [],
    });
  }

  // 填充绑定数据
  for (const row of bindingRows) {
    if (!agentMap.has(row.agent_name)) continue;
    const agentRow = agentMap.get(row.agent_name)!;
    agentRow.bindings.push({
      toolId: row.tool_id,
      toolName: row.tool_name,
      toolDisplayName: row.tool_display_name,
      toolCategory: row.tool_category,
      toolRiskLevel: row.tool_risk_level,
      enabled: row.enabled === 1,
      requiresApproval: row.requires_approval === 1,
    });
  }

  // 为每个 Agent 补全所有 Tool（未绑定的使用默认值）
  for (const [, agentRow] of agentMap) {
    const boundToolIds = new Set(agentRow.bindings.map(b => b.toolId));
    for (const tool of tools) {
      if (!boundToolIds.has(tool.id)) {
        // 未显式绑定，使用默认值
        agentRow.bindings.push({
          toolId: tool.id,
          toolName: tool.name,
          toolDisplayName: tool.displayName,
          toolCategory: tool.category,
          toolRiskLevel: tool.riskLevel,
          enabled: tool.enabled, // 跟随 Tool 全局启用状态
          requiresApproval: tool.requiresApproval,
        });
      }
    }
    // 按分类和名称排序
    agentRow.bindings.sort((a, b) => {
      if (a.toolCategory !== b.toolCategory) {
        return a.toolCategory.localeCompare(b.toolCategory);
      }
      return a.toolDisplayName.localeCompare(b.toolDisplayName);
    });
  }

  return Array.from(agentMap.values()).sort((a, b) =>
    a.agentName.localeCompare(b.agentName)
  );
}

// ========== 统计 ==========

/**
 * 获取绑定统计信息
 */
export async function getBindingStats(): Promise<{
  totalBindings: number;
  enabledBindings: number;
  agentsWithBindings: number;
  toolsBound: number;
}> {
  const totalResult = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM agent_tool_bindings');
  const enabledResult = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM agent_tool_bindings WHERE enabled = 1');
  const agentsResult = await queryOne<{ count: string }>('SELECT COUNT(DISTINCT agent_name) as count FROM agent_tool_bindings');
  const toolsResult = await queryOne<{ count: string }>('SELECT COUNT(DISTINCT tool_id) as count FROM agent_tool_bindings');

  return {
    totalBindings: parseInt(totalResult?.count || '0', 10),
    enabledBindings: parseInt(enabledResult?.count || '0', 10),
    agentsWithBindings: parseInt(agentsResult?.count || '0', 10),
    toolsBound: parseInt(toolsResult?.count || '0', 10),
  };
}

// ========== 导出 ==========

export const agentToolBindingService = {
  // 权限核心
  canUse,
  needsApproval,

  // CRUD
  getBindingsByAgent,
  getBindingsByTool,
  getBindingById,
  getOrCreateBinding,
  setAgentToolBindings,
  updateBinding,
  deleteBinding,

  // 矩阵
  getAgentToolMatrix,

  // 统计
  getBindingStats,
};

export default agentToolBindingService;
