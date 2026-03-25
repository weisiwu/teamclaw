/**
 * 角色记忆化服务
 * 记录角色-成员关系历史，用于审计、通知和记忆注入
 */

import { Role } from '../constants/roles';
import { roleMemoryRepo } from '../db/repositories/roleMemoryRepo.js';

export interface RoleChangeRecord {
  id: string;
  userId: string;
  fromRole: Role | null;
  toRole: Role;
  changedBy: string; // 操作者ID
  reason?: string;
  timestamp: string;
}

export interface PermissionDelegation {
  id: string;
  delegatorId: string; // 授权者ID
  delegateId: string; // 被授权者ID
  permissions: string[]; // 授予的权限列表
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

// ============ 内存存储 ============
const roleChangeLog: RoleChangeRecord[] = [];
const permissionDelegations: PermissionDelegation[] = [];

function generateRoleId(): string {
  return generateId('role');
}

// ============ 角色变更历史 ============

/**
 * 记录一次角色变更
 */
export async function recordRoleChange(
  userId: string,
  fromRole: Role | null,
  toRole: Role,
  changedBy: string,
  reason?: string
): Promise<RoleChangeRecord> {
  const record: RoleChangeRecord = {
    id: generateRoleId(),
    userId,
    fromRole,
    toRole,
    changedBy,
    reason,
    timestamp: new Date().toISOString(),
  };
  roleChangeLog.push(record);

  // 持久化到 DB
  await roleMemoryRepo
    .insertRoleChange(record)
    .catch(err => console.warn('[roleMemory] Failed to persist role change:', err));

  return record;
}

/**
 * 获取用户的角色变更历史
 */
export async function getRoleHistory(userId: string, limit = 20): Promise<RoleChangeRecord[]> {
  try {
    const rows = await roleMemoryRepo.findByUserId(userId, limit);
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      fromRole: r.from_role as Role | null,
      toRole: r.to_role as Role,
      changedBy: r.changed_by,
      reason: r.reason ?? undefined,
      timestamp: r.timestamp.toISOString(),
    }));
  } catch (err) {
    console.warn(
      '[roleMemory] DB read failed, falling back to memory:',
      err instanceof Error ? err.message : String(err)
    );
    return roleChangeLog
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

/**
 * 获取最近所有角色变更记录
 */
export async function getRecentRoleChanges(limit = 50): Promise<RoleChangeRecord[]> {
  try {
    const rows = await roleMemoryRepo.findRecent(limit);
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      fromRole: r.from_role as Role | null,
      toRole: r.to_role as Role,
      changedBy: r.changed_by,
      reason: r.reason ?? undefined,
      timestamp: r.timestamp.toISOString(),
    }));
  } catch (err) {
    console.warn(
      '[roleMemory] DB read failed, falling back to memory:',
      err instanceof Error ? err.message : String(err)
    );
    return [...roleChangeLog]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

/**
 * 获取角色变更统计（按日聚合）
 */
export async function getRoleChangeStats(days = 7): Promise<Record<string, number>> {
  try {
    return await roleMemoryRepo.countByDate(days);
  } catch (err) {
    console.warn(
      '[roleMemory] DB read failed, falling back to memory:',
      err instanceof Error ? err.message : String(err)
    );
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const stats: Record<string, number> = {};

    roleChangeLog
      .filter(r => new Date(r.timestamp).getTime() > cutoff)
      .forEach(r => {
        const date = r.timestamp.slice(0, 10);
        stats[date] = (stats[date] || 0) + 1;
      });

    return stats;
  }
}

// ============ 权限委托 ============

/**
 * 授予权限委托
 */
export async function grantDelegation(
  delegatorId: string,
  delegateId: string,
  permissions: string[],
  expiresAt: string | null = null
): Promise<PermissionDelegation> {
  // 如果已存在有效委托，先撤销（内存）
  const existing = permissionDelegations.find(
    d => d.delegatorId === delegatorId && d.delegateId === delegateId && !d.revokedAt
  );
  if (existing) {
    existing.revokedAt = new Date().toISOString();
    await roleMemoryRepo
      .revokeDelegation(existing.id, existing.revokedAt)
      .catch(err => console.warn('[roleMemory] Failed to revoke existing delegation in DB:', err));
  }

  const delegation: PermissionDelegation = {
    id: generateRoleId(),
    delegatorId,
    delegateId,
    permissions,
    expiresAt,
    createdAt: new Date().toISOString(),
    revokedAt: null,
  };
  permissionDelegations.push(delegation);

  // 持久化到 DB
  await roleMemoryRepo
    .upsertDelegation({
      id: delegation.id,
      delegatorId: delegation.delegatorId,
      delegateId: delegation.delegateId,
      permissions: delegation.permissions,
      expiresAt: delegation.expiresAt,
      createdAt: delegation.createdAt,
      revokedAt: delegation.revokedAt,
    })
    .catch(err => console.warn('[roleMemory] Failed to persist delegation:', err));

  return delegation;
}

/**
 * 撤销权限委托
 */
export async function revokeDelegation(delegatorId: string, delegateId: string): Promise<boolean> {
  const delegation = permissionDelegations.find(
    d => d.delegatorId === delegatorId && d.delegateId === delegateId && !d.revokedAt
  );
  if (!delegation) return false;
  delegation.revokedAt = new Date().toISOString();

  await roleMemoryRepo
    .revokeDelegation(delegation.id, delegation.revokedAt)
    .catch(err => console.warn('[roleMemory] Failed to revoke delegation in DB:', err));

  return true;
}

/**
 * 获取用户收到的所有有效委托
 */
export async function getDelegationsForUser(delegateId: string): Promise<PermissionDelegation[]> {
  try {
    const rows = await roleMemoryRepo.findActiveByDelegate(delegateId);
    return rows.map(r => ({
      id: r.id,
      delegatorId: r.delegator_id,
      delegateId: r.delegate_id,
      permissions: r.permissions,
      expiresAt: r.expires_at?.toISOString() ?? null,
      createdAt: r.created_at.toISOString(),
      revokedAt: r.revoked_at?.toISOString() ?? null,
    }));
  } catch (err) {
    console.warn(
      '[roleMemory] DB read failed, falling back to memory:',
      err instanceof Error ? err.message : String(err)
    );
    const now = new Date().toISOString();
    return permissionDelegations.filter(
      d => d.delegateId === delegateId && !d.revokedAt && (!d.expiresAt || d.expiresAt > now)
    );
  }
}

/**
 * 获取用户发出的所有有效委托
 */
export async function getDelegationsByUser(delegatorId: string): Promise<PermissionDelegation[]> {
  try {
    const rows = await roleMemoryRepo.findActiveByDelegator(delegatorId);
    return rows.map(r => ({
      id: r.id,
      delegatorId: r.delegator_id,
      delegateId: r.delegate_id,
      permissions: r.permissions,
      expiresAt: r.expires_at?.toISOString() ?? null,
      createdAt: r.created_at.toISOString(),
      revokedAt: r.revoked_at?.toISOString() ?? null,
    }));
  } catch (err) {
    console.warn(
      '[roleMemory] DB read failed, falling back to memory:',
      err instanceof Error ? err.message : String(err)
    );
    return permissionDelegations.filter(d => d.delegatorId === delegatorId && !d.revokedAt);
  }
}

/**
 * 检查委托是否有效
 */
export async function isDelegationValid(delegationId: string): Promise<boolean> {
  try {
    const row = await roleMemoryRepo.findById(delegationId);
    if (!row || row.revoked_at) return false;
    if (row.expires_at && row.expires_at < new Date()) return false;
    return true;
  } catch (err) {
    console.warn(
      '[roleMemory] DB read failed, falling back to memory:',
      err instanceof Error ? err.message : String(err)
    );
    const d = permissionDelegations.find(x => x.id === delegationId);
    if (!d || d.revokedAt) return false;
    if (d.expiresAt && d.expiresAt < new Date().toISOString()) return false;
    return true;
  }
}

/**
 * 合并检查：基础角色权限 + 委托权限
 */
export async function getEffectivePermissions(
  userId: string,
  basePermissions: string[]
): Promise<string[]> {
  const delegations = await getDelegationsForUser(userId);
  const extra = delegations.flatMap(d => d.permissions);
  return [...new Set([...basePermissions, ...extra])];
}
