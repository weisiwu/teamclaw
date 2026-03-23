/**
 * Agent 管理服务
 * 管理 Agent 的运行时状态、配置查询、团队概览
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { AGENT_TEAM, getAgentByName, getTeamOverview, DISPATCH_MATRIX, } from "../constants/agents.js";
// ============ 内存存储：Agent 运行时状态 ============
const agentRuntimes = new Map();
// 初始化运行时状态
AGENT_TEAM.forEach((agent) => {
    agentRuntimes.set(agent.name, {
        name: agent.name,
        status: "idle",
        currentTask: null,
        currentTaskStartedAt: null,
        lastHeartbeat: new Date().toISOString(),
        loadScore: 0,
    });
});
// ============ Agent 服务 ============
/**
 * 获取所有 Agent 列表（配置 + 运行时）
 */
export function getAllAgents() {
    return AGENT_TEAM.map((config) => {
        const runtime = agentRuntimes.get(config.name);
        return {
            ...config,
            status: runtime.status,
            currentTask: runtime.currentTask,
            currentTaskStartedAt: runtime.currentTaskStartedAt,
            lastHeartbeat: runtime.lastHeartbeat,
            loadScore: runtime.loadScore,
        };
    });
}
/**
 * 获取单个 Agent 详情
 */
export function getAgent(name) {
    const config = getAgentByName(name);
    if (!config)
        return null;
    const runtime = agentRuntimes.get(name);
    return {
        ...config,
        status: runtime?.status || "offline",
        currentTask: runtime?.currentTask || null,
        currentTaskStartedAt: runtime?.currentTaskStartedAt || null,
        lastHeartbeat: runtime?.lastHeartbeat || null,
        loadScore: runtime?.loadScore || 0,
    };
}
/**
 * 更新 Agent 配置（部分字段）
 */
export function updateAgentConfig(name, updates) {
    const config = getAgentByName(name);
    if (!config)
        return null;
    // 更新常量数组（内存，重启后恢复）
    const idx = AGENT_TEAM.findIndex((a) => a.name === name);
    if (idx >= 0) {
        if (updates.defaultModel)
            AGENT_TEAM[idx].defaultModel = updates.defaultModel;
        if (updates.capabilities)
            AGENT_TEAM[idx].capabilities = updates.capabilities;
    }
    return getAgent(name);
}
/**
 * 获取 Agent 历史会话列表（真实数据）
 * 从 ~/.openclaw/agents/{name}/sessions/ 目录读取
 */
export function getAgentSessions(name) {
    const config = getAgentByName(name);
    if (!config)
        return [];
    const sessionsDir = path.join(os.homedir(), ".openclaw", "agents", name, "sessions");
    if (!fs.existsSync(sessionsDir)) {
        return [
            {
                sessionId: `session_${name}_001`,
                updatedAt: new Date().toISOString(),
                label: `${config.role} 当前会话（无历史）`,
            },
        ];
    }
    try {
        const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith(".jsonl"));
        // 按修改时间倒序，取最近 20 个
        const sorted = files
            .map((file) => {
            const filePath = path.join(sessionsDir, file);
            const stat = fs.statSync(filePath);
            return {
                sessionId: file.replace(".jsonl", ""),
                updatedAt: stat.mtime.toISOString(),
                label: `${config.role} 会话 ${file.slice(0, 8)}`,
            };
        })
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 20);
        return sorted.length > 0
            ? sorted
            : [
                {
                    sessionId: `session_${name}_001`,
                    updatedAt: new Date().toISOString(),
                    label: `${config.role} 当前会话（无历史）`,
                },
            ];
    }
    catch {
        return [
            {
                sessionId: `session_${name}_001`,
                updatedAt: new Date().toISOString(),
                label: `${config.role} 当前会话（读取失败）`,
            },
        ];
    }
}
/**
 * 获取团队概览
 */
export function getTeamOverviewData() {
    const levels = getTeamOverview().map(({ level, agents }) => ({
        level,
        label: `Lv${level}`,
        agents: agents.map((a) => getAgent(a.name)),
    }));
    return {
        levels,
        dispatchMatrix: DISPATCH_MATRIX,
    };
}
/**
 * 更新 Agent 运行时状态
 */
export function updateAgentStatus(name, status, taskId) {
    const runtime = agentRuntimes.get(name);
    if (!runtime)
        return false;
    runtime.status = status;
    runtime.lastHeartbeat = new Date().toISOString();
    if (taskId) {
        runtime.currentTask = taskId;
        runtime.currentTaskStartedAt = new Date().toISOString();
    }
    return true;
}
/**
 * 释放 Agent 任务（任务完成时调用）
 */
export function releaseAgent(name) {
    const runtime = agentRuntimes.get(name);
    if (!runtime)
        return false;
    runtime.status = "idle";
    runtime.currentTask = null;
    runtime.currentTaskStartedAt = null;
    runtime.loadScore = Math.max(0, runtime.loadScore - 20);
    return true;
}
/**
 * 更新 Agent 负载评分
 */
export function updateLoadScore(name, delta) {
    const runtime = agentRuntimes.get(name);
    if (!runtime)
        return false;
    runtime.loadScore = Math.max(0, Math.min(100, runtime.loadScore + delta));
    return true;
}
/**
 * 获取可用 Agent（用于负载均衡选择 coder）
 */
export function getAvailableAgents(level) {
    const agents = level
        ? AGENT_TEAM.filter((a) => a.level === level)
        : AGENT_TEAM;
    return agents
        .filter((a) => {
        const runtime = agentRuntimes.get(a.name);
        return runtime?.status === "idle" || runtime?.loadScore < 70;
    })
        .sort((a, b) => {
        const scoreA = agentRuntimes.get(a.name)?.loadScore || 0;
        const scoreB = agentRuntimes.get(b.name)?.loadScore || 0;
        return scoreA - scoreB; // 低负载优先
    })
        .map((a) => a.name);
}
