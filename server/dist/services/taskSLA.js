/**
 * Task SLA Service
 * 任务SLA监控服务 - 截止时间/预警/违约追踪
 * iter-23 enhancement
 */
import { taskStore } from './taskLifecycle.js';
// 默认SLA定义（可配置）
const DEFAULT_SLA = [
    { priority: 'urgent', deadlineHours: 1, warningThreshold: 15 }, // urgent=1小时
    { priority: 'high', deadlineHours: 4, warningThreshold: 30 }, // high=4小时
    { priority: 'normal', deadlineHours: 24, warningThreshold: 60 }, // normal=1天
    { priority: 'low', deadlineHours: 72, warningThreshold: 120 }, // low=3天
];
// 内存存储：任务SLA映射
const taskSLAs = new Map();
const slaDefinitions = [...DEFAULT_SLA];
// ============ SLA 初始化 ============
export function initSLAForTask(taskId) {
    const task = taskStore.get(taskId);
    if (!task)
        return null;
    // 如果已有SLA，直接返回
    if (taskSLAs.has(taskId))
        return taskSLAs.get(taskId);
    // 根据优先级匹配SLA定义
    const slaDef = slaDefinitions.find(s => s.priority === task.priority) ?? slaDefinitions[2]; // 默认normal
    const createdAt = new Date(task.createdAt);
    const deadline = new Date(createdAt.getTime() + slaDef.deadlineHours * 60 * 60 * 1000);
    const now = new Date();
    const sla = {
        taskId,
        deadline: deadline.toISOString(),
        slaLevel: slaDef.priority,
        status: task.status === 'done' || task.status === 'failed' || task.status === 'cancelled' ? 'completed' : 'ok',
        remainingMinutes: Math.floor((deadline.getTime() - now.getTime()) / 60000),
        warningSent: false,
        completedAt: task.completedAt,
    };
    // 更新状态
    updateSLAStatus(sla, task.status);
    taskSLAs.set(taskId, sla);
    return sla;
}
function updateSLAStatus(sla, taskStatus) {
    const now = new Date();
    const deadline = new Date(sla.deadline);
    if (taskStatus === 'done') {
        sla.status = 'completed';
        sla.completedAt = taskStore.get(sla.taskId)?.completedAt;
    }
    else if (taskStatus === 'failed' || taskStatus === 'cancelled' || taskStatus === 'suspended') {
        sla.status = 'ok'; // 这些状态不算违约
    }
    else if (now > deadline) {
        sla.status = 'breached';
        sla.remainingMinutes = Math.floor((now.getTime() - deadline.getTime()) / 60000) * -1; // 负数
        if (!sla.breachedAt) {
            sla.breachedAt = now.toISOString();
            sla.exceededByMinutes = Math.floor((now.getTime() - deadline.getTime()) / 60000);
        }
    }
    else {
        sla.remainingMinutes = Math.floor((deadline.getTime() - now.getTime()) / 60000);
        const slaDef = slaDefinitions.find(s => s.priority === sla.slaLevel);
        if (sla.remainingMinutes <= (slaDef?.warningThreshold ?? 30)) {
            sla.status = 'at_risk';
        }
        else {
            sla.status = 'ok';
        }
    }
}
// ============ SLA 查询 ============
export function getTaskSLA(taskId) {
    const sla = taskSLAs.get(taskId);
    if (!sla)
        return initSLAForTask(taskId);
    // 实时更新状态
    const task = taskStore.get(taskId);
    if (task)
        updateSLAStatus(sla, task.status);
    return sla;
}
export function getAllSLAs(status) {
    const allSLAs = [];
    for (const [taskId, sla] of taskSLAs.entries()) {
        const task = taskStore.get(taskId);
        if (!task)
            continue;
        updateSLAStatus(sla, task.status);
        if (!status || sla.status === status) {
            allSLAs.push(sla);
        }
    }
    return allSLAs;
}
export function getBreachedSLAs() {
    return getAllSLAs('breached');
}
export function getAtRiskSLAs() {
    return getAllSLAs('at_risk');
}
// ============ SLA 预警检查 ============
export function checkSLAWarnings() {
    const warned = [];
    for (const [taskId, sla] of taskSLAs.entries()) {
        const task = taskStore.get(taskId);
        if (!task || task.status !== 'pending' && task.status !== 'running')
            continue;
        if (sla.warningSent)
            continue;
        if (sla.status === 'at_risk' || sla.status === 'breached') {
            sla.warningSent = true;
            warned.push(sla);
        }
    }
    return warned;
}
// ============ SLA 统计 ============
export function getSLAStats(timeWindowHours = 24 * 7) {
    const cutoff = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const tasks = [...taskStore.values()].filter(t => new Date(t.createdAt) > cutoff);
    let total = 0, breached = 0, atRisk = 0, ok = 0;
    const breachedTasks = [];
    const atRiskTasks = [];
    for (const task of tasks) {
        const sla = taskSLAs.get(task.taskId);
        if (!sla)
            continue;
        total++;
        switch (sla.status) {
            case 'breached':
                breached++;
                breachedTasks.push({ taskId: task.taskId, title: task.title, exceededByMinutes: sla.exceededByMinutes ?? 0 });
                break;
            case 'at_risk':
                atRisk++;
                atRiskTasks.push({ taskId: task.taskId, title: task.title, remainingMinutes: sla.remainingMinutes });
                break;
            case 'completed':
                ok++;
                break;
            default: ok++;
        }
    }
    // 计算平均响应时间（仅已完成的）
    const completedSLAs = [...taskSLAs.values()].filter(s => s.completedAt && s.status === 'completed');
    const avgResponseMinutes = completedSLAs.length > 0
        ? Math.round(completedSLAs.reduce((sum, s) => {
            const task = taskStore.get(s.taskId);
            if (!task || !s.completedAt)
                return sum;
            const created = new Date(task.createdAt).getTime();
            const completed = new Date(s.completedAt).getTime();
            return sum + (completed - created) / 60000;
        }, 0) / completedSLAs.length)
        : 0;
    return {
        total,
        breached,
        atRisk,
        ok,
        completionRate: total > 0 ? Math.round((ok / total) * 100) : 100,
        avgResponseMinutes,
        breachedTasks: breachedTasks.sort((a, b) => b.exceededByMinutes - a.exceededByMinutes).slice(0, 10),
        atRiskTasks: atRiskTasks.sort((a, b) => a.remainingMinutes - b.remainingMinutes).slice(0, 10),
    };
}
// ============ 手动设置截止时间 ============
export function setTaskDeadline(taskId, deadlineISO) {
    const task = taskStore.get(taskId);
    if (!task)
        return false;
    const slaDef = slaDefinitions.find(s => s.priority === task.priority) ?? slaDefinitions[2];
    const sla = taskSLAs.get(taskId) ??
        { taskId, deadline: '', slaLevel: slaDef.priority, status: 'ok', remainingMinutes: 0, warningSent: false };
    sla.deadline = deadlineISO;
    const now = new Date();
    const deadline = new Date(deadlineISO);
    sla.remainingMinutes = Math.floor((deadline.getTime() - now.getTime()) / 60000);
    updateSLAStatus(sla, task.status);
    taskSLAs.set(taskId, sla);
    return true;
}
// ============ SLA 配置 ============
export function getSLADefinitions() {
    return [...slaDefinitions];
}
export function updateSLADefinitions(defs) {
    slaDefinitions.length = 0;
    slaDefinitions.push(...defs);
}
