/**
 * 人员管理服务
 * 增删改查业务逻辑、角色权重校验
 */
import { ROLE_WEIGHTS } from "../constants/roles.js";
// ============ 内存数据存储（Placeholder，后续替换为真实DB） ============
const userStore = new Map();
function generateId() {
    return `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
// ============ CRUD 操作 ============
/**
 * 获取所有用户（支持分页、角色筛选）
 */
export async function listUsers(options) {
    let users = Array.from(userStore.values());
    // 角色筛选
    if (options?.role) {
        users = users.filter((u) => u.role === options.role);
    }
    // 排序（按 createdAt 降序）
    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = users.length;
    // 分页
    if (options?.page && options?.pageSize) {
        const start = (options.page - 1) * options.pageSize;
        users = users.slice(start, start + options.pageSize);
    }
    return { list: users, total };
}
/**
 * 根据 ID 获取用户详情
 */
export async function getUserById(id) {
    return userStore.get(id) || null;
}
/**
 * 根据 userId（外部ID）获取用户
 */
export async function getUserByExternalId(wechatId, feishuId) {
    const users = Array.from(userStore.values());
    return (users.find((u) => (wechatId && u.wechatId === wechatId) ||
        (feishuId && u.feishuId === feishuId)) || null);
}
/**
 * 创建用户
 */
export async function createUser(data) {
    const now = new Date().toISOString();
    const user = {
        id: generateId(),
        userId: generateId(),
        name: data.name,
        role: data.role,
        weight: ROLE_WEIGHTS[data.role] || 0,
        wechatId: data.wechatId,
        feishuId: data.feishuId,
        remark: data.remark,
        createdAt: now,
        updatedAt: now,
    };
    userStore.set(user.id, user);
    return user;
}
/**
 * 更新用户信息
 */
export async function updateUser(id, data) {
    const user = userStore.get(id);
    if (!user)
        return null;
    const updated = {
        ...user,
        name: data.name ?? user.name,
        role: data.role ?? user.role,
        weight: data.role ? ROLE_WEIGHTS[data.role] : user.weight,
        wechatId: data.wechatId ?? user.wechatId,
        feishuId: data.feishuId ?? user.feishuId,
        remark: data.remark ?? user.remark,
        updatedAt: new Date().toISOString(),
    };
    userStore.set(id, updated);
    return updated;
}
/**
 * 删除用户
 */
export async function deleteUser(id) {
    return userStore.delete(id);
}
/**
 * 批量删除用户
 */
export async function batchDeleteUsers(ids) {
    let deleted = 0;
    ids.forEach((id) => {
        if (userStore.delete(id))
            deleted++;
    });
    return deleted;
}
