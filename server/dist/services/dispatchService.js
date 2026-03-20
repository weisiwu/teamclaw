/**
 * 任务指派规则引擎
 * 负责等级校验、Agent 可用性检查、负载均衡选择
 */
import { canDispatch, getAgentByName, getAvailableAgents } from "../constants/agents.js";
import { updateAgentStatus, updateLoadScore, getAgent, } from "./agentService.js";
// 内存存储：活跃任务列表
const activeTasks = new Map();
/**
 * 向指定 Agent 分发任务
 */
export function dispatchTask(req) {
    const { fromAgent, toAgent, taskId, priority } = req;
    // 1. 检查 fromAgent 是否存在
    const from = getAgentByName(fromAgent);
    if (!from) {
        return { success: false, message: `Agent '${fromAgent}' 不存在`, rejected: true, reason: "from_not_found" };
    }
    // 2. 检查 toAgent 是否存在
    const to = getAgentByName(toAgent);
    if (!to) {
        return { success: false, message: `Agent '${toAgent}' 不存在`, rejected: true, reason: "to_not_found" };
    }
    // 3. 检查等级指派规则（高→低）
    if (isReverseDispatch(fromAgent, toAgent)) {
        return {
            success: false,
            message: `拒绝指派：${fromAgent}(Lv${from.level}) 无法向 ${toAgent}(Lv${to.level}) 指派任务（低级不能向高级指派）`,
            rejected: true,
            reason: "reverse_dispatch",
        };
    }
    // 4. 检查 from → to 是否在指派矩阵中
    if (!canDispatch(fromAgent, toAgent)) {
        return {
            success: false,
            message: `拒绝指派：${fromAgent} 没有权限向 ${toAgent} 指派任务`,
            rejected: true,
            reason: "not_in_matrix",
        };
    }
    // 5. 检查 toAgent 是否可用
    const toRuntime = getAgent(toAgent);
    if (!toRuntime) {
        return { success: false, message: `Agent '${toAgent}' 运行时状态不存在`, rejected: true, reason: "runtime_not_found" };
    }
    if (toRuntime.status === "busy") {
        return {
            success: false,
            message: `Agent '${toAgent}' 正忙（当前任务：${toRuntime.currentTask}）`,
            rejected: true,
            reason: "agent_busy",
        };
    }
    // 6. 通过所有检查，执行指派
    updateAgentStatus(toAgent, "busy", taskId);
    updateLoadScore(toAgent, getPriorityLoadIncrement(priority));
    activeTasks.set(taskId, req);
    return {
        success: true,
        message: `任务已指派给 ${toAgent}`,
        taskId,
    };
}
/**
 * 反向检查（低级不能指派高级）
 */
function isReverseDispatch(from, to) {
    return !canDispatch(from, to);
}
/**
 * 根据优先级计算负载增量
 */
function getPriorityLoadIncrement(priority) {
    switch (priority) {
        case "urgent": return 50;
        case "high": return 30;
        case "normal": return 20;
        case "low": return 10;
        default: return 20;
    }
}
/**
 * 完成任务（从 activeTasks 移除，更新 agent 状态）
 */
export function completeTask(taskId) {
    const task = activeTasks.get(taskId);
    if (!task)
        return false;
    activeTasks.delete(taskId);
    // agent 会在 agentService 中自动变为 idle，这里只记录
    return true;
}
/**
 * 获取活跃任务列表
 */
export function getActiveTasks() {
    return Array.from(activeTasks.values());
}
/**
 * 获取指定 Agent 的当前任务
 */
export function getAgentCurrentTask(agentName) {
    for (const task of activeTasks.values()) {
        if (task.toAgent === agentName)
            return task;
    }
    return null;
}
/**
 * 选择最优 coder（负载均衡）
 */
export function selectBestCoder() {
    const available = getAvailableAgents(1); // level 1 = coder
    if (available.length === 0)
        return null;
    return available[0].name; // 已按负载排序，低的在前
}
