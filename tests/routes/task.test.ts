/**
 * Task Routes Tests
 * 覆盖 server/src/routes/task.ts 的核心端点
 * 使用 supertest 测试 HTTP 层（状态码、响应格式、边界条件）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Router } from 'express';

// ===== Mock route dependencies =====

vi.mock('../../../server/src/services/taskLifecycle.js', () => {
  const mockTask = {
    taskId: 'task_test_1',
    title: 'Test Task',
    description: 'A test task',
    status: 'pending' as const,
    priority: 'normal' as const,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    startedAt: undefined,
    completedAt: undefined,
    assignedAgent: undefined,
    parentTaskId: undefined,
    subtaskIds: [],
    dependsOn: [],
    blockingTasks: [],
    sessionId: 'session_1',
    progress: 0,
    createdBy: 'test_user',
    tags: [],
    result: undefined,
    retryCount: 0,
    maxRetries: 3,
  };

  return {
    taskLifecycle: {
      createTask: vi.fn(() => ({ ...mockTask, taskId: `task_${Date.now()}`, title: 'New Task' })),
      getTask: vi.fn((id: string) => {
        if (id === 'nonexistent') return undefined;
        return { ...mockTask, taskId: id };
      }),
      getAllTasks: vi.fn(() => [
        { ...mockTask, taskId: 'task_1', status: 'pending', title: 'Task 1' },
        { ...mockTask, taskId: 'task_2', status: 'running', title: 'Task 2' },
        { ...mockTask, taskId: 'task_3', status: 'done', title: 'Task 3' },
      ]),
      getOverview: vi.fn(() => ({ total: 3, pending: 1, running: 1, done: 1 })),
      transition: vi.fn(),
      updateProgress: vi.fn(),
      deleteTask: vi.fn((id: string) => id !== 'nonexistent'),
      retryTask: vi.fn(),
    },
  };
});

vi.mock('../../../server/src/services/taskFlow.js', () => ({
  taskFlow: {
    addSubtask: vi.fn(),
    addDependency: vi.fn(),
    getRunnableTasks: vi.fn(() => []),
    startTask: vi.fn(),
    onSubtaskCompleted: vi.fn(),
    cascadeCancel: vi.fn(() => []),
    getTaskChain: vi.fn(() => ({ upstream: [], downstream: [] })),
  },
}));

vi.mock('../../../server/src/services/taskMemory.js', () => ({
  taskMemory: {
    getTaskMemorySummary: vi.fn(() => ({})),
    addMessage: vi.fn(),
    buildContextPrompt: vi.fn(() => 'mock prompt'),
    createCheckpoint: vi.fn(() => ({ id: 'cp_1' })),
  },
}));

vi.mock('../../../server/src/services/taskScheduler.js', () => ({
  taskScheduler: {
    scheduleDelay: vi.fn(() => ({ scheduleId: 'sch_1' })),
    scheduleInterval: vi.fn(() => ({ scheduleId: 'sch_2' })),
    scheduleCron: vi.fn(() => ({ scheduleId: 'sch_3' })),
    getSchedulesByTask: vi.fn(() => []),
    getAllSchedules: vi.fn(() => []),
    cancelSchedule: vi.fn(() => true),
    pauseSchedule: vi.fn(() => true),
    resumeSchedule: vi.fn(() => true),
  },
}));

vi.mock('../../../server/src/services/taskTimeout.js', () => ({
  taskTimeout: {
    setTimeout: vi.fn(() => ({ taskId: 'task_test_1', expiresAt: '2026-03-01T12:00:00Z' })),
    heartbeat: vi.fn(),
    clearTimeout: vi.fn(() => true),
    getTimeoutRecord: vi.fn(() => null),
    getImminentTimeouts: vi.fn(() => []),
  },
}));

vi.mock('../../../server/src/services/taskStats.js', () => ({
  taskStats: {
    getStats: vi.fn(() => ({ total: 3, pending: 1, running: 1, done: 1, failed: 0 })),
    getTrend: vi.fn(() => []),
    getAgentStats: vi.fn(() => []),
  },
}));

vi.mock('../../../server/src/services/taskCancel.js', () => ({
  taskCancel: {
    cancelWithSubtasks: vi.fn(() => ({ cancelled: ['task_test_1'] })),
    cancelBlockedBy: vi.fn(() => ({ cancelled: [] })),
    getAuditLog: vi.fn(() => []),
  },
}));

vi.mock('../../../server/src/services/taskDependencyGraph.js', () => ({
  buildDAG: vi.fn(() => ({ nodes: [], edges: [] })),
  buildSubtaskTree: vi.fn(() => ({ taskId: 'task_test_1', children: [] })),
  detectDependencyConflicts: vi.fn(() => []),
}));

vi.mock('../../../server/src/services/taskNotification.js', () => ({
  emitTaskEvent: vi.fn(),
  getEventHistory: vi.fn(() => []),
  getFailedDeliveries: vi.fn(() => []),
  listWebhookEndpoints: vi.fn(() => []),
  createWebhookEndpoint: vi.fn(() => ({ id: 'wh_1' })),
  deleteWebhookEndpoint: vi.fn(() => true),
  toggleWebhookEndpoint: vi.fn(() => true),
  listNotificationRules: vi.fn(() => []),
  createNotificationRule: vi.fn(() => ({ id: 'rule_1' })),
  deleteNotificationRule: vi.fn(() => true),
  toggleNotificationRule: vi.fn(() => true),
}));

vi.mock('../../../server/src/services/taskSLA.js', () => ({
  getTaskSLA: vi.fn(() => null),
  getAllSLAs: vi.fn(() => []),
  getBreachedSLAs: vi.fn(() => []),
  getAtRiskSLAs: vi.fn(() => []),
  getSLAStats: vi.fn(() => ({})),
  setTaskDeadline: vi.fn(() => true),
  getSLADefinitions: vi.fn(() => []),
  updateSLADefinitions: vi.fn(),
}));

vi.mock('../../../server/src/services/autoBump.js', () => ({
  executeAutoBump: vi.fn(() => ({ bumped: true })),
}));

vi.mock('../../../server/src/routes/version.js', () => ({
  getVersionSettings: vi.fn(() => ({ autoBump: false })),
}));

vi.mock('../../../server/src/db/sqlite.js', () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({
      get: vi.fn(() => ({ id: 'v_1', version: '1.0.0', projectPath: '/tmp' })),
    })),
  })),
}));

// ===== Import after mocks are set up =====
const { default: taskRouter } = await import('../../../server/src/routes/task.js');
const { notFoundHandler, unifiedErrorHandler } = await import('../../../server/src/middleware/errorHandler.js');
const { authHeaders } = await import('../helpers/auth.js');

function createTaskApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/tasks', taskRouter);
  app.use(notFoundHandler);
  app.use(unifiedErrorHandler);
  return app;
}

describe('Task Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTaskApp();
    vi.clearAllMocks();
  });

  // ============ POST /api/v1/tasks - 创建任务 ============

  describe('POST /api/v1/tasks', () => {
    it('201 - 创建任务成功', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('X-User-Id', 'test_user')
        .set('X-User-Role', 'admin')
        .send({ title: 'New Task', sessionId: 'session_1' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.title).toBe('New Task');
    });

    it('400 - 缺少 sessionId', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('X-User-Id', 'test_user')
        .set('X-User-Role', 'admin')
        .send({ title: 'New Task' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('400 - 缺少 title', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('X-User-Id', 'test_user')
        .set('X-User-Role', 'admin')
        .send({ sessionId: 'session_1' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('401 - 未认证', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'New Task', sessionId: 'session_1' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ============ GET /api/v1/tasks - 获取任务列表 ============

  describe('GET /api/v1/tasks', () => {
    it('200 - 获取任务列表', async () => {
      const res = await request(app).get('/api/v1/tasks');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.list)).toBe(true);
      expect(res.body.data.total).toBe(3);
    });

    it('200 - 按状态过滤', async () => {
      const res = await request(app).get('/api/v1/tasks?status=pending');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============ GET /api/v1/tasks/:taskId - 获取单个任务 ============

  describe('GET /api/v1/tasks/:taskId', () => {
    it('200 - 获取存在的任务', async () => {
      const res = await request(app).get('/api/v1/tasks/task_test_1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.taskId).toBe('task_test_1');
    });

    it('404 - 获取不存在的任务', async () => {
      const res = await request(app).get('/api/v1/tasks/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ============ PATCH /api/v1/tasks/:taskId - 更新任务 ============

  describe('PATCH /api/v1/tasks/:taskId', () => {
    it('200 - 更新任务状态', async () => {
      const res = await request(app)
        .patch('/api/v1/tasks/task_test_1')
        .set('X-User-Id', 'test_user')
        .set('X-User-Role', 'admin')
        .send({ status: 'running' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('401 - 未认证更新任务', async () => {
      const res = await request(app)
        .patch('/api/v1/tasks/task_test_1')
        .send({ status: 'running' });

      expect(res.status).toBe(401);
    });

    it('404 - 更新不存在的任务', async () => {
      const res = await request(app)
        .patch('/api/v1/tasks/nonexistent')
        .set('X-User-Id', 'test_user')
        .set('X-User-Role', 'admin')
        .send({ status: 'running' });

      expect(res.status).toBe(404);
    });
  });

  // ============ DELETE /api/v1/tasks/:taskId - 删除任务 ============

  describe('DELETE /api/v1/tasks/:taskId', () => {
    it('200 - 删除任务', async () => {
      const res = await request(app)
        .delete('/api/v1/tasks/task_test_1')
        .set('X-User-Id', 'test_user')
        .set('X-User-Role', 'admin');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('404 - 删除不存在的任务', async () => {
      const res = await request(app)
        .delete('/api/v1/tasks/nonexistent')
        .set('X-User-Id', 'test_user')
        .set('X-User-Role', 'admin');

      expect(res.status).toBe(404);
    });

    it('401 - 未认证删除任务', async () => {
      const res = await request(app).delete('/api/v1/tasks/task_test_1');

      expect(res.status).toBe(401);
    });
  });

  // ============ POST /api/v1/tasks/:taskId/cancel ============

  describe('POST /api/v1/tasks/:taskId/cancel', () => {
    it('200 - 取消任务', async () => {
      const res = await request(app)
        .post('/api/v1/tasks/task_test_1/cancel');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.taskId).toBe('task_test_1');
    });
  });

  // ============ GET /api/v1/tasks/stats ============

  describe('GET /api/v1/tasks/stats', () => {
    it('200 - 获取任务统计', async () => {
      const res = await request(app).get('/api/v1/tasks/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  // ============ POST /api/v1/tasks/:taskId/start ============

  describe('POST /api/v1/tasks/:taskId/start', () => {
    it('200 - 启动任务', async () => {
      const res = await request(app)
        .post('/api/v1/tasks/task_test_1/start');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('404 - 启动不存在的任务', async () => {
      const res = await request(app)
        .post('/api/v1/tasks/nonexistent/start');

      expect(res.status).toBe(404);
    });
  });

  // ============ GET /api/v1/tasks/overview ============

  describe('GET /api/v1/tasks/overview', () => {
    it('200 - 获取任务概览', async () => {
      const res = await request(app).get('/api/v1/tasks/overview');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
