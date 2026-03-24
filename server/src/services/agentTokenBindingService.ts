/**
 * Agent-Token 绑定服务
 * 绑定 CRUD + 调度查询
 */

import { query, queryOne, execute } from '../db/pg.js';
import type {
  AgentTokenBinding,
  AgentTokenBindingRow,
  CreateBindingParams,
  UpdateBindingParams,
  BindingOverview,
  ModelTier,
} from '../models/agentTokenBinding.js';
import { apiTokenService } from './apiTokenService.js';

// ========== 工具函数 ==========

function generateId(): string {
  return `binding_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function rowToBinding(row: AgentTokenBindingRow): AgentTokenBinding {
  return {
    id: row.id,
    agentName: row.agent_name,
    tokenId: row.token_id,
    priority: row.priority,
    modelFilter: row.model_filter ? JSON.parse(row.model_filter) : undefined,
    tierFilter: row.tier_filter ? JSON.parse(row.tier_filter) : undefined,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ========== CRUD 操作 ==========

/**
 * 获取 Agent 的所有 Token 绑定
 * @param agentName Agent 名称
 * @param enabledOnly 仅返回启用状态的绑定
 * @returns 按 priority 排序的绑定列表
 */
export async function getBindingsByAgent(
  agentName: string,
  enabledOnly: boolean = false
): Promise<AgentTokenBinding[]> {
  let sql = 'SELECT * FROM agent_token_binding WHERE agent_name = $1';
  if (enabledOnly) {
    sql += ' AND enabled = TRUE';
  }
  sql += ' ORDER BY priority ASC, created_at ASC';

  const rows = await query<AgentTokenBindingRow>(sql, [agentName]);
  return rows.map(rowToBinding);
}

/**
 * 根据绑定 ID 获取绑定详情
 */
export async function getBindingById(id: string): Promise<AgentTokenBinding | null> {
  const row = await queryOne<AgentTokenBindingRow>(
    'SELECT * FROM agent_token_binding WHERE id = $1',
    [id]
  );
  return row ? rowToBinding(row) : null;
}

/**
 * 为 Agent 创建 Token 绑定
 */
export async function createBinding(params: CreateBindingParams): Promise<AgentTokenBinding> {
  const id = generateId();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO agent_token_binding (
      id, agent_name, token_id, priority, model_filter, tier_filter, enabled, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      params.agentName,
      params.tokenId,
      params.priority,
      params.modelFilter ? JSON.stringify(params.modelFilter) : null,
      params.tierFilter ? JSON.stringify(params.tierFilter) : null,
      params.enabled !== undefined ? params.enabled : true,
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
 * 更新绑定配置
 */
export async function updateBinding(
  id: string,
  params: UpdateBindingParams
): Promise<AgentTokenBinding | null> {
  const existing = await queryOne<AgentTokenBindingRow>(
    'SELECT * FROM agent_token_binding WHERE id = $1',
    [id]
  );
  if (!existing) return null;

  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let i = 1;

  if (params.tokenId !== undefined) {
    updates.push(`token_id = $${i++}`);
    values.push(params.tokenId);
  }
  if (params.priority !== undefined) {
    updates.push(`priority = $${i++}`);
    values.push(params.priority);
  }
  if (params.modelFilter !== undefined) {
    updates.push(`model_filter = $${i++}`);
    values.push(params.modelFilter.length > 0 ? JSON.stringify(params.modelFilter) : null);
  }
  if (params.tierFilter !== undefined) {
    updates.push(`tier_filter = $${i++}`);
    values.push(params.tierFilter.length > 0 ? JSON.stringify(params.tierFilter) : null);
  }
  if (params.enabled !== undefined) {
    updates.push(`enabled = $${i++}`);
    values.push(params.enabled);
  }

  if (updates.length === 0) {
    return rowToBinding(existing);
  }

  updates.push(`updated_at = $${i++}`);
  values.push(new Date().toISOString());
  values.push(id);

  await execute(
    `UPDATE agent_token_binding SET ${updates.join(', ')} WHERE id = $${i}`,
    values
  );

  return getBindingById(id);
}

/**
 * 删除绑定
 */
export async function deleteBinding(id: string): Promise<boolean> {
  const result = await execute('DELETE FROM agent_token_binding WHERE id = $1', [id]);
  return result > 0;
}

/**
 * 获取所有绑定列表
 */
export async function getAllBindings(): Promise<AgentTokenBinding[]> {
  const rows = await query<AgentTokenBindingRow>(
    'SELECT * FROM agent_token_binding ORDER BY agent_name ASC, priority ASC'
  );
  return rows.map(rowToBinding);
}

// ========== 调度查询 ==========

/**
 * 查询 Agent 在特定 tier 下可用的绑定
 * 筛选条件：enabled=true，tierFilter 包含目标 tier
 * @param agentName Agent 名称
 * @param tier 目标层级
 * @param modelName 可选的模型名称
 */
export async function getAvailableBindingsForAgent(
  agentName: string,
  tier: ModelTier,
  modelName?: string
): Promise<AgentTokenBinding[]> {
  const bindings = await getBindingsByAgent(agentName, true);

  return bindings.filter((binding) => {
    // tierFilter 筛选
    if (binding.tierFilter && binding.tierFilter.length > 0) {
      if (!binding.tierFilter.includes(tier)) {
        return false;
      }
    }
    // modelFilter 筛选
    if (binding.modelFilter && binding.modelFilter.length > 0 && modelName) {
      if (!binding.modelFilter.includes(modelName)) {
        return false;
      }
    }
    return true;
  });
}

// ========== 概览 ==========

/**
 * 获取全局绑定概览（矩阵视图数据）
 */
export async function getBindingOverview(): Promise<BindingOverview> {
  const bindings = await getAllBindings();
  const tokens = await apiTokenService.getAllTokens(false);

  // 收集所有 Agent
  const agentsSet = new Set<string>();
  bindings.forEach((b) => agentsSet.add(b.agentName));

  // 构建矩阵
  const matrix: Record<string, Record<string, AgentTokenBinding | null>> = {};
  agentsSet.forEach((agent) => {
    matrix[agent] = {};
    tokens.forEach((token) => {
      const binding = bindings.find(
        (b) => b.agentName === agent && b.tokenId === token.id
      );
      matrix[agent][token.id] = binding || null;
    });
  });

  return {
    agents: Array.from(agentsSet).sort(),
    tokens: tokens.map((t) => ({ id: t.id, alias: t.alias, provider: t.provider })),
    matrix,
  };
}

// ========== 导出 ==========

export const agentTokenBindingService = {
  getBindingsByAgent,
  getBindingById,
  createBinding,
  updateBinding,
  deleteBinding,
  getAllBindings,
  getAvailableBindingsForAgent,
  getBindingOverview,
};

export default agentTokenBindingService;
