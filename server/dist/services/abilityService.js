import { DEFAULT_ABILITIES } from '../models/ability.js';
// 内存存储 - 能力状态
const abilities = new Map();
// 初始化默认能力
function initAbilities() {
    const now = new Date().toISOString();
    for (const def of DEFAULT_ABILITIES) {
        abilities.set(def.id, {
            ...def,
            createdAt: now,
            updatedAt: now,
        });
    }
}
// 获取所有能力
function getAbilities() {
    return Array.from(abilities.values());
}
// 获取单个能力
function getAbility(id) {
    return abilities.get(id);
}
// 更新能力状态
function updateAbility(id, enabled) {
    const ability = abilities.get(id);
    if (!ability)
        return null;
    ability.enabled = enabled;
    ability.updatedAt = new Date().toISOString();
    return ability;
}
// 重置所有能力到默认状态
function resetAbilities() {
    abilities.clear();
    initAbilities();
}
// 检查用户是否有权使用某能力
function canUseAbility(abilityId, userRole) {
    const ability = abilities.get(abilityId);
    if (!ability)
        return false;
    if (!ability.enabled)
        return false;
    if (ability.requiredRole === 'all')
        return true;
    if (ability.requiredRole === 'admin')
        return userRole === 'admin';
    if (ability.requiredRole === 'sub_admin')
        return userRole === 'admin' || userRole === 'sub_admin';
    return false;
}
// 初始化
initAbilities();
export const abilityService = {
    getAbilities,
    getAbility,
    updateAbility,
    resetAbilities,
    canUseAbility,
};
