/**
 * 人员管理服务
 * 增删改查业务逻辑、角色权重校验
 *
 * Persistence: PostgreSQL (via userRepo.ts)
 * Fixes: BUG-05 内存Map存储重启全丢
 */

import { generateId } from '../utils/generateId.js';
import { Role, ROLE_WEIGHTS } from '../constants/roles.js';
import { userRepo, UserRow } from '../db/repositories/userRepo.js';

// ============ 用户数据类型 ============
export interface User {
  id: string;
  userId: string; // 外部ID（微信/飞书）
  name: string;
  role: Role;
  weight: number;
  wechatId?: string;
  feishuId?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  name: string;
  role: Role;
  wechatId?: string;
  feishuId?: string;
  remark?: string;
}

export interface UpdateUserRequest {
  name?: string;
  role?: Role;
  wechatId?: string;
  feishuId?: string;
  remark?: string;
}

// ============ 内部 Helper ============

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    role: row.role as Role,
    weight: row.weight,
    wechatId: row.wechat_id ?? undefined,
    feishuId: row.feishu_id ?? undefined,
    remark: row.remark ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function generateUserId(): string {
  return generateId('u');
}

// ============ CRUD 操作 ============

/**
 * 获取所有用户（支持分页、角色筛选）
 */
export async function listUsers(options?: {
  page?: number;
  pageSize?: number;
  role?: Role;
}): Promise<{ list: User[]; total: number }> {
  const { page = 1, pageSize = 20, role } = options ?? {};

  const total = await userRepo.count(role);
  const offset = (page - 1) * pageSize;
  const rows = await userRepo.findAll(role, pageSize, offset);

  return { list: rows.map(rowToUser), total };
}

/**
 * 根据 ID 获取用户详情
 */
export async function getUserById(id: string): Promise<User | null> {
  const row = await userRepo.findById(id);
  return row ? rowToUser(row) : null;
}

/**
 * 根据 userId（外部ID）获取用户
 */
export async function getUserByExternalId(
  wechatId?: string,
  feishuId?: string
): Promise<User | null> {
  const row = await userRepo.findByExternalId(wechatId, feishuId);
  return row ? rowToUser(row) : null;
}

/**
 * 创建用户
 */
export async function createUser(data: CreateUserRequest): Promise<User> {
  const now = new Date().toISOString();
  const id = generateUserId();
  const userId = generateUserId();

  const user: User = {
    id,
    userId,
    name: data.name,
    role: data.role,
    weight: ROLE_WEIGHTS[data.role] || 0,
    wechatId: data.wechatId,
    feishuId: data.feishuId,
    remark: data.remark,
    createdAt: now,
    updatedAt: now,
  };

  await userRepo.insert({
    id: user.id,
    userId: user.userId,
    name: user.name,
    role: user.role,
    weight: user.weight,
    wechatId: user.wechatId,
    feishuId: user.feishuId,
    remark: user.remark,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });

  return user;
}

/**
 * 更新用户信息
 */
export async function updateUser(id: string, data: UpdateUserRequest): Promise<User | null> {
  const existing = await userRepo.findById(id);
  if (!existing) return null;

  const now = new Date().toISOString();

  await userRepo.update(id, {
    name: data.name,
    role: data.role,
    weight: data.role ? ROLE_WEIGHTS[data.role] : undefined,
    wechatId: data.wechatId,
    feishuId: data.feishuId,
    remark: data.remark,
    updatedAt: now,
  });

  // Re-fetch to return updated user
  const updated = await userRepo.findById(id);
  return updated ? rowToUser(updated) : null;
}

/**
 * 删除用户
 */
export async function deleteUser(id: string): Promise<boolean> {
  const deleted = await userRepo.delete(id);
  return deleted > 0;
}

/**
 * 批量删除用户
 */
export async function batchDeleteUsers(ids: string[]): Promise<number> {
  let deleted = 0;
  for (const id of ids) {
    const n = await userRepo.delete(id);
    deleted += n;
  }
  return deleted;
}
