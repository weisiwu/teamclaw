/**
 * Task Route 集成测试
 * 覆盖: POST /api/v1/tasks, GET /api/v1/tasks, SLA 端点
 */

// Mock auth middleware to bypass authentication in tests
jest.mock('../../src/middleware/auth.js', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => { next(); },
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => { next(); },
}));

// In-memory task store for tests
const mockTasks = new Map();

// Mock task lifecycle service
jest.mock('../../src/services/taskLifecycle.js', () => {
  return {
    taskLifecycle: {
      createTask: (data: Record<string, unknown>) => {
        const task = {
          taskId: `task_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          title: data.title,
          description: data.description || '',
          status: 'pending',
          priority: data.priority || 'normal',
          assignedAgent: data.assignedAgent || null,
          parentTaskId: data.parentTaskId || null,
          subtaskIds: [],
          dependsOn: data.dependsOn || [],
          blockingTasks: [],
          sessionId: data.sessionId,
          contextSnapshot: data.contextSnapshot || null,
          createdBy: data.createdBy || null,
          tags: data.tags || [],
          maxRetries: data.maxRetries ?? 3,
          progress: 0,
          retryCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockTasks.set(task.taskId, task);
        return task;
      },
      getTask: (taskId: string) => mockTasks.get(taskId),
      getAllTasks: () => Array.from(mockTasks.values()),
      updateTaskStatus: (taskId: string, status: string) => {
        const task = mockTasks.get(taskId);
        if (task) {
          task.status = status;
          task.updatedAt = new Date().toISOString();
        }
        return task || null;
      },
    },
  };
});

// Mock task flow service
jest.mock('../../src/services/taskFlow.js', () => ({
  taskFlow: {
    addSubtask: () => true,
    addDependency: () => true,
  },
}));

// Mock task memory service
jest.mock('../../src/services/taskMemory.js', () => ({
  taskMemory: {
    getTaskSummary: async () => 'Task summary placeholder',
    getSimilarTasks: async () => [],
  },
}));

// Mock task notification service
jest.mock('../../src/services/taskNotification.js', () => ({
  emitTaskEvent: () => {},
  getEventHistory: () => [],
  getFailedDeliveries: () => [],
  listWebhookEndpoints: () => [],
  createWebhookEndpoint: () => ({}),
  deleteWebhookEndpoint: () => {},
  toggleWebhookEndpoint: () => ({}),
  listNotificationRules: () => [],
  createNotificationRule: () => ({}),
  deleteNotificationRule: () => {},
  toggleNotificationRule: () => ({}),
  TaskEventType: { TASK_CREATED: 'task:created', TASK_UPDATED: 'task:updated' },
}));

// Mock task SLA service
jest.mock('../../src/services/taskSLA.js', () => ({
  getTaskSLA: () => null,
  getAllSLAs: () => [],
  getBreachedSLAs: () => [],
  getAtRiskSLAs: () => [],
  getSLAStats: () => ({
    totalTasks: 0,
    breachedCount: 0,
    atRiskCount: 0,
    averageBreachRate: 0,
  }),
  getSLADefinitions: () => [
    { priority: 'critical', slaHours: 1, description: 'Critical tasks' },
    { priority: 'high', slaHours: 4, description: 'High priority tasks' },
  ],
  updateSLADefinitions: () => {},
  setTaskDeadline: () => {},
  SLAStatus: { BREACHED: 'breached', AT_RISK: 'at_risk', OK: 'ok' },
}));

// Mock remaining task services (no-ops)
jest.mock('../../src/services/taskScheduler.js', () => ({
  taskScheduler: { enqueue: () => {}, cancel: () => {}, getPending: () => [] },
}));
jest.mock('../../src/services/taskTimeout.js', () => ({
  taskTimeout: { startTimer: () => {}, cancelTimer: () => {}, getActiveTimers: () => new Map() },
}));
jest.mock('../../src/services/taskStats.ts', () => ({
  taskStats: { getStats: () => ({}), recordMetric: () => {} },
}));
jest.mock('../../src/services/taskCancel.js', () => ({
  taskCancel: { cancelTask: () => true, forceCancel: () => true },
}));

// Mock autoBump service (used in task creation flow)
jest.mock('../../src/services/autoBump.js', () => ({
  executeAutoBump: async () => null,
}));

import express, { Express } from 'express';
import request from 'supertest';
import taskRouter from '../../src/routes/task.js';

describe('Task Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/tasks', taskRouter);
  });

  beforeEach(() => {
    mockTasks.clear();
  });

  describe('POST /api/v1/tasks', () => {
    it('should return 400 when sessionId is missing', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Test Task' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .send({ sessionId: 'session_001' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create task with valid input and return 201', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .send({
          sessionId: 'session_001',
          title: 'Implement login feature',
          description: 'Add OAuth2 login',
          priority: 'high',
          assignedAgent: 'coder',
          tags: ['auth', 'security'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('taskId');
      expect(res.body.data.title).toBe('Implement login feature');
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.priority).toBe('high');
      expect(res.body.data.assignedAgent).toBe('coder');
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should return empty list when no tasks exist', async () => {
      const res = await request(app).get('/api/v1/tasks');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.list)).toBe(true);
    });

    it('should return task list with seeded tasks', async () => {
      mockTasks.set('task_001', {
        taskId: 'task_001',
        title: 'Seed Task',
        status: 'pending',
        priority: 'normal',
        sessionId: 'session_001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app).get('/api/v1/tasks');

      expect(res.status).toBe(200);
      expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter tasks by status', async () => {
      mockTasks.set('task_running', {
        taskId: 'task_running',
        title: 'Running Task',
        status: 'running',
        priority: 'normal',
        sessionId: 'session_001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app).get('/api/v1/tasks?status=running');

      expect(res.status).toBe(200);
      expect(
        res.body.data.list.every((t: { status: string }) => t.status === 'running')
      ).toBe(true);
    });
  });

  describe('GET /api/v1/tasks/sla', () => {
    it('should return all SLAs list', async () => {
      const res = await request(app).get('/api/v1/tasks/sla');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/tasks/sla/definitions', () => {
    it('should return SLA definitions', async () => {
      const res = await request(app).get('/api/v1/tasks/sla/definitions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/tasks/sla/stats', () => {
    it('should return SLA stats', async () => {
      const res = await request(app).get('/api/v1/tasks/sla/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalTasks');
      expect(res.body.data).toHaveProperty('breachedCount');
    });
  });

  describe('GET /api/v1/tasks/sla/breached', () => {
    it('should return breached SLA list', async () => {
      const res = await request(app).get('/api/v1/tasks/sla/breached');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/tasks/sla/at-risk', () => {
    it('should return at-risk SLA list', async () => {
      const res = await request(app).get('/api/v1/tasks/sla/at-risk');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
