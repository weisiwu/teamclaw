/**
 * 角色定义
 * TeamClaw 人员与权限模块 - 角色体系
 */

export type Role = 'owner' | 'admin' | 'developer' | 'viewer';

export interface RoleDefinition {
  id: Role;
  label: string;
  labelZh: string;
  description: string;
  level: number; // 数值越小权限越高
  color: string;
}

export const ROLES: Record<Role, RoleDefinition> = {
  owner: {
    id: 'owner',
    label: 'Owner',
    labelZh: '所有者',
    description: '团队最高管理者，拥有全部权限，可管理团队所有设置和成员',
    level: 0,
    color: 'bg-purple-100 text-purple-800',
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    labelZh: '管理员',
    description: '团队管理员，可管理项目、任务、版本和普通成员',
    level: 1,
    color: 'bg-blue-100 text-blue-800',
  },
  developer: {
    id: 'developer',
    label: 'Developer',
    labelZh: '开发者',
    description: '开发人员，可创建和编辑任务、版本，查看所有项目',
    level: 2,
    color: 'bg-green-100 text-green-800',
  },
  viewer: {
    id: 'viewer',
    label: 'Viewer',
    labelZh: '访客',
    description: '只读成员，可查看项目、任务和版本信息，无法修改',
    level: 3,
    color: 'bg-gray-100 text-gray-800',
  },
};

export const ROLE_OPTIONS = Object.values(ROLES);

export function getRoleById(id: Role): RoleDefinition {
  return ROLES[id] ?? ROLES.viewer;
}

export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  return ROLES[actorRole].level < ROLES[targetRole].level;
}

export function isOwner(role: Role): boolean {
  return role === 'owner';
}

export function isAdmin(role: Role): boolean {
  return role === 'admin' || role === 'owner';
}
