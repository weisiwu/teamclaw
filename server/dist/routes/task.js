/**
 * Task Routes
 * 任务机制模块 - REST API 端点
 */
import { Router } from 'express';
import { taskLifecycle } from '../services/taskLifecycle.js';
import { taskFlow } from '../services/taskFlow.js';
import { taskMemory } from '../services/taskMemory.js';
import { taskScheduler } from '../services/taskScheduler.js';
import { taskTimeout } from '../services/taskTimeout.js';
import { taskStats } from '../services/taskStats.js';
import { taskCancel } from '../services/taskCancel.js';
const router = Router();
// ============ 任务 CRUD ============
// POST /api/v1/tasks - 创建任务
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        if (!body.sessionId || !body.title) {
            res.status(400).json({ success: false, error: 'sessionId and title are required' });
            return;
        }
        const task = taskLifecycle.createTask({
            title: body.title,
            description: body.description || '',
            priority: body.priority || 'normal',
            assignedAgent: body.assignedAgent,
            parentTaskId: body.parentTaskId,
            subtaskIds: [],
            dependsOn: body.dependsOn || [],
            blockingTasks: [],
            sessionId: body.sessionId,
            contextSnapshot: body.contextSnapshot,
            createdBy: body.createdBy,
            tags: body.tags || [],
            maxRetries: 3,
        });
        // 如果有父任务，建立父子关系
        if (body.parentTaskId) {
            taskFlow.addSubtask(body.parentTaskId, task.taskId);
        }
        // 如果有依赖关系
        if (body.dependsOn && body.dependsOn.length > 0) {
            for (const depId of body.dependsOn) {
                taskFlow.addDependency(task.taskId, depId);
            }
        }
        res.status(201).json({ success: true, data: task });
    }
    catch (err) {
        console.error('[TaskRoutes] create error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks - 查询任务列表
router.get('/', (req, res) => {
    try {
        const query = req.query;
        let tasks = taskLifecycle.getAllTasks();
        // 过滤
        if (query.status) {
            tasks = tasks.filter(t => t.status === query.status);
        }
        if (query.assignedAgent) {
            tasks = tasks.filter(t => t.assignedAgent === query.assignedAgent);
        }
        if (query.sessionId) {
            tasks = tasks.filter(t => t.sessionId === query.sessionId);
        }
        if (query.parentTaskId) {
            tasks = tasks.filter(t => t.parentTaskId === query.parentTaskId);
        }
        // 分页
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;
        const total = tasks.length;
        const start = (page - 1) * pageSize;
        const list = tasks.slice(start, start + pageSize);
        res.json({ success: true, data: { list, total, page, pageSize } });
    }
    catch (err) {
        console.error('[TaskRoutes] list error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/overview - 任务概览
router.get('/overview', (_req, res) => {
    try {
        const overview = taskLifecycle.getOverview();
        res.json({ success: true, data: overview });
    }
    catch (err) {
        console.error('[TaskRoutes] overview error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/runnable - 获取可运行的任务
router.get('/runnable', (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        const tasks = taskFlow.getRunnableTasks(sessionId);
        res.json({ success: true, data: tasks });
    }
    catch (err) {
        console.error('[TaskRoutes] runnable error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/:taskId - 获取单个任务
router.get('/:taskId', (req, res) => {
    try {
        const task = taskLifecycle.getTask(req.params.taskId);
        if (!task) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }
        // 附带记忆摘要
        const memorySummary = taskMemory.getTaskMemorySummary(task.taskId);
        res.json({
            success: true,
            data: {
                ...task,
                memory: memorySummary,
            },
        });
    }
    catch (err) {
        console.error('[TaskRoutes] get error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// PATCH /api/v1/tasks/:taskId - 更新任务
router.patch('/:taskId', async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const body = req.body;
        const task = taskLifecycle.getTask(taskId);
        if (!task) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }
        // 处理状态变更
        if (body.status && body.status !== task.status) {
            await taskLifecycle.transition(taskId, body.status);
            // 状态变更后处理副作用
            if (body.status === 'done') {
                await taskFlow.onSubtaskCompleted(taskId);
                // 自动触发版本升级（task_done）
                if (task.versionId) {
                    try {
                        const { executeAutoBump } = await import('../services/autoBump.js');
                        const { getVersionSettings } = await import('../routes/version.js');
                        const { getDb } = await import('../db/sqlite.js');
                        const db = getDb();
                        const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(task.versionId);
                        if (row) {
                            const settings = getVersionSettings();
                            if (settings.autoBump) {
                                await executeAutoBump({
                                    versionId: task.versionId,
                                    currentVersion: row.version,
                                    triggerType: 'task_done',
                                    taskId: task.taskId,
                                    taskTitle: task.title,
                                    taskType: task.tags?.[0] || 'feature',
                                    projectPath: row.projectPath,
                                });
                            }
                        }
                    }
                    catch (err) {
                        console.warn('[TaskRoutes] auto-bump on task done failed:', err);
                    }
                }
            }
            else if (body.status === 'cancelled') {
                await taskFlow.cascadeCancel(taskId);
            }
        }
        // 更新其他字段
        if (body.title !== undefined)
            task.title = body.title;
        if (body.description !== undefined)
            task.description = body.description;
        if (body.priority !== undefined)
            task.priority = body.priority;
        if (body.progress !== undefined) {
            taskLifecycle.updateProgress(taskId, body.progress);
        }
        if (body.result !== undefined)
            task.result = body.result;
        res.json({ success: true, data: task });
    }
    catch (err) {
        console.error('[TaskRoutes] update error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// DELETE /api/v1/tasks/:taskId - 删除任务
router.delete('/:taskId', (req, res) => {
    try {
        const taskId = req.params.taskId;
        if (!taskLifecycle.deleteTask(taskId)) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error('[TaskRoutes] delete error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// ============ 任务操作 ============
// POST /api/v1/tasks/:taskId/start - 启动任务
router.post('/:taskId/start', async (req, res) => {
    try {
        const task = await taskFlow.startTask(req.params.taskId);
        if (!task) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }
        res.json({ success: true, data: task });
    }
    catch (err) {
        console.error('[TaskRoutes] start error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
});
// POST /api/v1/tasks/:taskId/retry - 重试任务
router.post('/:taskId/retry', async (req, res) => {
    try {
        const task = await taskLifecycle.retryTask(req.params.taskId);
        if (!task) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }
        res.json({ success: true, data: task });
    }
    catch (err) {
        console.error('[TaskRoutes] retry error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
});
// POST /api/v1/tasks/:taskId/cancel - 取消任务（级联）
router.post('/:taskId/cancel', async (req, res) => {
    try {
        const taskId = req.params.taskId;
        await taskLifecycle.transition(taskId, 'cancelled');
        const cancelled = await taskFlow.cascadeCancel(taskId);
        res.json({ success: true, data: { taskId, cancelled } });
    }
    catch (err) {
        console.error('[TaskRoutes] cancel error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// POST /api/v1/tasks/:taskId/trigger-bump — 手动触发版本升级
router.post('/:taskId/trigger-bump', async (req, res) => {
    try {
        const { executeAutoBump } = await import('../services/autoBump.js');
        const task = taskLifecycle.getTask(req.params.taskId);
        if (!task) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }
        if (!task.versionId) {
            res.status(400).json({ success: false, error: 'Task has no linked versionId' });
            return;
        }
        const db = await import('../db/sqlite.js');
        const row = db.getDb().prepare('SELECT * FROM versions WHERE id = ?').get(task.versionId);
        if (!row) {
            res.status(404).json({ success: false, error: 'Linked version not found' });
            return;
        }
        const result = await executeAutoBump({
            versionId: task.versionId,
            currentVersion: row.version,
            triggerType: 'manual',
            taskId: task.taskId,
            taskTitle: task.title,
            taskType: task.tags?.[0] || 'feature',
            projectPath: row.projectPath,
        });
        res.json({ success: true, data: result });
    }
    catch (err) {
        console.error('[TaskRoutes] trigger-bump error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/:taskId/chain - 获取任务链
router.get('/:taskId/chain', (req, res) => {
    try {
        const chain = taskFlow.getTaskChain(req.params.taskId);
        res.json({ success: true, data: chain });
    }
    catch (err) {
        console.error('[TaskRoutes] chain error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// ============ 记忆化 ============
// POST /api/v1/tasks/:taskId/context - 添加上下文消息
router.post('/:taskId/context', (req, res) => {
    try {
        const { sessionId, role, content } = req.body;
        if (!sessionId || !role || !content) {
            res.status(400).json({ success: false, error: 'sessionId, role, content required' });
            return;
        }
        taskMemory.addMessage(req.params.taskId, sessionId, role, content);
        res.json({ success: true });
    }
    catch (err) {
        console.error('[TaskRoutes] context error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/:taskId/prompt - 获取注入 prompt
router.get('/:taskId/prompt', (req, res) => {
    try {
        const { sessionId } = req.query;
        if (!sessionId) {
            res.status(400).json({ success: false, error: 'sessionId required' });
            return;
        }
        const prompt = taskMemory.buildContextPrompt(req.params.taskId, sessionId);
        res.json({ success: true, data: { prompt } });
    }
    catch (err) {
        console.error('[TaskRoutes] prompt error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// POST /api/v1/tasks/:taskId/checkpoint - 创建检查点
router.post('/:taskId/checkpoint', (req, res) => {
    try {
        const { sessionId, progress, summary } = req.body;
        if (!sessionId || progress === undefined || !summary) {
            res.status(400).json({ success: false, error: 'sessionId, progress, summary required' });
            return;
        }
        const checkpoint = taskMemory.createCheckpoint(req.params.taskId, sessionId, progress, summary);
        res.json({ success: true, data: checkpoint });
    }
    catch (err) {
        console.error('[TaskRoutes] checkpoint error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// ============ 任务调度 ============
// POST /api/v1/tasks/:taskId/schedule - 创建调度
router.post('/:taskId/schedule', (req, res) => {
    try {
        const { type, delayMs, intervalMs, cronExpr, maxRuns, description } = req.body;
        if (!type) {
            res.status(400).json({ success: false, error: 'type required (delay|interval|cron)' });
            return;
        }
        let schedule;
        if (type === 'delay') {
            schedule = taskScheduler.scheduleDelay(req.params.taskId, delayMs ?? 60000, { maxRuns, description });
        }
        else if (type === 'interval') {
            schedule = taskScheduler.scheduleInterval(req.params.taskId, intervalMs ?? 60000, { maxRuns, description });
        }
        else if (type === 'cron') {
            schedule = taskScheduler.scheduleCron(req.params.taskId, cronExpr ?? '* * * * *', { maxRuns, description });
        }
        else {
            res.status(400).json({ success: false, error: 'Invalid type' });
            return;
        }
        res.status(201).json({ success: true, data: schedule });
    }
    catch (err) {
        console.error('[TaskRoutes] schedule error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/:taskId/schedules - 获取任务的所有调度
router.get('/:taskId/schedules', (_req, res) => {
    try {
        const schedules = taskScheduler.getSchedulesByTask(_req.params.taskId);
        res.json({ success: true, data: schedules });
    }
    catch (err) {
        console.error('[TaskRoutes] get schedules error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// DELETE /api/v1/tasks/:taskId/schedule/:scheduleId - 取消调度
router.delete('/:taskId/schedule/:scheduleId', (req, res) => {
    try {
        const ok = taskScheduler.cancelSchedule(req.params.scheduleId);
        res.json({ success: ok });
    }
    catch (err) {
        console.error('[TaskRoutes] cancel schedule error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// PATCH /api/v1/tasks/:taskId/schedule/:scheduleId - 暂停/恢复调度
router.patch('/:taskId/schedule/:scheduleId', (req, res) => {
    try {
        const { action } = req.body; // 'pause' | 'resume'
        let ok = false;
        if (action === 'pause')
            ok = taskScheduler.pauseSchedule(req.params.scheduleId);
        else if (action === 'resume')
            ok = taskScheduler.resumeSchedule(req.params.scheduleId);
        res.json({ success: ok });
    }
    catch (err) {
        console.error('[TaskRoutes] update schedule error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/schedules - 获取所有调度
router.get('/schedules/all', (_req, res) => {
    try {
        const schedules = taskScheduler.getAllSchedules();
        res.json({ success: true, data: schedules });
    }
    catch (err) {
        console.error('[TaskRoutes] get all schedules error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// ============ 任务超时 ============
// POST /api/v1/tasks/:taskId/timeout/set - 设置超时
router.post('/:taskId/timeout/set', (req, res) => {
    try {
        const { timeoutMs, priority } = req.body;
        const record = taskTimeout.setTimeout(req.params.taskId, timeoutMs, priority);
        res.json({ success: true, data: record });
    }
    catch (err) {
        console.error('[TaskRoutes] set timeout error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// POST /api/v1/tasks/:taskId/timeout/heartbeat - 心跳
router.post('/:taskId/timeout/heartbeat', (req, res) => {
    try {
        taskTimeout.heartbeat(req.params.taskId);
        res.json({ success: true });
    }
    catch (err) {
        console.error('[TaskRoutes] heartbeat error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// DELETE /api/v1/tasks/:taskId/timeout - 清除超时
router.delete('/:taskId/timeout', (req, res) => {
    try {
        const ok = taskTimeout.clearTimeout(req.params.taskId);
        res.json({ success: ok });
    }
    catch (err) {
        console.error('[TaskRoutes] clear timeout error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/:taskId/timeout - 获取超时记录
router.get('/:taskId/timeout', (req, res) => {
    try {
        const record = taskTimeout.getTimeoutRecord(req.params.taskId);
        res.json({ success: true, data: record ?? null });
    }
    catch (err) {
        console.error('[TaskRoutes] get timeout error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/timeouts/imminent - 获取即将超时的任务
router.get('/timeouts/imminent', (_req, res) => {
    try {
        const records = taskTimeout.getImminentTimeouts();
        res.json({ success: true, data: records });
    }
    catch (err) {
        console.error('[TaskRoutes] get imminent timeouts error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// ============ 任务统计 ============
// GET /api/v1/tasks/stats - 获取综合统计
router.get('/stats', (req, res) => {
    try {
        const period = req.query.period ?? '24h';
        const stats = taskStats.getStats(period);
        res.json({ success: true, data: stats });
    }
    catch (err) {
        console.error('[TaskRoutes] stats error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/stats/trend - 获取趋势数据
router.get('/stats/trend', (req, res) => {
    try {
        const period = req.query.period ?? '24h';
        const interval = parseInt(req.query.interval) ?? 60;
        const trend = taskStats.getTrend(period, interval);
        res.json({ success: true, data: trend });
    }
    catch (err) {
        console.error('[TaskRoutes] trend error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/stats/agents - 获取各Agent统计
router.get('/stats/agents', (_req, res) => {
    try {
        const agentStats = taskStats.getAgentStats();
        res.json({ success: true, data: agentStats });
    }
    catch (err) {
        console.error('[TaskRoutes] agent stats error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// ============ 任务取消（增强版）============
// POST /api/v1/tasks/:taskId/cancel-with-subtasks - 取消任务及所有子任务
router.post('/:taskId/cancel-with-subtasks', async (req, res) => {
    try {
        const { force, reason, notify, cancelledBy } = req.body;
        const result = await taskCancel.cancelWithSubtasks(req.params.taskId, { force, reason, notify }, cancelledBy ?? 'api');
        res.json({ success: result.success, data: result });
    }
    catch (err) {
        console.error('[TaskRoutes] cancel-with-subtasks error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// POST /api/v1/tasks/:taskId/cancel-blocked - 取消被依赖失败阻塞的任务
router.post('/:taskId/cancel-blocked', async (req, res) => {
    try {
        const { cancelledBy } = req.body;
        const result = await taskCancel.cancelBlockedBy(req.params.taskId, cancelledBy ?? 'api');
        res.json({ success: result.success, data: result });
    }
    catch (err) {
        console.error('[TaskRoutes] cancel-blocked error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/cancel/audit - 获取取消审计日志
router.get('/cancel/audit', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) ?? 50;
        const entries = taskCancel.getAuditLog(limit);
        res.json({ success: true, data: entries });
    }
    catch (err) {
        console.error('[TaskRoutes] audit error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// ============ 任务依赖图（iter-23 新增）============
import { buildDAG, buildSubtaskTree, getRunnableTasks, detectDependencyConflicts } from '../services/taskDependencyGraph.js';
import { emitTaskEvent, getEventHistory, getFailedDeliveries, listWebhookEndpoints, createWebhookEndpoint, deleteWebhookEndpoint, toggleWebhookEndpoint, listNotificationRules, createNotificationRule, deleteNotificationRule, toggleNotificationRule } from '../services/taskNotification.js';
import { getTaskSLA, getAllSLAs, getBreachedSLAs, getAtRiskSLAs, getSLAStats, setTaskDeadline, getSLADefinitions, updateSLADefinitions } from '../services/taskSLA.js';
// GET /api/v1/tasks/graph/:taskId - 获取任务DAG
router.get('/graph/:taskId', (req, res) => {
    try {
        const dag = buildDAG(req.params.taskId);
        res.json({ success: true, data: dag });
    }
    catch (err) {
        console.error('[TaskRoutes] graph error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/tree/:taskId - 获取子任务树
router.get('/tree/:taskId', (req, res) => {
    try {
        const maxDepth = parseInt(req.query.maxDepth) || 5;
        const tree = buildSubtaskTree(req.params.taskId, maxDepth);
        if (!tree)
            return res.status(404).json({ success: false, error: 'Task not found' });
        res.json({ success: true, data: tree });
    }
    catch (err) {
        console.error('[TaskRoutes] tree error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/runnable - 获取可运行任务
router.get('/runnable', (_req, res) => {
    try {
        const runnable = getRunnableTasks();
        res.json({ success: true, data: runnable });
    }
    catch (err) {
        console.error('[TaskRoutes] runnable error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// POST /api/v1/tasks/:taskId/check-dependencies - 检测依赖冲突
router.post('/:taskId/check-dependencies', (req, res) => {
    try {
        const conflicts = detectDependencyConflicts(req.params.taskId);
        res.json({ success: true, data: conflicts });
    }
    catch (err) {
        console.error('[TaskRoutes] check-deps error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/events - 获取事件历史
router.get('/events/all', (req, res) => {
    try {
        const taskId = req.query.taskId;
        const eventType = req.query.eventType;
        const limit = parseInt(req.query.limit) || 50;
        const events = getEventHistory({ taskId, eventType: eventType, limit });
        res.json({ success: true, data: events });
    }
    catch (err) {
        console.error('[TaskRoutes] events error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/events/failed - 获取投递失败事件
router.get('/events/failed', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        res.json({ success: true, data: getFailedDeliveries(limit) });
    }
    catch (err) {
        console.error('[TaskRoutes] failed events error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/webhooks - 列出webhook端点
router.get('/webhooks', (_req, res) => {
    res.json({ success: true, data: listWebhookEndpoints() });
});
// POST /api/v1/tasks/webhooks - 创建webhook端点
router.post('/webhooks', (req, res) => {
    try {
        const { name, url, secret, events } = req.body;
        if (!name || !url || !events)
            return res.status(400).json({ success: false, error: 'name, url, events required' });
        const endpoint = createWebhookEndpoint({ name, url, secret, events });
        res.status(201).json({ success: true, data: endpoint });
    }
    catch (err) {
        console.error('[TaskRoutes] create webhook error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// DELETE /api/v1/tasks/webhooks/:id - 删除webhook
router.delete('/webhooks/:id', (req, res) => {
    const ok = deleteWebhookEndpoint(req.params.id);
    res.json({ success: ok });
});
// PATCH /api/v1/tasks/webhooks/:id - 启用/禁用webhook
router.patch('/webhooks/:id', (req, res) => {
    const { enabled } = req.body;
    const ok = toggleWebhookEndpoint(req.params.id, enabled);
    res.json({ success: ok });
});
// GET /api/v1/tasks/notifications/rules - 列出通知规则
router.get('/notifications/rules', (_req, res) => {
    res.json({ success: true, data: listNotificationRules() });
});
// POST /api/v1/tasks/notifications/rules - 创建通知规则
router.post('/notifications/rules', (req, res) => {
    try {
        const { name, eventType, filter, channels, webhookEndpointId } = req.body;
        const rule = createNotificationRule({ name, eventType, filter, channels, webhookEndpointId });
        res.status(201).json({ success: true, data: rule });
    }
    catch (err) {
        console.error('[TaskRoutes] create rule error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// DELETE /api/v1/tasks/notifications/rules/:id
router.delete('/notifications/rules/:id', (req, res) => {
    res.json({ success: deleteNotificationRule(req.params.id) });
});
// PATCH /api/v1/tasks/notifications/rules/:id
router.patch('/notifications/rules/:id', (req, res) => {
    const { enabled } = req.body;
    res.json({ success: toggleNotificationRule(req.params.id, enabled) });
});
// POST /api/v1/tasks/:taskId/emit - 手动触发任务事件（测试用）
router.post('/:taskId/emit', async (req, res) => {
    try {
        const { eventType, payload } = req.body;
        await emitTaskEvent(eventType, req.params.taskId, payload ?? {});
        res.json({ success: true });
    }
    catch (err) {
        console.error('[TaskRoutes] emit error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/sla/:taskId - 获取任务SLA
router.get('/sla/:taskId', (req, res) => {
    try {
        const sla = getTaskSLA(req.params.taskId);
        if (!sla)
            return res.status(404).json({ success: false, error: 'No SLA found' });
        res.json({ success: true, data: sla });
    }
    catch (err) {
        console.error('[TaskRoutes] sla error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/sla - 获取所有SLA状态
router.get('/sla', (req, res) => {
    try {
        const status = req.query.status;
        res.json({ success: true, data: getAllSLAs(status) });
    }
    catch (err) {
        console.error('[TaskRoutes] all sla error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/sla/breached - 违约SLA列表
router.get('/sla/breached', (_req, res) => {
    res.json({ success: true, data: getBreachedSLAs() });
});
// GET /api/v1/tasks/sla/at-risk - 风险SLA列表
router.get('/sla/at-risk', (_req, res) => {
    res.json({ success: true, data: getAtRiskSLAs() });
});
// GET /api/v1/tasks/sla/stats - SLA统计
router.get('/sla/stats', (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24 * 7;
        res.json({ success: true, data: getSLAStats(hours) });
    }
    catch (err) {
        console.error('[TaskRoutes] sla stats error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// POST /api/v1/tasks/sla/:taskId/deadline - 手动设置截止时间
router.post('/sla/:taskId/deadline', (req, res) => {
    try {
        const { deadline } = req.body;
        if (!deadline)
            return res.status(400).json({ success: false, error: 'deadline required' });
        const ok = setTaskDeadline(req.params.taskId, deadline);
        res.json({ success: ok });
    }
    catch (err) {
        console.error('[TaskRoutes] set deadline error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/v1/tasks/sla/definitions - 获取SLA定义
router.get('/sla/definitions', (_req, res) => {
    res.json({ success: true, data: getSLADefinitions() });
});
// PUT /api/v1/tasks/sla/definitions - 更新SLA定义
router.put('/sla/definitions', (req, res) => {
    try {
        updateSLADefinitions(req.body);
        res.json({ success: true });
    }
    catch (err) {
        console.error('[TaskRoutes] update sla defs error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
export default router;
