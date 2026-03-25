/**
 * Tool 服务
 * CRUD 操作 + 内置 Tools 注册
 */

import { generateId } from '../utils/generateId.js';
import { query, queryOne, execute } from '../db/pg.js';
import type {
  ToolDefinition,
  ToolRow,
  ToolCategory,
  CreateToolParams,
  UpdateToolParams,
  BUILTIN_TOOLS,
} from '../models/tool.js';
import { BUILTIN_TOOLS as BUILTIN_TOOLS_LIST } from '../models/tool.js';

/**
 * 将数据库行转换为 ToolDefinition
 */
function rowToTool(row: ToolRow): ToolDefinition {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    category: row.category as ToolCategory,
    source: row.source as 'builtin' | 'user' | 'imported',
    enabled: row.enabled === 1,
    parameters: JSON.parse(row.parameters || '[]'),
    outputSchema: row.output_schema || undefined,
    riskLevel: row.risk_level as 'low' | 'medium' | 'high',
    requiresApproval: row.requires_approval === 1,
    timeout: row.timeout || undefined,
    maxRetries: row.max_retries || undefined,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by || undefined,
  };
}

/**
 * 生成唯一 ID
 */
function generateId(source: string): string {
  const prefix = source === 'builtin' ? 'builtin' : 'tool';
  return generateId(prefix);
}

// ========== CRUD 操作 ==========

/**
 * 获取所有 Tools
 * @param includeDisabled 是否包含已禁用的 Tool
 * @returns Tool 列表
 */
export async function getAllTools(includeDisabled: boolean = false): Promise<ToolDefinition[]> {
  let sql = 'SELECT * FROM tools';
  if (!includeDisabled) {
    sql += " WHERE enabled = 1 OR source = 'builtin'";
  }
  sql += ' ORDER BY category, display_name';

  const rows = await query<ToolRow>(sql);
  return rows.map(rowToTool);
}

/**
 * 根据类别获取 Tools
 * @param category Tool 类别
 * @returns Tool 列表
 */
export async function getToolsByCategory(category: ToolCategory): Promise<ToolDefinition[]> {
  const rows = await query<ToolRow>(
    'SELECT * FROM tools WHERE category = $1 ORDER BY display_name',
    [category]
  );
  return rows.map(rowToTool);
}

/**
 * 根据 ID 获取 Tool
 * @param id Tool ID
 * @returns Tool 定义，不存在返回 null
 */
export async function getToolById(id: string): Promise<ToolDefinition | null> {
  const row = await queryOne<ToolRow>('SELECT * FROM tools WHERE id = $1', [id]);
  return row ? rowToTool(row) : null;
}

/**
 * 根据名称获取 Tool
 * @param name Tool 名称
 * @returns Tool 定义，不存在返回 null
 */
export async function getToolByName(name: string): Promise<ToolDefinition | null> {
  const row = await queryOne<ToolRow>('SELECT * FROM tools WHERE name = $1', [name]);
  return row ? rowToTool(row) : null;
}

/**
 * 创建 Tool
 * @param params 创建参数
 * @param createdBy 创建者 ID
 * @returns 新创建的 Tool
 */
export async function createTool(
  params: CreateToolParams,
  createdBy: string
): Promise<ToolDefinition> {
  // 检查名称是否已存在
  const existing = await getToolByName(params.name);
  if (existing) {
    throw new Error(`Tool with name '${params.name}' already exists`);
  }

  const id = generateId('user');
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO tools (
      id, name, display_name, description, category, source, enabled,
      parameters, output_schema, risk_level, requires_approval,
      timeout, max_retries, version, created_at, updated_at, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      id,
      params.name,
      params.displayName,
      params.description,
      params.category,
      'user',
      1, // enabled
      JSON.stringify(params.parameters || []),
      params.outputSchema || null,
      params.riskLevel || 'medium',
      params.requiresApproval ? 1 : 0,
      params.timeout || null,
      params.maxRetries || null,
      params.version || '1.0.0',
      now,
      now,
      createdBy,
    ]
  );

  const created = await getToolById(id);
  if (!created) {
    throw new Error('Failed to create tool');
  }
  return created;
}

/**
 * 更新 Tool
 * @param id Tool ID
 * @param params 更新参数
 * @returns 更新后的 Tool，不存在返回 null
 */
export async function updateTool(
  id: string,
  params: UpdateToolParams
): Promise<ToolDefinition | null> {
  // 检查 Tool 是否存在
  const existing = await queryOne<ToolRow>('SELECT * FROM tools WHERE id = $1', [id]);
  if (!existing) return null;

  // 内置 Tool 不允许修改某些字段
  if (existing.source === 'builtin') {
    const restrictedFields = ['name', 'category', 'source'];
    for (const field of restrictedFields) {
      if ((params as Record<string, unknown>)[field] !== undefined) {
        throw new Error(`Cannot modify '${field}' of builtin tool`);
      }
    }
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (params.displayName !== undefined) {
    updates.push(`display_name = $${paramIndex++}`);
    values.push(params.displayName);
  }

  if (params.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(params.description);
  }

  if (params.category !== undefined && existing.source !== 'builtin') {
    updates.push(`category = $${paramIndex++}`);
    values.push(params.category);
  }

  if (params.enabled !== undefined) {
    updates.push(`enabled = $${paramIndex++}`);
    values.push(params.enabled ? 1 : 0);
  }

  if (params.parameters !== undefined) {
    updates.push(`parameters = $${paramIndex++}`);
    values.push(JSON.stringify(params.parameters));
  }

  if (params.outputSchema !== undefined) {
    updates.push(`output_schema = $${paramIndex++}`);
    values.push(params.outputSchema || null);
  }

  if (params.riskLevel !== undefined) {
    updates.push(`risk_level = $${paramIndex++}`);
    values.push(params.riskLevel);
  }

  if (params.requiresApproval !== undefined) {
    updates.push(`requires_approval = $${paramIndex++}`);
    values.push(params.requiresApproval ? 1 : 0);
  }

  if (params.timeout !== undefined) {
    updates.push(`timeout = $${paramIndex++}`);
    values.push(params.timeout || null);
  }

  if (params.maxRetries !== undefined) {
    updates.push(`max_retries = $${paramIndex++}`);
    values.push(params.maxRetries || null);
  }

  if (params.version !== undefined) {
    updates.push(`version = $${paramIndex++}`);
    values.push(params.version);
  }

  // 始终更新 updated_at
  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date().toISOString());

  // 添加 ID 作为最后一个参数
  values.push(id);

  await execute(`UPDATE tools SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);

  return getToolById(id);
}

/**
 * 删除 Tool
 * @param id Tool ID
 * @returns 是否删除成功
 */
export async function deleteTool(id: string): Promise<boolean> {
  // 检查是否为内置 Tool
  const existing = await queryOne<ToolRow>('SELECT source FROM tools WHERE id = $1', [id]);
  if (existing && existing.source === 'builtin') {
    throw new Error('Cannot delete builtin tool');
  }

  const affectedRows = await execute('DELETE FROM tools WHERE id = $1', [id]);
  return affectedRows > 0;
}

/**
 * 切换 Tool 启用状态
 * @param id Tool ID
 * @param enabled 是否启用
 * @returns 更新后的 Tool，不存在返回 null
 */
export async function toggleToolEnabled(id: string, enabled: boolean): Promise<ToolDefinition | null> {
  return updateTool(id, { enabled });
}

// ========== 内置 Tools 注册 ==========

/**
 * 初始化内置 Tools
 * 将 BUILTIN_TOOLS 注册到数据库（如果不存在）
 */
export async function initializeBuiltinTools(): Promise<{
  added: number; updated: number; unchanged: number }> {
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const tool of BUILTIN_TOOLS_LIST) {
    const existing = await queryOne<ToolRow>('SELECT * FROM tools WHERE id = $1', [tool.id]);

    if (!existing) {
      // 插入新内置 Tool
      await execute(
        `INSERT INTO tools (
          id, name, display_name, description, category, source, enabled,
          parameters, output_schema, risk_level, requires_approval,
          timeout, max_retries, version, created_at, updated_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          tool.id,
          tool.name,
          tool.displayName,
          tool.description,
          tool.category,
          'builtin',
          tool.enabled ? 1 : 0,
          JSON.stringify(tool.parameters),
          tool.outputSchema || null,
          tool.riskLevel,
          tool.requiresApproval ? 1 : 0,
          tool.timeout || null,
          tool.maxRetries || null,
          tool.version,
          tool.createdAt,
          tool.updatedAt,
          'system',
        ]
      );
      added++;
    } else if (existing.version !== tool.version) {
      // 更新版本变更的内置 Tool
      await execute(
        `UPDATE tools SET
          display_name = $1, description = $2, parameters = $3,
          output_schema = $4, risk_level = $5, requires_approval = $6,
          timeout = $7, max_retries = $8, version = $9, updated_at = $10
         WHERE id = $11`,
        [
          tool.displayName,
          tool.description,
          JSON.stringify(tool.parameters),
          tool.outputSchema || null,
          tool.riskLevel,
          tool.requiresApproval ? 1 : 0,
          tool.timeout || null,
          tool.maxRetries || null,
          tool.version,
          new Date().toISOString(),
          tool.id,
        ]
      );
      updated++;
    } else {
      unchanged++;
    }
  }

  return { added, updated, unchanged };
}

/**
 * 获取启用的 Tools（用于 Agent 运行时）
 * @returns 启用的 Tool 列表
 */
export async function getEnabledTools(): Promise<ToolDefinition[]> {
  const rows = await query<ToolRow>(
    "SELECT * FROM tools WHERE enabled = 1 OR source = 'builtin' ORDER BY category, display_name"
  );
  return rows.map(rowToTool);
}

/**
 * 获取需要审批的 Tools
 * @returns 需要审批的 Tool 列表
 */
export async function getToolsRequiringApproval(): Promise<ToolDefinition[]> {
  const rows = await query<ToolRow>(
    'SELECT * FROM tools WHERE requires_approval = 1 ORDER BY category, display_name'
  );
  return rows.map(rowToTool);
}

/**
 * 按风险级别统计 Tools
 * @returns 统计结果
 */
export async function getToolRiskStats(): Promise<Record<string, number>> {
  const rows = await query<{ risk_level: string; count: string }>(
    'SELECT risk_level, COUNT(*) as count FROM tools GROUP BY risk_level'
  );

  const stats: Record<string, number> = { low: 0, medium: 0, high: 0 };
  for (const row of rows) {
    stats[row.risk_level] = parseInt(row.count, 10);
  }
  return stats;
}

// ========== 导出 ==========

export const toolService = {
  getAllTools,
  getToolsByCategory,
  getToolById,
  getToolByName,
  createTool,
  updateTool,
  deleteTool,
  toggleToolEnabled,
  initializeBuiltinTools,
  getEnabledTools,
  getToolsRequiringApproval,
  getToolRiskStats,
};

export default toolService;
