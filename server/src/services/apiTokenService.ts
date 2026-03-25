/**
 * API Token 服务
 * CRUD 业务逻辑 + 加密/脱敏处理
 */

import { generateId } from '../utils/generateId.js';
import { query, queryOne, execute } from '../db/pg.js';
import {
  encrypt,
  decrypt,
  maskApiKey,
} from '../utils/crypto.js';
import type {
  ApiToken,
  ApiTokenRow,
  CreateApiTokenParams,
  UpdateApiTokenParams,
  UpdateUsageParams,
  SanitizedApiToken,
  LLMProvider,
} from '../models/apiToken.js';

/**
 * 将数据库行转换为 ApiToken 对象
 */
function rowToApiToken(row: ApiTokenRow): ApiToken {
  return {
    id: row.id,
    alias: row.alias,
    provider: row.provider as LLMProvider,
    apiKey: decrypt(row.api_key),
    baseUrl: row.base_url || undefined,
    models: JSON.parse(row.models || '[]'),
    status: row.status as 'active' | 'disabled' | 'expired',
    monthlyBudgetUsd: row.monthly_budget_usd || undefined,
    currentMonthUsageUsd: row.current_month_usage_usd || 0,
    totalUsageUsd: row.total_usage_usd || 0,
    callCount: row.call_count || 0,
    lastUsedAt: row.last_used_at || undefined,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    note: row.note || undefined,
  };
}

/**
 * 脱敏 ApiToken（用于 API 返回）
 */
function sanitizeToken(token: ApiToken): SanitizedApiToken {
  return {
    ...token,
    apiKey: maskApiKey(token.apiKey),
  };
}

// ========== CRUD 操作 ==========

/**
 * 获取所有 API Tokens
 * @param includeDisabled 是否包含已禁用的 Token
 * @returns 脱敏后的 Token 列表
 */
export async function getAllTokens(includeDisabled: boolean = false): Promise<SanitizedApiToken[]> {
  let sql = 'SELECT * FROM api_tokens';
  if (!includeDisabled) {
    sql += " WHERE status = 'active'";
  }
  sql += ' ORDER BY created_at DESC';
  
  const rows = await query<ApiTokenRow>(sql);
  return rows.map(rowToApiToken).map(sanitizeToken);
}

/**
 * 根据 ID 获取 Token
 * @param id Token ID
 * @returns 脱敏后的 Token，不存在返回 null
 */
export async function getTokenById(id: string): Promise<SanitizedApiToken | null> {
  const row = await queryOne<ApiTokenRow>('SELECT * FROM api_tokens WHERE id = $1', [id]);
  if (!row) return null;
  return sanitizeToken(rowToApiToken(row));
}

/**
 * 根据 ID 获取完整的 Token（包含解密的 API Key）
 * 仅用于内部调用 LLM API
 * @param id Token ID
 * @returns 完整的 Token，不存在返回 null
 */
export async function getFullTokenById(id: string): Promise<ApiToken | null> {
  const row = await queryOne<ApiTokenRow>('SELECT * FROM api_tokens WHERE id = $1', [id]);
  if (!row) return null;
  return rowToApiToken(row);
}

/**
 * 根据 Provider 获取可用的 Token
 * 优先返回使用量较少的 Token
 * @param provider LLM Provider
 * @returns 完整的 Token，不存在返回 null
 */
export async function getAvailableTokenByProvider(provider: LLMProvider): Promise<ApiToken | null> {
  const row = await queryOne<ApiTokenRow>(
    `SELECT * FROM api_tokens 
     WHERE provider = $1 AND status = 'active'
     ORDER BY current_month_usage_usd ASC, call_count ASC
     LIMIT 1`,
    [provider]
  );
  if (!row) return null;
  return rowToApiToken(row);
}

/**
 * 创建新 Token
 * @param params 创建参数
 * @param createdBy 创建者 ID
 * @returns 脱敏后的新 Token
 */
export async function createToken(
  params: CreateApiTokenParams,
  createdBy: string
): Promise<SanitizedApiToken> {
  const id = generateId();
  const now = new Date().toISOString();
  
  await execute(
    `INSERT INTO api_tokens (
      id, alias, provider, api_key, base_url, models, status,
      monthly_budget_usd, current_month_usage_usd, total_usage_usd,
      call_count, created_at, created_by, updated_at, note
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      id,
      params.alias,
      params.provider,
      encrypt(params.apiKey),
      params.baseUrl || null,
      JSON.stringify(params.models || []),
      params.status || 'active',
      params.monthlyBudgetUsd || null,
      0, // currentMonthUsageUsd
      0, // totalUsageUsd
      0, // callCount
      now,
      createdBy,
      now,
      params.note || null,
    ]
  );
  
  const created = await getTokenById(id);
  if (!created) {
    throw new Error('Failed to create token');
  }
  return created;
}

/**
 * 更新 Token
 * @param id Token ID
 * @param params 更新参数
 * @returns 更新后的脱敏 Token，不存在返回 null
 */
export async function updateToken(
  id: string,
  params: UpdateApiTokenParams
): Promise<SanitizedApiToken | null> {
  // 检查 Token 是否存在
  const existing = await queryOne<ApiTokenRow>('SELECT * FROM api_tokens WHERE id = $1', [id]);
  if (!existing) return null;
  
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;
  
  if (params.alias !== undefined) {
    updates.push(`alias = $${paramIndex++}`);
    values.push(params.alias);
  }
  
  if (params.apiKey !== undefined) {
    updates.push(`api_key = $${paramIndex++}`);
    values.push(encrypt(params.apiKey));
  }
  
  if (params.baseUrl !== undefined) {
    updates.push(`base_url = $${paramIndex++}`);
    values.push(params.baseUrl || null);
  }
  
  if (params.models !== undefined) {
    updates.push(`models = $${paramIndex++}`);
    values.push(JSON.stringify(params.models));
  }
  
  if (params.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(params.status);
  }
  
  if (params.monthlyBudgetUsd !== undefined) {
    updates.push(`monthly_budget_usd = $${paramIndex++}`);
    values.push(params.monthlyBudgetUsd || null);
  }
  
  if (params.note !== undefined) {
    updates.push(`note = $${paramIndex++}`);
    values.push(params.note || null);
  }
  
  // 始终更新 updated_at
  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date().toISOString());
  
  // 添加 ID 作为最后一个参数
  values.push(id);
  
  await execute(
    `UPDATE api_tokens SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
  
  return getTokenById(id);
}

/**
 * 删除 Token
 * @param id Token ID
 * @returns 是否删除成功
 */
export async function deleteToken(id: string): Promise<boolean> {
  const result = await execute('DELETE FROM api_tokens WHERE id = $1', [id]);
  return result.rowCount > 0;
}

/**
 * 更新 Token 使用量
 * @param id Token ID
 * @param usage 使用量参数
 * @returns 是否更新成功
 */
export async function updateTokenUsage(
  id: string,
  usage: UpdateUsageParams
): Promise<boolean> {
  const row = await queryOne<ApiTokenRow>('SELECT * FROM api_tokens WHERE id = $1', [id]);
  if (!row) return false;
  
  const now = new Date().toISOString();
  const newCurrentMonth = (row.current_month_usage_usd || 0) + usage.costUsd;
  const newTotal = (row.total_usage_usd || 0) + usage.costUsd;
  const newCallCount = (row.call_count || 0) + (usage.incrementCalls || 1);
  
  await execute(
    `UPDATE api_tokens SET 
      current_month_usage_usd = $1,
      total_usage_usd = $2,
      call_count = $3,
      last_used_at = $4,
      updated_at = $5
     WHERE id = $6`,
    [newCurrentMonth, newTotal, newCallCount, now, now, id]
  );
  
  return true;
}

/**
 * 验证 Token 有效性
 * 检查 Token 是否存在且状态为 active
 * @param id Token ID
 * @returns 是否有效
 */
export async function verifyToken(id: string): Promise<{ valid: boolean; message: string }> {
  const row = await queryOne<ApiTokenRow>('SELECT * FROM api_tokens WHERE id = $1', [id]);
  
  if (!row) {
    return { valid: false, message: 'Token not found' };
  }
  
  if (row.status === 'disabled') {
    return { valid: false, message: 'Token is disabled' };
  }
  
  if (row.status === 'expired') {
    return { valid: false, message: 'Token is expired' };
  }
  
  // 检查预算是否超限
  if (row.monthly_budget_usd && row.current_month_usage_usd >= row.monthly_budget_usd) {
    return { valid: false, message: 'Monthly budget exceeded' };
  }
  
  // 检查 API Key 是否可以解密
  try {
    const decrypted = decrypt(row.api_key);
    if (!decrypted || decrypted.length < 10) {
      return { valid: false, message: 'Invalid API key format' };
    }
  } catch (error) {
    return { valid: false, message: 'Failed to decrypt API key' };
  }
  
  return { valid: true, message: 'Token is valid' };
}

/**
 * 获取所有 Provider 列表
 * @returns Provider 数组
 */
export function getSupportedProviders(): LLMProvider[] {
  return ['openai', 'anthropic', 'deepseek', 'custom'];
}

/**
 * 重置月度使用量（应在每月 1 日执行）
 */
export async function resetMonthlyUsage(): Promise<number> {
  const result = await execute(
    "UPDATE api_tokens SET current_month_usage_usd = 0 WHERE status != 'expired'"
  );
  return result.rowCount;
}

/**
 * 记录 Token 使用量（由 llmService 调用）
 * @param tokenId Token ID
 * @param params 用量参数：inputTokens, outputTokens, costUsd, agentName
 * @returns 是否记录成功
 */
export async function recordUsage(
  tokenId: string,
  params: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    agentName?: string;
  }
): Promise<boolean> {
  const { inputTokens, outputTokens, costUsd, agentName } = params;

  try {
    // 更新 Token 使用量
    await updateTokenUsage(tokenId, {
      costUsd,
      incrementCalls: 1,
    });

    console.log(
      `[apiTokenService] Recorded usage: token=${tokenId}, ` +
      `input=${inputTokens}, output=${outputTokens}, cost=$${costUsd.toFixed(6)}, ` +
      `agent=${agentName || 'unknown'}`
    );

    return true;
  } catch (error) {
    console.error(`[apiTokenService] Failed to record usage for token ${tokenId}:`, error);
    return false;
  }
}

// ========== 导出 ==========

export const apiTokenService = {
  getAllTokens,
  getTokenById,
  getFullTokenById,
  getAvailableTokenByProvider,
  createToken,
  updateToken,
  deleteToken,
  updateTokenUsage,
  verifyToken,
  getSupportedProviders,
  resetMonthlyUsage,
  recordUsage,
};

export default apiTokenService;
