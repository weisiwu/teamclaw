/**
 * 权限规则定义
 * TeamClaw 人员与权限模块 - 基于资源的 CRUD 权限矩阵
 */

import { Role } from './roles';

// 资源类型
export type Resource =
  | 'project'
  | 'task'
  | 'version'
  | 'member'
  | 'role'
  | 'setting'
  | 'token'
  | 'build'
  | 'tag';

// 操作类型
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';

// 权限规则
export type PermissionRule = {
  resource: Resource;
  actions: Action[];
  description: string;
};

// 角色权限矩阵
export const ROLE_PERMISSIONS: Record<Role, PermissionRule[]> = {
  owner: [
    { resource: 'project', actions: ['create', 'read', 'update', 'delete', 'manage'], description: '项目完全控制' },
    { resource: 'task', actions: ['create', 'read', 'update', 'delete', 'manage'], description: '任务完全控制' },
    { resource: 'version', actions: ['create', 'read', 'update', 'delete', 'manage'], description: '版本完全控制' },
    { resource: 'member', actions: ['create', 'read', 'update', 'delete', 'manage'], description: '成员完全控制' },
    { resource: 'role', actions: ['create', 'read', 'update', 'delete', 'manage'], description: '角色完全控制' },
    { resource: 'setting', actions: ['create', 'read', 'update', 'delete', 'manage'], description: '设置完全控制' },
    { resource: 'token', actions: ['create', 'read', 'update', 'delete', 'manage'], description: 'Token 完全控制' },
    { resource: 'build', actions: ['create', 'read', 'update', 'delete', 'manage'], description: '构建完全控制' },
    { resource: 'tag', actions: ['create', 'read', 'update', 'delete', 'manage'], description: 'Tag 完全控制' },
  ],
  admin: [
    { resource: 'project', actions: ['create', 'read', 'update', 'delete', 'manage'], description: '项目完全控制' },
    { resource: 'task', actions: ['create', 'read', 'update', 'delete', 'manage'], description: '任务完全控制' },
    { resource: 'version', actions: ['create', 'read', 'update', 'delete', 'manage'], description: '版本完全控制' },
    { resource: 'member', actions: ['create', 'read', 'update'], description: '成员管理（不可删除/不可管理角色）' },
    { resource: 'role', actions: ['read'], description: '只读角色信息' },
    { resource: 'setting', actions: ['read', 'update'], description: '部分设置读写' },
    { resource: 'token', actions: ['create', 'read', 'update'], description: 'Token 创建和读取' },
    { resource: 'build', actions: ['create', 'read', 'update', 'delete'], description: '构建管理' },
    { resource: 'tag', actions: ['create', 'read', 'update', 'delete'], description: 'Tag 管理' },
  ],
  developer: [
    { resource: 'project', actions: ['create', 'read', 'update'], description: '项目创建和编辑' },
    { resource: 'task', actions: ['create', 'read', 'update'], description: '任务创建和编辑' },
    { resource: 'version', actions: ['create', 'read', 'update'], description: '版本创建和编辑' },
    { resource: 'member', actions: ['read'], description: '只读成员信息' },
    { resource: 'role', actions: ['read'], description: '只读角色信息' },
    { resource: 'setting', actions: ['read'], description: '只读设置' },
    { resource: 'token', actions: ['read'], description: '只读 Token' },
    { resource: 'build', actions: ['create', 'read'], description: '触发构建和查看' },
    { resource: 'tag', actions: ['create', 'read'], description: '创建和查看 Tag' },
  ],
  viewer: [
    { resource: 'project', actions: ['read'], description: '只读项目' },
    { resource: 'task', actions: ['read'], description: '只读任务' },
    { resource: 'version', actions: ['read'], description: '只读版本' },
    { resource: 'member', actions: ['read'], description: '只读成员' },
    { resource: 'role', actions: ['read'], description: '只读角色' },
    { resource: 'setting', actions: ['read'], description: '只读设置' },
    { resource: 'token', actions: [], description: '无 Token 权限' },
    { resource: 'build', actions: ['read'], description: '只读构建' },
    { resource: 'tag', actions: ['read'], description: '只读 Tag' },
  ],
};

export function hasPermission(role: Role, resource: Resource, action: Action): boolean {
  const rules = ROLE_PERMISSIONS[role];
  if (!rules) return false;
  const rule = rules.find(r => r.resource === resource);
  return rule?.actions.includes(action) ?? false;
}

export function requirePermission(role: Role, resource: Resource, action: Action): void {
  if (!hasPermission(role, resource, action)) {
    throw new Error(`Permission denied: ${role} cannot ${action} ${resource}`);
  }
}

export function getAccessibleResources(role: Role): Resource[] {
  const rules = ROLE_PERMISSIONS[role];
  return rules.filter(r => r.actions.length > 0).map(r => r.resource);
}

export function getResourceActions(role: Role, resource: Resource): Action[] {
  const rules = ROLE_PERMISSIONS[role];
  const rule = rules.find(r => r.resource === resource);
  return rule?.actions ?? [];
}
