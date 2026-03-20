/**
 * 角色记忆化服务
 * 记录角色-成员关系历史，用于审计、通知和记忆注入
 */
// ============ 内存存储 ============
const roleChangeLog = [];
const permissionDelegations = [];
function generateId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
// ============ 角色变更历史 ============
/**
 * 记录一次角色变更
 */
export async function recordRoleChange(userId, fromRole, toRole, changedBy, reason) {
    const record = {
        id: generateId(),
        userId,
        fromRole,
        toRole,
        changedBy,
        reason,
        timestamp: new Date().toISOString(),
    };
    roleChangeLog.push(record);
    return record;
}
/**
 * 获取用户的角色变更历史
 */
export async function getRoleHistory(userId, limit = 20) {
    return roleChangeLog
        .filter((r) => r.userId === userId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
}
/**
 * 获取最近所有角色变更记录
 */
export async function getRecentRoleChanges(limit = 50) {
    return [...roleChangeLog]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
}
/**
 * 获取角色变更统计（按日聚合）
 */
export async function getRoleChangeStats(days = 7) {
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const stats = {};
    roleChangeLog
        .filter((r) => new Date(r.timestamp).getTime() > cutoff)
        .forEach((r) => {
        const date = r.timestamp.slice(0, 10);
        stats[date] = (stats[date] || 0) + 1;
    });
    return stats;
}
// ============ 权限委托 ============
/**
 * 授予权限委托
 */
export async function grantDelegation(delegatorId, delegateId, permissions, expiresAt = null) {
    // 如果已存在有效委托，先撤销
    const existing = permissionDelegations.find((d) => d.delegatorId === delegatorId && d.delegateId === delegateId && !d.revokedAt);
    if (existing) {
        existing.revokedAt = new Date().toISOString();
    }
    const delegation = {
        id: generateId(),
        delegatorId,
        delegateId,
        permissions,
        expiresAt,
        createdAt: new Date().toISOString(),
        revokedAt: null,
    };
    permissionDelegations.push(delegation);
    return delegation;
}
/**
 * 撤销权限委托
 */
export async function revokeDelegation(delegatorId, delegateId) {
    const delegation = permissionDelegations.find((d) => d.delegatorId === delegatorId &&
        d.delegateId === delegateId &&
        !d.revokedAt);
    if (!delegation)
        return false;
    delegation.revokedAt = new Date().toISOString();
    return true;
}
/**
 * 获取用户收到的所有有效委托
 */
export async function getDelegationsForUser(delegateId) {
    const now = new Date().toISOString();
    return permissionDelegations.filter((d) => d.delegateId === delegateId &&
        !d.revokedAt &&
        (!d.expiresAt || d.expiresAt > now));
}
/**
 * 获取用户发出的所有有效委托
 */
export async function getDelegationsByUser(delegatorId) {
    return permissionDelegations.filter((d) => d.delegatorId === delegatorId && !d.revokedAt);
}
/**
 * 检查委托是否有效
 */
export async function isDelegationValid(delegationId) {
    const d = permissionDelegations.find((x) => x.id === delegationId);
    if (!d || d.revokedAt)
        return false;
    if (d.expiresAt && d.expiresAt < new Date().toISOString())
        return false;
    return true;
}
/**
 * 合并检查：基础角色权限 + 委托权限
 */
export async function getEffectivePermissions(userId, basePermissions) {
    const delegations = await getDelegationsForUser(userId);
    const extra = delegations.flatMap((d) => d.permissions);
    return [...new Set([...basePermissions, ...extra])];
}
