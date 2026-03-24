/**
 * 角色定义 — 前端统一使用
 * 与后端 server/src/constants/roles.ts 保持一致
 *
 * 角色体系：admin | vice_admin | member
 * - admin: 管理员（最高权限）
 * - vice_admin: 副管理员（中层管理）
 * - member: 普通员工（基础权限）
 */

// 角色类型 — 与后端 server/src/constants/roles.ts 保持一致
export type Role = 'admin' | 'vice_admin' | 'member';

// 角色中文标签
export const ROLE_LABELS: Record<Role, string> = {
  admin: '管理员',
  vice_admin: '副管理员',
  member: '普通员工',
};

// 角色英文标签
export const ROLE_LABEL_EN: Record<Role, string> = {
  admin: 'Admin',
  vice_admin: 'Vice Admin',
  member: 'Member',
};

// 角色 Badge 颜色
export const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-800',
  vice_admin: 'bg-blue-100 text-blue-800',
  member: 'bg-green-100 text-green-800',
};

// 角色完整定义
export interface RoleDefinition {
  id: Role;
  label: string;
  labelZh: string;
  description: string;
  level: number;
  color: string;
}

export const ROLES: Record<Role, RoleDefinition> = {
  admin: {
    id: 'admin',
    label: 'Admin',
    labelZh: '管理员',
    description: '团队最高管理者，拥有全部权限，可管理团队所有设置和成员',
    level: 0,
    color: 'bg-purple-100 text-purple-800',
  },
  vice_admin: {
    id: 'vice_admin',
    label: 'Vice Admin',
    labelZh: '副管理员',
    description: '团队中层管理者，可管理项目、任务、版本和普通成员',
    level: 1,
    color: 'bg-blue-100 text-blue-800',
  },
  member: {
    id: 'member',
    label: 'Member',
    labelZh: '普通员工',
    description: '基础权限成员，可创建和编辑任务、版本，查看团队信息',
    level: 2,
    color: 'bg-green-100 text-green-800',
  },
};

export const ROLE_OPTIONS: RoleDefinition[] = Object.values(ROLES);

/**
 * 获取角色定义
 */
export function getRoleById(id: Role): RoleDefinition {
  return ROLES[id] ?? ROLES.member;
}

/**
 * 检查是否有权限管理他人（admin 或 vice_admin）
 */
export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  return ROLES[actorRole].level < ROLES[targetRole].level;
}

/**
 * 是否为管理员（admin 或 vice_admin）
 */
export function isElevatedRole(role: Role): boolean {
  return role === 'admin' || role === 'vice_admin';
}

/**
 * 是否为管理员（仅 admin）
 */
export function isAdmin(role: Role): boolean {
  return role === 'admin';
}
