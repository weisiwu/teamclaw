/**
 * Agent 管理路由
 * GET  /api/v1/agents              - 获取所有 Agent 列表
 * GET  /api/v1/agents/:name        - 获取单个 Agent 详情
 * PUT  /api/v1/agents/:name/config - 更新 Agent 配置
 * GET  /api/v1/agents/:name/sessions - 获取 Agent 历史会话
 * POST /api/v1/agents/:name/dispatch - 向指定 Agent 分发任务
 * GET  /api/v1/agents/team         - 获取团队编排概览
 *
 * 执行引擎 (新增):
 * POST /api/v1/agents/execute       - 派发执行任务
 * GET  /api/v1/agents/executions    - 获取执行历史
 * GET  /api/v1/agents/executions/:executionId - 获取执行详情
 * POST /api/v1/agents/:name/abort   - 强制终止执行
 *
 * 健康监控 (新增):
 * GET  /api/v1/agents/health        - 获取团队健康报告
 * POST /api/v1/agents/health/check  - 触发健康检查+自动恢复
 * GET  /api/v1/agents/health/heartbeat/:name - 记录心跳
 */
import { Router } from "express";
import { success, error } from "../utils/response.js";
import { getAllAgents, getAgent, updateAgentConfig, getAgentSessions, getTeamOverviewData, } from "../services/agentService.js";
import { dispatchTask, completeTask, getActiveTasks, } from "../services/dispatchService.js";
import { dispatchToAgent, getExecution, getExecutionHistory, abortExecution, getAgentExecutionStats, getAgentExecutionState, } from "../services/agentExecution.js";
import { getTeamHealthReport, runHealthCheck, recordHeartbeat, getHeartbeatHistory, } from "../services/agentHealth.js";
const router = Router();
// GET /api/v1/agents - 获取所有 Agent
router.get("/", (req, res) => {
    const agents = getAllAgents();
    res.json(success({ list: agents, total: agents.length }));
});
// GET /api/v1/agents/team - 获取团队编排概览
router.get("/team", (req, res) => {
    const overview = getTeamOverviewData();
    res.json(success(overview));
});
// GET /api/v1/agents/:name - 获取单个 Agent 详情
router.get("/:name", (req, res) => {
    const { name } = req.params;
    const agent = getAgent(name);
    if (!agent) {
        return res.status(404).json(error(`Agent '${name}' 不存在`));
    }
    res.json(success(agent));
});
// PUT /api/v1/agents/:name/config - 更新 Agent 配置
router.put("/:name/config", (req, res) => {
    const { name } = req.params;
    const { defaultModel, capabilities } = req.body;
    const updated = updateAgentConfig(name, { defaultModel, capabilities });
    if (!updated) {
        return res.status(404).json(error(`Agent '${name}' 不存在`));
    }
    res.json(success(updated));
});
// GET /api/v1/agents/:name/sessions - 获取 Agent 历史会话
router.get("/:name/sessions", (req, res) => {
    const { name } = req.params;
    const sessions = getAgentSessions(name);
    res.json(success({ list: sessions, total: sessions.length }));
});
// POST /api/v1/agents/:name/dispatch - 向指定 Agent 分发任务
router.post("/:name/dispatch", (req, res) => {
    const { name } = req.params;
    const { fromAgent, taskId, taskTitle, priority, deadline, dependencies, description } = req.body;
    if (!fromAgent || !taskId || !taskTitle) {
        return res.status(400).json(error("缺少必填字段：fromAgent, taskId, taskTitle"));
    }
    const dispatchReq = {
        fromAgent,
        toAgent: name,
        taskId,
        taskTitle,
        priority: priority || "normal",
        deadline,
        dependencies,
        description,
    };
    const result = dispatchTask(dispatchReq);
    if (result.rejected) {
        return res.status(403).json(error(result.message));
    }
    res.json(success({ taskId: result.taskId, message: result.message }));
});
// POST /api/v1/agents/:name/complete - 完成任务（辅助端点）
router.post("/:name/complete", (req, res) => {
    const { taskId } = req.body;
    if (!taskId) {
        return res.status(400).json(error("缺少 taskId"));
    }
    const ok = completeTask(taskId);
    res.json(success({ completed: ok }));
});
// GET /api/v1/agents/tasks/active - 获取活跃任务列表（辅助端点）
router.get("/tasks/active", (req, res) => {
    const tasks = getActiveTasks();
    res.json(success({ list: tasks, total: tasks.length }));
});
// ============ 执行引擎路由 ============
// POST /api/v1/agents/execute - 派发执行任务
router.post("/execute", (req, res) => {
    const { dispatcher, targetAgent, taskId, prompt, timeoutMs, model } = req.body;
    if (!dispatcher || !targetAgent || !taskId || !prompt) {
        return res.status(400).json(error("缺少必填字段：dispatcher, targetAgent, taskId, prompt"));
    }
    const result = dispatchToAgent({ dispatcher, targetAgent, taskId, prompt, timeoutMs, model });
    if ("error" in result) {
        return res.status(400).json(error(result.error));
    }
    res.json(success(result));
});
// GET /api/v1/agents/executions - 获取执行历史
router.get("/executions", (req, res) => {
    const { agentName, dispatcher, taskId, status, limit, offset } = req.query;
    const result = getExecutionHistory({
        agentName: agentName,
        dispatcher: dispatcher,
        taskId: taskId,
        status: status,
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0,
    });
    res.json(success(result));
});
// GET /api/v1/agents/executions/:executionId - 获取执行详情
router.get("/executions/:executionId", (req, res) => {
    const { executionId } = req.params;
    const execution = getExecution(executionId);
    if (!execution) {
        return res.status(404).json(error(`执行记录 ${executionId} 不存在`));
    }
    res.json(success(execution));
});
// GET /api/v1/agents/:name/execution-state - 获取 Agent 当前执行状态
router.get("/:name/execution-state", (req, res) => {
    const { name } = req.params;
    const state = getAgentExecutionState(name);
    res.json(success(state || null));
});
// GET /api/v1/agents/:name/stats - 获取 Agent 执行统计
router.get("/:name/stats", (req, res) => {
    const { name } = req.params;
    const allStats = getAgentExecutionStats(name);
    const stats = allStats[name] || { total: 0, completed: 0, failed: 0, timeout: 0, avgDurationMs: 0 };
    res.json(success(stats));
});
// POST /api/v1/agents/:name/abort - 强制终止 Agent 当前执行
router.post("/:name/abort", (req, res) => {
    const { name } = req.params;
    const { reason } = req.body;
    const aborted = abortExecution(name, reason || "手动终止");
    if (!aborted) {
        return res.status(404).json(error(`Agent '${name}' 当前无执行任务可终止`));
    }
    res.json(success({ aborted: true, reason }));
});
// GET /api/v1/agents/executions/stats - 获取所有 Agent 执行统计
router.get("/executions/stats", (req, res) => {
    const stats = getAgentExecutionStats();
    res.json(success(stats));
});
// ============ 健康监控路由 ============
// GET /api/v1/agents/health - 获取团队健康报告
router.get("/health", (req, res) => {
    const report = getTeamHealthReport();
    res.json(success(report));
});
// POST /api/v1/agents/health/check - 触发健康检查+自动恢复
router.post("/health/check", (req, res) => {
    const result = runHealthCheck();
    res.json(success(result));
});
// POST /api/v1/agents/health/heartbeat/:name - 记录 Agent 心跳
router.post("/health/heartbeat/:name", (req, res) => {
    const { name } = req.params;
    recordHeartbeat(name);
    res.json(success({ recorded: true, agent: name, at: new Date().toISOString() }));
});
// GET /api/v1/agents/health/heartbeat/:name - 获取心跳历史
router.get("/health/heartbeat/:name", (req, res) => {
    const { name } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const history = getHeartbeatHistory(name, limit);
    res.json(success({ agent: name, history, total: history.length }));
});
export default router;
