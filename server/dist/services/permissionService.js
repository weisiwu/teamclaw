/**
 * 权限规则引擎
 * 实现 checkPermission 和 getCapability 逻辑
 */
import { canAccessAgent, getPmCapability, } from "../constants/roles.js";
/**
 * 检查用户是否有权限与指定 Agent 交互
 */
export function checkPermission(userRole, agent) {
    const allowed = canAccessAgent(userRole, agent);
    if (!allowed) {
        return {
            allowed: false,
            role: userRole,
            capability: "assistant_only",
            reason: getNoPermissionReason(userRole, agent),
        };
    }
    return {
        allowed: true,
        role: userRole,
        capability: getPmCapability(userRole),
    };
}
/**
 * 获取与 pm 交互时的能力范围
 */
export function getCapability(userRole) {
    return getPmCapability(userRole);
}
/**
 * 生成无权限原因描述
 */
function getNoPermissionReason(role, agent) {
    if (agent === "main") {
        return "只有管理员和副管理员可以与 main 交互";
    }
    if (agent === "pm") {
        return "系统错误：理论上所有人都可以与 pm 交互";
    }
    return `角色 ${role} 没有权限访问 Agent ${agent}`;
}
/**
 * 验证角色权重是否满足最低要求
 */
export function meetsMinWeight(role, minWeight) {
    const weights = {
        admin: 10,
        vice_admin: 7,
        member: 3,
    };
    return (weights[role] || 0) >= minWeight;
}
/**
 * 获取角色对应的优先级数值（数值越大优先级越高）
 */
export function getRolePriority(role) {
    const priorities = {
        admin: 3,
        vice_admin: 2,
        member: 1,
    };
    return priorities[role] || 0;
}
