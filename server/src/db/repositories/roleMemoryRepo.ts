/**
 * Role Memory Repository — PostgreSQL CRUD
 * Persists role change logs and permission delegations
 */

import { query, queryOne, execute } from '../pg.js';

export interface RoleChangeLogRow {
  id: string;
  user_id: string;
  from_role: string | null;
  to_role: string;
  changed_by: string;
  reason: string | null;
  timestamp: Date;
}

export interface PermissionDelegationRow {
  id: string;
  delegator_id: string;
  delegate_id: string;
  permissions: string[];
  expires_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
}

export const roleMemoryRepo = {
  // ============ Role Change Log ============

  async insertRoleChange(record: {
    id: string;
    userId: string;
    fromRole: string | null;
    toRole: string;
    changedBy: string;
    reason?: string;
    timestamp: string;
  }): Promise<number> {
    return execute(
      `
      INSERT INTO role_change_log (id, user_id, from_role, to_role, changed_by, reason, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        record.id,
        record.userId,
        record.fromRole ?? null,
        record.toRole,
        record.changedBy,
        record.reason ?? null,
        new Date(record.timestamp),
      ]
    );
  },

  async findByUserId(userId: string, limit = 20): Promise<RoleChangeLogRow[]> {
    return query<RoleChangeLogRow>(
      'SELECT * FROM role_change_log WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [userId, limit]
    );
  },

  async findRecent(limit = 50): Promise<RoleChangeLogRow[]> {
    return query<RoleChangeLogRow>(
      'SELECT * FROM role_change_log ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
  },

  async countByDate(days = 7): Promise<Record<string, number>> {
    const rows = await query<{ date: string; count: string }>(
      `SELECT DATE(timestamp) as date, COUNT(*) as count
       FROM role_change_log
       WHERE timestamp > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(timestamp)
       ORDER BY date DESC`
    );
    const result: Record<string, number> = {};
    for (const r of rows) result[r.date] = parseInt(r.count, 10);
    return result;
  },

  // ============ Permission Delegations ============

  async upsertDelegation(delegation: {
    id: string;
    delegatorId: string;
    delegateId: string;
    permissions: string[];
    expiresAt: string | null;
    createdAt: string;
    revokedAt: string | null;
  }): Promise<number> {
    const existing = await queryOne<PermissionDelegationRow>(
      'SELECT * FROM permission_delegations WHERE id = $1',
      [delegation.id]
    );
    if (existing) {
      return execute(
        `
        UPDATE permission_delegations
        SET permissions = $2, expires_at = $3, revoked_at = $4
        WHERE id = $1
      `,
        [
          delegation.id,
          delegation.permissions,
          delegation.expiresAt ? new Date(delegation.expiresAt) : null,
          delegation.revokedAt ? new Date(delegation.revokedAt) : null,
        ]
      );
    }
    return execute(
      `
      INSERT INTO permission_delegations (id, delegator_id, delegate_id, permissions, expires_at, created_at, revoked_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        delegation.id,
        delegation.delegatorId,
        delegation.delegateId,
        delegation.permissions,
        delegation.expiresAt ? new Date(delegation.expiresAt) : null,
        new Date(delegation.createdAt),
        delegation.revokedAt ? new Date(delegation.revokedAt) : null,
      ]
    );
  },

  async findActiveByDelegate(delegateId: string): Promise<PermissionDelegationRow[]> {
    return query<PermissionDelegationRow>(
      `SELECT * FROM permission_delegations
       WHERE delegate_id = $1 AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
      [delegateId]
    );
  },

  async findActiveByDelegator(delegatorId: string): Promise<PermissionDelegationRow[]> {
    return query<PermissionDelegationRow>(
      `SELECT * FROM permission_delegations
       WHERE delegator_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [delegatorId]
    );
  },

  async findById(id: string): Promise<PermissionDelegationRow | null> {
    return queryOne<PermissionDelegationRow>('SELECT * FROM permission_delegations WHERE id = $1', [
      id,
    ]);
  },

  async revokeDelegation(id: string, revokedAt: string): Promise<number> {
    return execute('UPDATE permission_delegations SET revoked_at = $2 WHERE id = $1', [
      id,
      new Date(revokedAt),
    ]);
  },
};
