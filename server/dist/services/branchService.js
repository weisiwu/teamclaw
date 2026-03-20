// Branch 分支服务
// 提供分支的 CRUD、设置主分支、保护等业务逻辑
// ========== In-Memory Storage ==========
const branches = new Map();
let nextId = 1;
// 默认配置
const defaultConfig = {
    defaultBranch: 'main',
    protectedBranches: ['main', 'master', 'release/*'],
    allowForcePush: false,
    autoCleanupMerged: false,
};
let config = { ...defaultConfig };
// ========== 初始化默认分支 ==========
function initDefaultBranch() {
    if (branches.size === 0) {
        const mainBranch = {
            id: `branch_${nextId++}`,
            name: 'main',
            isMain: true,
            isRemote: false,
            isProtected: true,
            createdAt: new Date().toISOString(),
            lastCommitAt: new Date().toISOString(),
            commitMessage: 'Initial commit',
            author: 'system',
            description: 'Default main branch',
        };
        branches.set(mainBranch.id, mainBranch);
    }
}
initDefaultBranch();
// ========== 分支 CRUD ==========
// 获取所有分支
export function getAllBranches() {
    return Array.from(branches.values()).sort((a, b) => {
        // 主分支排在最前
        if (a.isMain)
            return -1;
        if (b.isMain)
            return 1;
        return a.name.localeCompare(b.name);
    });
}
// 获取单个分支
export function getBranch(id) {
    return branches.get(id);
}
// 按名称获取分支
export function getBranchByName(name) {
    return Array.from(branches.values()).find(b => b.name === name);
}
// 获取主分支
export function getMainBranch() {
    return Array.from(branches.values()).find(b => b.isMain);
}
// 创建分支
export function createBranch(data) {
    // 检查名称是否已存在
    const existing = getBranchByName(data.name);
    if (existing) {
        throw new Error(`Branch ${data.name} already exists`);
    }
    const branch = {
        id: `branch_${nextId++}`,
        name: data.name,
        isMain: false,
        isRemote: false,
        isProtected: false,
        createdAt: new Date().toISOString(),
        lastCommitAt: new Date().toISOString(),
        commitMessage: `Created branch ${data.name}`,
        author: data.author || 'user',
        versionId: data.versionId,
        baseBranch: data.baseBranch,
        description: data.description,
    };
    branches.set(branch.id, branch);
    return branch;
}
// 更新分支
export function updateBranch(id, updates) {
    const branch = branches.get(id);
    if (!branch)
        return undefined;
    // 名称冲突检查
    if (updates.name && updates.name !== branch.name) {
        const existing = getBranchByName(updates.name);
        if (existing && existing.id !== id) {
            throw new Error(`Branch ${updates.name} already exists`);
        }
    }
    // 主分支强制保护
    if (branch.isMain) {
        updates.isProtected = true;
    }
    const updated = { ...branch, ...updates };
    branches.set(id, updated);
    return updated;
}
// 删除分支
export function deleteBranch(id) {
    const branch = branches.get(id);
    if (!branch)
        return false;
    if (branch.isProtected) {
        throw new Error('Cannot delete protected branch');
    }
    if (branch.isMain) {
        throw new Error('Cannot delete main branch');
    }
    return branches.delete(id);
}
// 设置主分支
export function setMainBranch(id) {
    const branch = branches.get(id);
    if (!branch)
        return undefined;
    // 取消当前主分支
    for (const [bid, b] of branches) {
        if (b.isMain) {
            branches.set(bid, { ...b, isMain: false });
        }
    }
    // 设置新主分支
    const updated = branches.get(id);
    if (updated) {
        branches.set(id, { ...updated, isMain: true, isProtected: true });
    }
    return branches.get(id);
}
// 保护/取消保护分支
export function setBranchProtection(id, protect) {
    const branch = branches.get(id);
    if (!branch)
        return undefined;
    if (branch.isMain && !protect) {
        throw new Error('Main branch must always be protected');
    }
    return updateBranch(id, { isProtected: protect });
}
// 重命名分支
export function renameBranch(id, newName) {
    const branch = branches.get(id);
    if (!branch)
        return undefined;
    if (branch.isProtected) {
        throw new Error('Protected branch cannot be renamed');
    }
    return updateBranch(id, { name: newName });
}
// 获取分支配置
export function getBranchConfig() {
    return { ...config };
}
// 更新分支配置
export function updateBranchConfig(updates) {
    config = { ...config, ...updates };
    return { ...config };
}
// 检出分支（切换到指定分支）
export function checkoutBranch(id) {
    const branch = branches.get(id);
    if (!branch)
        return undefined;
    if (branch.isProtected || branch.isMain) {
        // 保护分支和主分支可以直接 checkout
        return branch;
    }
    // 更新 lastCommitAt 为当前时间，表示最近操作过
    return updateBranch(id, { lastCommitAt: new Date().toISOString() });
}
// 获取分支统计
export function getBranchStats() {
    const all = getAllBranches();
    return {
        total: all.length,
        main: all.filter(b => b.isMain).length,
        protected: all.filter(b => b.isProtected).length,
        remote: all.filter(b => b.isRemote).length,
    };
}
