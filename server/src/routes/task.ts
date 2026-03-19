/**
 * Task Routes
 * 任务机制模块 - REST API 端点
 */

import { Router } from 'express';
import { taskLifecycle } from '../services/taskLifecycle.js';
import { taskFlow } from '../services/taskFlow.js';
import { taskMemory } from '../services/taskMemory.js';
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskQuery,
} from '../models/task.js';

const router = Router();

// ============ 任务 CRUD ============

// POST /api/v1/tasks - 创建任务
router.post('/', async (req, res) => {
  try {
    const body = req.body as CreateTaskRequest;
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
  } catch (err) {
    console.error('[TaskRoutes] create error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/v1/tasks - 查询任务列表
router.get('/', (req, res) => {
  try {
    const query = req.query as unknown as TaskQuery;
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
  } catch (err) {
    console.error('[TaskRoutes] list error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/v1/tasks/overview - 任务概览
router.get('/overview', (_req, res) => {
  try {
    const overview = taskLifecycle.getOverview();
    res.json({ success: true, data: overview });
  } catch (err) {
    console.error('[TaskRoutes] overview error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/v1/tasks/runnable - 获取可运行的任务
router.get('/runnable', (req, res) => {
  try {
    const sessionId = req.query.sessionId as string | undefined;
    const tasks = taskFlow.getRunnableTasks(sessionId);
    res.json({ success: true, data: tasks });
  } catch (err) {
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
  } catch (err) {
    console.error('[TaskRoutes] get error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// PATCH /api/v1/tasks/:taskId - 更新任务
router.patch('/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const body = req.body as UpdateTaskRequest;
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
      } else if (body.status === 'cancelled') {
        await taskFlow.cascadeCancel(taskId);
      }
    }

    // 更新其他字段
    if (body.title !== undefined) task.title = body.title;
    if (body.description !== undefined) task.description = body.description;
    if (body.priority !== undefined) task.priority = body.priority;
    if (body.progress !== undefined) {
      taskLifecycle.updateProgress(taskId, body.progress);
    }
    if (body.result !== undefined) task.result = body.result;

    res.json({ success: true, data: task });
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
    console.error('[TaskRoutes] cancel error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/v1/tasks/:taskId/chain - 获取任务链
router.get('/:taskId/chain', (req, res) => {
  try {
    const chain = taskFlow.getTaskChain(req.params.taskId);
    res.json({ success: true, data: chain });
  } catch (err) {
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
  } catch (err) {
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
    const prompt = taskMemory.buildContextPrompt(req.params.taskId, sessionId as string);
    res.json({ success: true, data: { prompt } });
  } catch (err) {
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
  } catch (err) {
    console.error('[TaskRoutes] checkpoint error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
