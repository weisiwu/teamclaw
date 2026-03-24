/**
 * Agent 管理路由
 * GET  /api/v1/agents              - 获取所有 Agent 列表
 * GET  /api/v1/agents/:name        - 获取单个 Agent 详情
 * PUT  /api/v1/agents/:name/config - 更新 Agent 配置
 * GET  /api/v1/agents/:name/sessions - 获取 Agent 历史会话
 * POST /api/v1/agents/:name/dispatch - 向指定 Agent 分发任务
 * GET  /api/v1/agents/team         - 获取团队编排概览
 *
 * 执行引擎:
 * POST /api/v1/agents/execute       - 派发执行任务
 * GET  /api/v1/agents/executions    - 获取执行历史
 * GET  /api/v1/agents/executions/:executionId - 获取执行详情
 * POST /api/v1/agents/:name/abort   - 强制终止执行
 *
 * 健康监控:
 * GET  /api/v1/agents/health        - 获取团队健康报告
 * POST /api/v1/agents/health/check  - 触发健康检查+自动恢复
 * GET  /api/v1/agents/health/heartbeat/:name - 记录心跳
 *
 * 协作流水线 (新增):
 * POST /api/v1/agents/pipeline/start - 启动完整协作流水线
 * GET  /api/v1/agents/pipeline/:pipelineId - 查询流水线执行状态
 * POST /api/v1/agents/pipeline/:pipelineId/answer - 提交 PM 澄清问题回答
 * GET  /api/v1/agents/pipeline/:pipelineId/pm-session - 获取 PM 会话状态
 *
 * PM 协议:
 * GET  /api/v1/agents/pm/session/:sessionId - 查询 PM 问答会话状态
 */

import { Router } from 'express';
import { success, error } from '../utils/response.js';
import {
  getAllAgents,
  getAgent,
  updateAgentConfig,
  getAgentSessions,
  getTeamOverviewData,
  createAgent,
  deleteAgent,
  updateAgentStatus,
} from '../services/agentService.js';
import { dispatchTask, completeTask, getActiveTasks } from '../services/dispatchService.js';
import {
  dispatchToAgent,
  getExecution,
  getExecutionHistory,
  abortExecution,
  getAgentExecutionStats,
  getAgentExecutionState,
  ExecutionContext,
} from '../services/agentExecution.js';
import {
  getTeamHealthReport,
  runHealthCheck,
  recordHeartbeat,
  getHeartbeatHistory,
} from '../services/agentHealth.js';
import { DispatchRequest as DispatchReqModel } from '../models/agent.js';

// 协作流水线
import {
  createPipeline,
  executePipeline,
  getPipeline,
  submitPMAnswer,
} from '../services/agentPipeline.js';
import { getClarificationSession } from '../services/pmProtocol.js';
import { AGENT_TEAM } from '../constants/agents.js';

const router = Router();

// GET /api/v1/agents - 获取所有 Agent
router.get('/', async (req, res) => {
  const agents = await getAllAgents();
  res.json(success({ list: agents, total: agents.length }));
});

// GET /api/v1/agents/team - 获取团队编排概览
router.get('/team', async (req, res) => {
  const overview = await getTeamOverviewData();
  res.json(success(overview));
});

// GET /api/v1/agents/:name - 获取单个 Agent 详情
router.get('/:name', async (req, res) => {
  const { name } = req.params;
  const agent = await getAgent(name);
  if (!agent) {
    return res.status(404).json(error(`Agent '${name}' 不存在`));
  }
  res.json(success(agent));
});

// PUT /api/v1/agents/:name/config - 更新 Agent 配置
router.put('/:name/config', async (req, res) => {
  const { name } = req.params;
  const { defaultModel, capabilities } = req.body;

  const updated = await updateAgentConfig(name, { defaultModel, capabilities });
  if (!updated) {
    return res.status(404).json(error(`Agent '${name}' 不存在`));
  }
  res.json(success(updated));
});

// GET /api/v1/agents/:name/sessions - 获取 Agent 历史会话
router.get('/:name/sessions', async (req, res) => {
  const { name } = req.params;
  const sessions = await getAgentSessions(name);
  res.json(success({ list: sessions, total: sessions.length }));
});

// ============ CRUD 路由 ============

// POST /api/v1/agents - 创建新 Agent
router.post('/', async (req, res) => {
  const { name, role, level, description, inGroup, defaultModel, capabilities, workspace } = req.body;

  if (!name || !role || !level) {
    return res.status(400).json(error('缺少必填字段：name, role, level'));
  }

  // Validate level
  if (![1, 2, 3].includes(level)) {
    return res.status(400).json(error('level 必须是 1、2 或 3'));
  }

  // Validate role
  const validRoles = AGENT_TEAM.map(a => a.role);
  if (!validRoles.includes(role)) {
    return res.status(400).json(error(`role 必须是以下之一：${validRoles.join(', ')}`));
  }

  try {
    const agent = await createAgent({
      name,
      role,
      level,
      description: description || '',
      inGroup: inGroup ?? false,
      defaultModel: defaultModel || 'claude-sonnet-3.5',
      capabilities: capabilities || [],
      workspace: workspace || `~/.openclaw/agents/${name}`,
    });
    res.status(201).json(success(agent));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json(error(msg));
  }
});

// PUT /api/v1/agents/:name - 更新 Agent 完整配置
router.put('/:name', async (req, res) => {
  const { name } = req.params;
  const { role, level, description, inGroup, defaultModel, capabilities, workspace } = req.body;

  // Validate level if provided
  if (level !== undefined && ![1, 2, 3].includes(level)) {
    return res.status(400).json(error('level 必须是 1、2 或 3'));
  }

  const existing = await getAgent(name);
  if (!existing) {
    return res.status(404).json(error(`Agent '${name}' 不存在`));
  }

  const updated = await updateAgentConfig(name, {
    defaultModel: defaultModel ?? existing.defaultModel,
    capabilities: capabilities ?? existing.capabilities,
  });

  // Also update non-config fields via direct DB update
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  if (role !== undefined) { sets.push(`role = $${idx++}`); vals.push(role); }
  if (level !== undefined) { sets.push(`level = $${idx++}`); vals.push(level); }
  if (description !== undefined) { sets.push(`description = $${idx++}`); vals.push(description); }
  if (inGroup !== undefined) { sets.push(`in_group = $${idx++}`); vals.push(inGroup); }
  if (workspace !== undefined) { sets.push(`workspace = $${idx++}`); vals.push(workspace); }
  sets.push(`updated_at = NOW()`);
  vals.push(name);

  if (sets.length > 1) {
    const { execute } = await import('../db/pg.js');
    await execute(
      `UPDATE agents SET ${sets.join(', ')} WHERE name = $${idx}`,
      vals
    );
  }

  const result = await getAgent(name);
  res.json(success(result));
});

// DELETE /api/v1/agents/:name - 删除 Agent
router.delete('/:name', async (req, res) => {
  const { name } = req.params;

  const existing = await getAgent(name);
  if (!existing) {
    return res.status(404).json(error(`Agent '${name}' 不存在`));
  }

  // Check if agent has active task
  if (existing.statusRuntime === 'busy' && existing.currentTask) {
    return res.status(409).json(error(`Agent '${name}' 正有进行中任务（${existing.currentTask}），无法删除`));
  }

  const deleted = await deleteAgent(name);
  if (!deleted) {
    return res.status(404).json(error(`Agent '${name}' 不存在`));
  }

  res.json(success({ deleted: true, name }));
});

// PUT /api/v1/agents/:name/status - 启用/禁用 Agent
router.put('/:name/status', async (req, res) => {
  const { name } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'disabled'].includes(status)) {
    return res.status(400).json(error('status 必须是 active 或 disabled'));
  }

  const existing = await getAgent(name);
  if (!existing) {
    return res.status(404).json(error(`Agent '${name}' 不存在`));
  }

  const updated = await updateAgentStatus(name, status);
  res.json(success(updated));
});

// POST /api/v1/agents/:name/dispatch - 向指定 Agent 分发任务
router.post('/:name/dispatch', (req, res) => {
  const { name } = req.params;
  const { fromAgent, taskId, taskTitle, priority, deadline, dependencies, description } = req.body;

  if (!fromAgent || !taskId || !taskTitle) {
    return res.status(400).json(error('缺少必填字段：fromAgent, taskId, taskTitle'));
  }

  const dispatchReq: DispatchReqModel = {
    fromAgent,
    toAgent: name,
    taskId,
    taskTitle,
    priority: priority || 'normal',
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
router.post('/:name/complete', (req, res) => {
  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json(error('缺少 taskId'));
  }
  const ok = completeTask(taskId);
  res.json(success({ completed: ok }));
});

// GET /api/v1/agents/tasks/active - 获取活跃任务列表（辅助端点）
router.get('/tasks/active', (req, res) => {
  const tasks = getActiveTasks();
  res.json(success({ list: tasks, total: tasks.length }));
});

// ============ 执行引擎路由 ============

// POST /api/v1/agents/execute - 派发执行任务
router.post('/execute', (req, res) => {
  const { dispatcher, targetAgent, taskId, prompt, timeoutMs, model } = req.body;

  if (!dispatcher || !targetAgent || !taskId || !prompt) {
    return res.status(400).json(error('缺少必填字段：dispatcher, targetAgent, taskId, prompt'));
  }

  const result = dispatchToAgent({ dispatcher, targetAgent, taskId, prompt, timeoutMs, model });

  if ('error' in result) {
    return res.status(400).json(error(result.error));
  }

  res.json(success(result));
});

// GET /api/v1/agents/executions - 获取执行历史
router.get('/executions', (req, res) => {
  const { agentName, dispatcher, taskId, status, limit, offset } = req.query;

  const result = getExecutionHistory({
    agentName: agentName as string,
    dispatcher: dispatcher as string,
    taskId: taskId as string,
    status: status as ExecutionContext['status'],
    limit: limit ? parseInt(limit as string) : 20,
    offset: offset ? parseInt(offset as string) : 0,
  });

  res.json(success(result));
});

// GET /api/v1/agents/executions/:executionId - 获取执行详情
router.get('/executions/:executionId', (req, res) => {
  const { executionId } = req.params;
  const execution = getExecution(executionId);

  if (!execution) {
    return res.status(404).json(error(`执行记录 ${executionId} 不存在`));
  }

  res.json(success(execution));
});

// GET /api/v1/agents/:name/execution-state - 获取 Agent 当前执行状态
router.get('/:name/execution-state', (req, res) => {
  const { name } = req.params;
  const state = getAgentExecutionState(name);
  res.json(success(state || null));
});

// GET /api/v1/agents/:name/stats - 获取 Agent 执行统计
router.get('/:name/stats', (req, res) => {
  const { name } = req.params;
  const allStats = getAgentExecutionStats(name);
  const stats = allStats[name] || {
    total: 0,
    completed: 0,
    failed: 0,
    timeout: 0,
    avgDurationMs: 0,
  };
  res.json(success(stats));
});

// POST /api/v1/agents/:name/abort - 强制终止 Agent 当前执行
router.post('/:name/abort', (req, res) => {
  const { name } = req.params;
  const { reason } = req.body;

  const aborted = abortExecution(name, reason || '手动终止');
  if (!aborted) {
    return res.status(404).json(error(`Agent '${name}' 当前无执行任务可终止`));
  }

  res.json(success({ aborted: true, reason }));
});

// GET /api/v1/agents/executions/stats - 获取所有 Agent 执行统计
router.get('/executions/stats', (req, res) => {
  const stats = getAgentExecutionStats();
  res.json(success(stats));
});

// ============ 健康监控路由 ============

// GET /api/v1/agents/health - 获取团队健康报告
router.get('/health', (req, res) => {
  const report = getTeamHealthReport();
  res.json(success(report));
});

// POST /api/v1/agents/health/check - 触发健康检查+自动恢复
router.post('/health/check', (req, res) => {
  const result = runHealthCheck();
  res.json(success(result));
});

// POST /api/v1/agents/health/heartbeat/:name - 记录 Agent 心跳
router.post('/health/heartbeat/:name', (req, res) => {
  const { name } = req.params;
  recordHeartbeat(name);
  res.json(success({ recorded: true, agent: name, at: new Date().toISOString() }));
});

// GET /api/v1/agents/health/heartbeat/:name - 获取心跳历史
router.get('/health/heartbeat/:name', (req, res) => {
  const { name } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const history = getHeartbeatHistory(name, limit);
  res.json(success({ agent: name, history, total: history.length }));
});

// ============ 协作流水线路由 ============

// POST /api/v1/agents/pipeline/start - 启动完整协作流水线
router.post('/pipeline/start', async (req, res) => {
  const { taskId, requirement } = req.body;

  if (!taskId || !requirement) {
    return res.status(400).json(error('缺少必填字段：taskId, requirement'));
  }

  try {
    const pipeline = await createPipeline(taskId, requirement);
    // 异步执行流水线（不阻塞 HTTP 响应）
    executePipeline(pipeline.pipelineId).catch(err => {
      console.error('[agent routes] Pipeline execution error:', err);
    });
    res.json(success({ pipelineId: pipeline.pipelineId, status: pipeline.status }));
  } catch (err) {
    res.status(500).json(error(`创建流水线失败: ${err}`));
  }
});

// GET /api/v1/agents/pipeline/:pipelineId - 查询流水线执行状态
router.get('/pipeline/:pipelineId', (req, res) => {
  const { pipelineId } = req.params;
  const pipeline = getPipeline(pipelineId);

  if (!pipeline) {
    return res.status(404).json(error(`流水线 ${pipelineId} 不存在`));
  }

  res.json(success(pipeline));
});

// POST /api/v1/agents/pipeline/:pipelineId/answer - 提交 PM 澄清问题回答
router.post('/pipeline/:pipelineId/answer', async (req, res) => {
  const { pipelineId } = req.params;
  const { questionIndex, answer } = req.body;

  if (questionIndex === undefined || !answer) {
    return res.status(400).json(error('缺少必填字段：questionIndex, answer'));
  }

  try {
    const result = await submitPMAnswer(pipelineId, questionIndex, answer);
    res.json(success(result));
  } catch (err) {
    res.status(400).json(error(`${err}`));
  }
});

// GET /api/v1/agents/pipeline/:pipelineId/pm-session - 获取 PM 会话状态
router.get('/pipeline/:pipelineId/pm-session', (req, res) => {
  const { pipelineId } = req.params;
  const pipeline = getPipeline(pipelineId);

  if (!pipeline) {
    return res.status(404).json(error(`流水线 ${pipelineId} 不存在`));
  }

  if (!pipeline.pmSessionId) {
    return res.json(success(null));
  }

  const session = getClarificationSession(pipeline.pmSessionId);
  res.json(success(session || null));
});

// GET /api/v1/agents/pm/session/:sessionId - 查询 PM 问答会话状态
router.get('/pm/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = getClarificationSession(sessionId);

  if (!session) {
    return res.status(404).json(error(`PM Session ${sessionId} 不存在`));
  }

  res.json(success(session));
});

export default router;
