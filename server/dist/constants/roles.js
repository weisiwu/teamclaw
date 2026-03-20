/**
 * 角色与权限常量定义
 * 定义系统中的角色、权重、Agent 访问矩阵
 */
export const ROLE_LABELS = {
    admin: "管理员",
    vice_admin: "副管理员",
    member: "普通员工",
};
export const ROLE_WEIGHTS = {
    admin: 10,
    vice_admin: 7,
    member: 3,
};
// ============ 权限矩阵 ============
// key: Role, value: 可访问的 Agent 列表
export const AGENT_ACCESS_MATRIX = {
    admin: ["main", "pm", "coder", "reviewer"],
    vice_admin: ["main", "pm"],
    member: ["pm"],
};
export const MEMBER_PM_CAPABILITIES = {
    admin: "full",
    vice_admin: "full",
    member: "assistant_only",
};
// ============ 权限检查函数 ============
/**
 * 检查用户是否有权限与指定 Agent 交互
 */
export function canAccessAgent(role, agent) {
    const allowedAgents = AGENT_ACCESS_MATRIX[role] || [];
    return allowedAgents.includes(agent);
}
/**
 * 获取用户与 pm 交互时的能力范围
 */
export function getPmCapability(role) {
    return MEMBER_PM_CAPABILITIES[role] || "assistant_only";
}
/**
 * 比较两个角色的权重
 * @returns 正数：roleA 权重更高，负数：roleB 权重更高，0：相同
 */
export function compareRoleWeight(roleA, roleB) {
    return (ROLE_WEIGHTS[roleA] || 0) - (ROLE_WEIGHTS[roleB] || 0);
}
/**
 * 获取优先级高于指定角色的最小角色
 */
export function getHigherRole(role) {
    const sortedRoles = Object.keys(ROLE_WEIGHTS).sort((a, b) => ROLE_WEIGHTS[b] - ROLE_WEIGHTS[a]);
    const idx = sortedRoles.indexOf(role);
    return idx > 0 ? sortedRoles[idx - 1] : null;
}
