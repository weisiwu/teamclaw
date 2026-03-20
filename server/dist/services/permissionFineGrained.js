/**
 * 细粒度权限服务
 * 支持资源级、字段级、操作级权限控制
 */
// 角色默认资源权限
export const ROLE_RESOURCE_PERMISSIONS = {
    admin: [
        { resource: "user", actions: ["create", "read", "update", "delete", "admin"] },
        { resource: "member", actions: ["create", "read", "update", "delete", "admin"] },
        { resource: "role", actions: ["create", "read", "update", "delete", "admin"] },
        { resource: "task", actions: ["create", "read", "update", "delete", "admin"] },
        { resource: "message", actions: ["create", "read", "update", "delete", "admin"] },
        { resource: "project", actions: ["create", "read", "update", "delete", "admin"] },
        { resource: "version", actions: ["create", "read", "update", "delete", "admin"] },
        { resource: "doc", actions: ["create", "read", "update", "delete", "admin"] },
        { resource: "config", actions: ["read", "update", "admin"] },
        { resource: "audit", actions: ["read", "admin"] },
    ],
    vice_admin: [
        { resource: "user", actions: ["read", "update"] },
        { resource: "member", actions: ["read", "update"] },
        { resource: "role", actions: ["read"] },
        { resource: "task", actions: ["create", "read", "update"] },
        { resource: "message", actions: ["create", "read", "update"] },
        { resource: "project", actions: ["create", "read", "update"] },
        { resource: "version", actions: ["create", "read", "update"] },
        { resource: "doc", actions: ["create", "read", "update"] },
        { resource: "config", actions: ["read"] },
        { resource: "audit", actions: ["read"] },
    ],
    member: [
        { resource: "user", actions: ["read"] },
        { resource: "member", actions: ["read"] },
        { resource: "role", actions: ["read"] },
        { resource: "task", actions: ["create", "read", "update"] },
        { resource: "message", actions: ["create", "read"] },
        { resource: "project", actions: ["read"] },
        { resource: "version", actions: ["read"] },
        { resource: "doc", actions: ["read"] },
        { resource: "config", actions: [] },
        { resource: "audit", actions: [] },
    ],
};
// ============ 字段级权限 ============
// 指定哪些角色可以修改哪些字段
export const FIELD_WRITE_PERMISSIONS = {
    user: {
        admin: ["name", "role", "wechatId", "feishuId", "remark"],
        vice_admin: ["name", "remark"],
        member: [],
    },
    member: {
        admin: ["name", "role", "wechatId", "feishuId", "remark"],
        vice_admin: ["name", "remark"],
        member: [],
    },
    role: {
        admin: ["name", "weight"],
    },
    task: {
        admin: ["*"],
        vice_admin: ["title", "description", "status", "priority", "assignee"],
        member: ["title", "description", "status"],
    },
    message: {
        admin: ["*"],
        vice_admin: ["content", "priority"],
        member: ["content"],
    },
    project: {
        admin: ["*"],
        vice_admin: ["name", "description", "techStack"],
        member: [],
    },
    version: {
        admin: ["*"],
        vice_admin: ["name", "tag"],
        member: [],
    },
    doc: {
        admin: ["*"],
        vice_admin: ["title", "content", "tags"],
        member: ["content"],
    },
    config: {
        admin: ["*"],
    },
    audit: {
        admin: ["*"],
    },
};
// ============ 权限检查 ============
/**
 * 检查用户是否有权限执行指定操作
 */
export function canPerform(role, resource, action) {
    const perms = ROLE_RESOURCE_PERMISSIONS[role] || [];
    const rp = perms.find((p) => p.resource === resource);
    if (!rp)
        return false;
    return rp.actions.includes(action) || rp.actions.includes("admin");
}
/**
 * 获取用户在指定资源上可写的字段列表
 */
export function getWritableFields(role, resource) {
    const fields = FIELD_WRITE_PERMISSIONS[resource];
    if (!fields)
        return [];
    const roleFields = fields[role];
    if (!roleFields)
        return [];
    if (roleFields.includes("*"))
        return ["*"];
    return roleFields;
}
/**
 * 检查用户是否可以写入指定字段
 */
export function canWriteField(role, resource, field) {
    const writable = getWritableFields(role, resource);
    if (writable.includes("*"))
        return true;
    return writable.includes(field);
}
/**
 * 获取用户在指定资源上可执行的所有操作
 */
export function getAllowedActions(role, resource) {
    const perms = ROLE_RESOURCE_PERMISSIONS[role] || [];
    const rp = perms.find((p) => p.resource === resource);
    return rp?.actions || [];
}
/**
 * 获取用户的完整资源权限映射
 */
export function getUserPermissionMap(role) {
    return ROLE_RESOURCE_PERMISSIONS[role] || [];
}
/**
 * 过滤出用户可写的字段（用于更新请求）
 */
export function filterWritableFields(role, resource, data) {
    const writable = getWritableFields(role, resource);
    if (writable.includes("*"))
        return data;
    const result = {};
    Object.keys(data).forEach((key) => {
        if (writable.includes(key)) {
            result[key] = data[key];
        }
    });
    return result;
}
