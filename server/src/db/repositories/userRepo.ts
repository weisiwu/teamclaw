/**
 * User Repository — PostgreSQL CRUD
 * Replaces in-memory Map storage in userService.ts
 * Fixes: BUG-05 内存Map存储重启全丢
 */

import { query, queryOne, execute } from '../pg.js';

export interface UserRow {
  id: string;
  user_id: string;
  name: string;
  role: string;
  weight: number;
  wechat_id: string | null;
  feishu_id: string | null;
  remark: string | null;
  created_at: Date;
  updated_at: Date;
}

export const userRepo = {
  /**
   * Insert a new user
   */
  async insert(user: {
    id: string;
    userId: string;
    name: string;
    role: string;
    weight: number;
    wechatId?: string | null;
    feishuId?: string | null;
    remark?: string | null;
    createdAt: string;
    updatedAt: string;
  }): Promise<number> {
    return execute(
      `
      INSERT INTO users (id, user_id, name, role, weight, wechat_id, feishu_id, remark, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        user.id,
        user.userId,
        user.name,
        user.role,
        user.weight,
        user.wechatId ?? null,
        user.feishuId ?? null,
        user.remark ?? null,
        new Date(user.createdAt),
        new Date(user.updatedAt),
      ]
    );
  },

  /**
   * Find user by primary key id
   */
  async findById(id: string): Promise<UserRow | null> {
    return queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  },

  /**
   * Find user by external user_id
   */
  async findByUserId(userId: string): Promise<UserRow | null> {
    return queryOne<UserRow>('SELECT * FROM users WHERE user_id = $1', [userId]);
  },

  /**
   * Find user by wechat_id
   */
  async findByWechatId(wechatId: string): Promise<UserRow | null> {
    return queryOne<UserRow>('SELECT * FROM users WHERE wechat_id = $1', [wechatId]);
  },

  /**
   * Find user by feishu_id
   */
  async findByFeishuId(feishuId: string): Promise<UserRow | null> {
    return queryOne<UserRow>('SELECT * FROM users WHERE feishu_id = $1', [feishuId]);
  },

  /**
   * Find user by external ID (wechat or feishu)
   */
  async findByExternalId(wechatId?: string, feishuId?: string): Promise<UserRow | null> {
    if (wechatId) {
      return queryOne<UserRow>('SELECT * FROM users WHERE wechat_id = $1', [wechatId]);
    }
    if (feishuId) {
      return queryOne<UserRow>('SELECT * FROM users WHERE feishu_id = $1', [feishuId]);
    }
    return null;
  },

  /**
   * Update user by id
   */
  async update(
    id: string,
    data: {
      name?: string;
      role?: string;
      weight?: number;
      wechatId?: string | null;
      feishuId?: string | null;
      remark?: string | null;
      updatedAt: string;
    }
  ): Promise<number> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      sets.push(`name = $${idx++}`);
      vals.push(data.name);
    }
    if (data.role !== undefined) {
      sets.push(`role = $${idx++}`);
      vals.push(data.role);
    }
    if (data.weight !== undefined) {
      sets.push(`weight = $${idx++}`);
      vals.push(data.weight);
    }
    if (data.wechatId !== undefined) {
      sets.push(`wechat_id = $${idx++}`);
      vals.push(data.wechatId);
    }
    if (data.feishuId !== undefined) {
      sets.push(`feishu_id = $${idx++}`);
      vals.push(data.feishuId);
    }
    if (data.remark !== undefined) {
      sets.push(`remark = $${idx++}`);
      vals.push(data.remark);
    }
    sets.push(`updated_at = $${idx++}`);
    vals.push(new Date(data.updatedAt));

    if (sets.length === 0) return 0;
    vals.push(id);
    return execute(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
  },

  /**
   * Delete user by id
   */
  async delete(id: string): Promise<number> {
    return execute('DELETE FROM users WHERE id = $1', [id]);
  },

  /**
   * Find all users (with optional role filter, pagination)
   */
  async findAll(role?: string, limit?: number, offset?: number): Promise<UserRow[]> {
    if (role) {
      const sql =
        limit !== undefined && offset !== undefined
          ? 'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3'
          : 'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC';
      return query<UserRow>(
        sql,
        limit !== undefined && offset !== undefined ? [role, limit, offset] : [role]
      );
    }
    const sql =
      limit !== undefined && offset !== undefined
        ? 'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2'
        : 'SELECT * FROM users ORDER BY created_at DESC';
    return query<UserRow>(sql, limit !== undefined && offset !== undefined ? [limit, offset] : []);
  },

  /**
   * Count total users
   */
  async count(role?: string): Promise<number> {
    if (role) {
      const row = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM users WHERE role = $1',
        [role]
      );
      return parseInt(row?.count ?? '0', 10);
    }
    const row = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users');
    return parseInt(row?.count ?? '0', 10);
  },
};
