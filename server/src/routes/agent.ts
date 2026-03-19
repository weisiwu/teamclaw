/**
 * Agent 管理路由
 * GET  /api/v1/agents              - 获取所有 Agent 列表
 * GET  /api/v1/agents/:name        - 获取单个 Agent 详情
 * PUT  /api/v1/agents/:name/config - 更新 Agent 配置
 * GET  /api/v1/agents/:name/sessions - 获取 Agent 历史会话
 * POST /api/v1/agents/:name/dispatch - 向指定 Agent 分发任务
 * GET  /api/v1/agents/team         - 获取团队编排概览
 */

import { Router } from "express";
import { success, error } from "../utils/response.js";
import {
  getAllAgents,
  getAgent,
  updateAgentConfig,
  getAgentSessions,
  getTeamOverviewData,
} from "../services/agentService.js";
import {
  dispatchTask,
  completeTask,
  getActiveTasks,
} from "../services/dispatchService.js";
import { DispatchRequest } from "../models/agent.js";

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

  const dispatchReq: DispatchRequest = {
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

export default router;
