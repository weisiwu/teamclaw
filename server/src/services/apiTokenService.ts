/**
 * API Token 业务逻辑服务
 * CRUD + 加密/脱敏处理
 */

import { query, queryOne, execute } from '../db/pg.js';
import {
  ApiToken,
  ApiTokenResponse,
  CreateApiTokenRequest,
  UpdateApiTokenRequest,
  LLMProvider,
  TokenStatus,
} from '../models/apiToken.js';
import { encrypt, decrypt, maskApiKey } from '../utils/crypto.js';
import { auditService } from './auditService.js';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface ApiTokenRow {
  id: string;
  alias: string;
  provider: LLMProvider;
  api_key: string;
  base_url: string | null;
  models: string[];
  status: TokenStatus;
  monthly_budget_usd: number | null;
  current_month_usage_usd: number;
  total_usage_usd: number;
  call_count: number;
  last_used_at: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  note: string | null;
}

function rowToModel(row: ApiTokenRow): ApiToken {
  return {
    id: row.id,
    alias: row.alias,
    provider: row.provider,
    apiKey: row.api_key,
    baseUrl: row.base_url ?? undefined,
    models: row.models,
    status: row.status,
    monthlyBudgetUsd: row.monthly_budget_usd ?? undefined,
    currentMonthUsageUsd: row.current_month_usage_usd,
    totalUsageUsd: row.total_usage_usd,
    callCount: row.call_count,
    lastUsedAt: row.last_used_at ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    note: row.note ?? undefined,
  };
}

function toResponse(token: ApiToken): ApiTokenResponse {
  return {
    ...token,
    apiKeyMasked: maskApiKey(token.apiKey),
  };
}

export class ApiTokenService {
  /**
   * 获取所有 Token 列表（脱敏）
   */
  async list(): Promise<ApiTokenResponse[]> {
    const rows = await query<ApiTokenRow>(
      `SELECT id, alias, provider, api_key, base_url, models, status,
              monthly_budget_usd, current_month_usage_usd, total_usage_usd,
              call_count, last_used_at, created_at, created_by, updated_at, note
       FROM api_token
       ORDER BY created_at DESC`
    );
    return rows.map(row => toResponse(rowToModel(row)));
  }

  /**
   * 获取单个 Token（脱敏）
   */
  async getById(id: string): Promise<ApiTokenResponse | null> {
    const row = await queryOne<ApiTokenRow>(
      `SELECT id, alias, provider, api_key, base_url, models, status,
              monthly_budget_usd, current_month_usage_usd, total_usage_usd,
              call_count, last_used_at, created_at, created_by, updated_at, note
       FROM api_token WHERE id = $1`,
      [id]
    );
    if (!row) return null;
    return toResponse(rowToModel(row));
  }

  /**
   * 创建新 Token（加密存储）
   */
  async create(params: CreateApiTokenRequest, actor: string, ipAddress?: string): Promise<ApiTokenResponse> {
    const id = generateId('apt');
    const encryptedKey = encrypt(params.apiKey);
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO api_token
        (id, alias, provider, api_key, base_url, models, status,
         monthly_budget_usd, current_month_usage_usd, total_usage_usd,
         call_count, created_at, created_by, updated_at, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id,
        params.alias,
        params.provider,
        encryptedKey,
        params.baseUrl ?? null,
        JSON.stringify(params.models ?? []),
        params.status ?? 'active',
        params.monthlyBudgetUsd ?? null,
        0,
        0,
        0,
        now,
        actor,
        now,
        params.note ?? null,
      ]
    );

    // 审计日志
    await auditService.log({
      action: 'api_token.create',
      actor,
      target: id,
      details: { alias: params.alias, provider: params.provider },
      ipAddress,
    });

    const created = await this.getById(id);
    if (!created) throw new Error('Failed to retrieve created token');
    return created;
  }

  /**
   * 更新 Token
   */
  async update(id: string, params: UpdateApiTokenRequest, actor: string, ipAddress?: string): Promise<ApiTokenResponse | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.alias !== undefined) {
      updates.push(`alias = $${idx++}`);
      values.push(params.alias);
    }
    if (params.provider !== undefined) {
      updates.push(`provider = $${idx++}`);
      values.push(params.provider);
    }
    if (params.apiKey !== undefined) {
      updates.push(`api_key = $${idx++}`);
      values.push(encrypt(params.apiKey));
    }
    if (params.baseUrl !== undefined) {
      updates.push(`base_url = $${idx++}`);
      values.push(params.baseUrl || null);
    }
    if (params.models !== undefined) {
      updates.push(`models = $${idx++}`);
      values.push(JSON.stringify(params.models));
    }
    if (params.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(params.status);
    }
    if (params.monthlyBudgetUsd !== undefined) {
      updates.push(`monthly_budget_usd = $${idx++}`);
      values.push(params.monthlyBudgetUsd);
    }
    if (params.note !== undefined) {
      updates.push(`note = $${idx++}`);
      values.push(params.note);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await execute(
      `UPDATE api_token SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );

    return this.getById(id);
  }

  /**
   * 删除 Token
   */
  async delete(id: string, actor: string, ipAddress?: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    await execute(`DELETE FROM api_token WHERE id = $1`, [id]);

    // 审计日志
    await auditService.log({
      action: 'api_token.delete',
      actor,
      target: id,
      details: { alias: existing.alias, provider: existing.provider },
      ipAddress,
    });

    return true;
  }

  /**
   * 验证 Token 有效性（解密后返回，用于校验）
   */
  async verify(id: string): Promise<{ valid: boolean; apiKey?: string; error?: string }> {
    const row = await queryOne<ApiTokenRow>(
      `SELECT api_key FROM api_token WHERE id = $1`,
      [id]
    );
    if (!row) return { valid: false, error: 'Token not found' };

    try {
      const decryptedKey = decrypt(row.api_key);
      return { valid: true, apiKey: decryptedKey };
    } catch {
      return { valid: false, error: 'Decryption failed — key may be corrupted' };
    }
  }

  /**
   * 根据 ID 获取解密后的 API Key（内部使用）
   */
  async getDecryptedApiKey(id: string): Promise<string | null> {
    const row = await queryOne<ApiTokenRow>(
      `SELECT api_key FROM api_token WHERE id = $1 AND status = 'active'`,
      [id]
    );
    if (!row) return null;
    try {
      return decrypt(row.api_key);
    } catch {
      return null;
    }
  }
}

export const apiTokenService = new ApiTokenService();
