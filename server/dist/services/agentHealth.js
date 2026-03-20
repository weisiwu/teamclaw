/**
 * Agent 健康监控服务
 * 监控 Agent 心跳、自动恢复卡住的 Agent、汇总健康报告
 */
import { getAgent } from "./agentService.js";
import { abortExecution, getAgentExecutionStats } from "./agentExecution.js";
// ============ 内存状态 ============
// 记录每个 Agent 的心跳历史
const heartbeatHistory = new Map();
// 上次检查时间
let lastHealthCheck = new Date().toISOString();
// ============ 心跳记录 ============
/**
 * 记录 Agent 心跳
 */
export function recordHeartbeat(agentName) {
    const now = new Date().toISOString();
    const history = heartbeatHistory.get(agentName) || [];
    history.push(now);
    // 保留最近 100 条心跳
    if (history.length > 100)
        history.shift();
    heartbeatHistory.set(agentName, history);
}
/**
 * 获取 Agent 心跳历史
 */
export function getHeartbeatHistory(agentName, limit = 20) {
    const history = heartbeatHistory.get(agentName) || [];
    return history.slice(-limit);
}
/**
 * 计算心跳间隔统计
 */
export function getHeartbeatStats(agentName) {
    const history = getHeartbeatHistory(agentName, 50);
    if (history.length < 2) {
        return { avgIntervalMs: 0, minIntervalMs: 0, maxIntervalMs: 0, missingHeartbeats: 0 };
    }
    const intervals = [];
    for (let i = 1; i < history.length; i++) {
        intervals.push(new Date(history[i]).getTime() - new Date(history[i - 1]).getTime());
    }
    const avgIntervalMs = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    const minIntervalMs = Math.min(...intervals);
    const maxIntervalMs = Math.max(...intervals);
    // 检测漏掉的心跳（正常间隔 30s，超过 60s 认为丢失）
    const missingHeartbeats = intervals.filter((iv) => iv > 60000).length;
    return { avgIntervalMs, minIntervalMs, maxIntervalMs, missingHeartbeats };
}
// ============ 健康评估 ============
/**
 * 评估单个 Agent 健康状态
 */
export function assessAgentHealth(agentName, stats) {
    const agent = getAgent(agentName);
    const hbStats = getHeartbeatStats(agentName);
    const history = heartbeatHistory.get(agentName) || [];
    const lastHeartbeat = history.length > 0 ? history[history.length - 1] : null;
    const issues = [];
    const recommendations = [];
    // 评估心跳健康
    let hbStatus = "healthy";
    if (hbStats.missingHeartbeats >= 5) {
        hbStatus = "unhealthy";
        issues.push(`连续丢失 ${hbStats.missingHeartbeats} 次心跳`);
        recommendations.push("检查 Agent 进程是否存活");
    }
    else if (hbStats.missingHeartbeats >= 2) {
        hbStatus = "degraded";
        issues.push(`丢失 ${hbStats.missingHeartbeats} 次心跳`);
        recommendations.push("关注 Agent 响应情况");
    }
    // 评估失败率
    const failureRate = stats.total > 0
        ? (stats.failed + stats.timeout) / stats.total
        : 0;
    if (failureRate > 0.3) {
        hbStatus = "unhealthy";
        issues.push(`失败率过高: ${(failureRate * 100).toFixed(0)}%`);
        recommendations.push("检查 Agent 执行日志排查根本原因");
    }
    else if (failureRate > 0.15) {
        if (hbStatus !== "unhealthy")
            hbStatus = "degraded";
        issues.push(`失败率偏高: ${(failureRate * 100).toFixed(0)}%`);
        recommendations.push("关注 Agent 稳定性");
    }
    // 评估响应时间
    if (stats.avgDurationMs > 300000) { // > 5min
        if (hbStatus !== "unhealthy")
            hbStatus = "degraded";
        issues.push(`平均响应时间过长: ${Math.round(stats.avgDurationMs / 1000)}s`);
        recommendations.push("考虑拆分任务或优化 Agent 性能");
    }
    // Agent offline
    if (!agent || agent.status === "offline") {
        hbStatus = "offline";
        issues.push("Agent 离线");
        recommendations.push("检查 Agent 进程和网络连接");
    }
    // 计算 uptime
    const uptime = calculateUptime(agentName);
    return {
        name: agentName,
        status: hbStatus,
        lastHeartbeat,
        consecutiveMissedHeartbeats: hbStats.missingHeartbeats,
        uptime,
        totalExecutions: stats.total,
        failureRate: Math.round(failureRate * 100) / 100,
        avgResponseTime: stats.avgDurationMs,
        issues,
        recommendations,
    };
}
/**
 * 获取所有 Agent 健康报告
 */
export function getTeamHealthReport() {
    const agentNames = ["main", "pm", "reviewer", "coder1", "coder2"];
    const stats = getAgentExecutionStats();
    const agents = agentNames.map((name) => assessAgentHealth(name, stats[name] || { total: 0, completed: 0, failed: 0, timeout: 0, avgDurationMs: 0 }));
    const summary = {
        healthy: agents.filter((a) => a.status === "healthy").length,
        degraded: agents.filter((a) => a.status === "degraded").length,
        unhealthy: agents.filter((a) => a.status === "unhealthy").length,
        offline: agents.filter((a) => a.status === "offline").length,
    };
    let overall = "healthy";
    if (summary.unhealthy > 0 || summary.offline > 0)
        overall = "unhealthy";
    else if (summary.degraded > 0)
        overall = "degraded";
    lastHealthCheck = new Date().toISOString();
    return { overall, checkedAt: lastHealthCheck, agents, summary };
}
// ============ 自动恢复 ============
/**
 * 执行健康检查并自动恢复卡住的 Agent
 */
export function runHealthCheck() {
    const report = getTeamHealthReport();
    const recovered = [];
    const stillStuck = [];
    const offline = [];
    for (const agent of report.agents) {
        if (agent.status === "unhealthy" || agent.status === "degraded") {
            if (agent.consecutiveMissedHeartbeats >= 5) {
                // 尝试恢复：终止当前执行
                const aborted = abortExecution(agent.name, "健康检查自动终止");
                if (aborted) {
                    recovered.push(agent.name);
                }
                else {
                    stillStuck.push(agent.name);
                }
            }
        }
        if (agent.status === "offline") {
            offline.push(agent.name);
        }
    }
    return {
        checkedAt: report.checkedAt,
        recovered,
        stillStuck,
        offline,
    };
}
// ============ 工具函数 ============
function calculateUptime(agentName) {
    const history = heartbeatHistory.get(agentName) || [];
    if (history.length === 0)
        return "unknown";
    const firstHeartbeat = new Date(history[0]);
    const now = new Date();
    const diffMs = now.getTime() - firstHeartbeat.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0)
        return `${days}d ${hours}h`;
    if (hours > 0)
        return `${hours}h`;
    return "< 1h";
}
