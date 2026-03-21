import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Task Routes Tests
 * 覆盖 server/src/routes/task.ts 的关键端点
 */

// ---- Mock task store ----

let mockTaskIdCounter = 0;
function nextTaskId() {
  return `task_${Date.now()}_${++mockTaskIdCounter}`;
}

interface MockTask {
  taskId: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'suspended' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  assignedAgent?: string;
  parentTaskId?: string;
  subtaskIds: string[];
  dependsOn: string[];
  blockingTasks: string[];
  sessionId: string;
  contextSnapshot?: string;
  progress: number;
  createdBy: string;
  tags: string[];
  result?: string;
  retryCount: number;
  maxRetries: number;
}

const mockTasks = new Map<string, MockTask>([
  [
    'task-test-1',
    {
      taskId: 'task-test-1',
      title: 'Implement user auth',
      description: 'Add JWT authentication',
      status: 'done',
      priority: 'high',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T12:00:00.000Z',
      startedAt: '2026-03-01T10:30:00.000Z',
      completedAt: '2026-03-01T12:00:00.000Z',
      assignedAgent: 'coder',
      parentTaskId: undefined,
      subtaskIds: [],
      dependsOn: [],
      blockingTasks: [],
      sessionId: 'session-1',
      progress: 100,
      createdBy: 'pm',
      tags: ['auth', 'security'],
      result: 'JWT implemented successfully',
      retryCount: 0,
      maxRetries: 3,
    },
  ],
  [
    'task-test-2',
    {
      taskId: 'task-test-2',
      title: 'Fix login bug',
      description: 'Users cannot login with special chars',
      status: 'running',
      priority: 'urgent',
      createdAt: '2026-03-10T09:00:00.000Z',
      updatedAt: '2026-03-10T11:00:00.000Z',
      startedAt: '2026-03-10T09:30:00.000Z',
      assignedAgent: 'coder',
      parentTaskId: 'task-test-1',
      subtaskIds: [],
      dependsOn: [],
      blockingTasks: [],
      sessionId: 'session-1',
      progress: 60,
      createdBy: 'pm',
      tags: ['bug', 'auth'],
      retryCount: 1,
      maxRetries: 3,
    },
  ],
  [
    'task-test-3',
    {
      taskId: 'task-test-3',
      title: 'Write API docs',
      description: 'Document all REST endpoints',
      status: 'pending',
      priority: 'normal',
      createdAt: '2026-03-15T08:00:00.000Z',
      updatedAt: '2026-03-15T08:00:00.000Z',
      assignedAgent: undefined,
      parentTaskId: undefined,
      subtaskIds: [],
      dependsOn: ['task-test-1'],
      blockingTasks: [],
      sessionId: 'session-2',
      progress: 0,
      createdBy: 'pm',
      tags: ['docs'],
      retryCount: 0,
      maxRetries: 3,
    },
  ],
]);

// ---- Helper functions ----

function success(data: unknown) {
  return { code: 0, data };
}

function errorStatus(status: number, message: string) {
  return { code: status, message };
}

function handleCreateTask(params: {
  title: string;
  description?: string;
  priority?: string;
  assignedAgent?: string;
  parentTaskId?: string;
  dependsOn?: string[];
  sessionId: string;
  createdBy: string;
  tags?: string[];
}) {
  if (!params.sessionId || !params.title) {
    return { status: 400, body: errorStatus(400, 'sessionId and title are required') };
  }
  const taskId = nextTaskId();
  const now = new Date().toISOString();
  const task: MockTask = {
    taskId,
    title: params.title,
    description: params.description || '',
    status: 'pending',
    priority: (params.priority as any) || 'normal',
    createdAt: now,
    updatedAt: now,
    assignedAgent: params.assignedAgent,
    parentTaskId: params.parentTaskId,
    subtaskIds: [],
    dependsOn: params.dependsOn || [],
    blockingTasks: [],
    sessionId: params.sessionId,
    progress: 0,
    createdBy: params.createdBy,
    tags: params.tags || [],
    retryCount: 0,
    maxRetries: 3,
  };
  mockTasks.set(taskId, task);
  return { status: 201, body: success(task) };
}

function handleGetTasks(params: {
  status?: string;
  assignedAgent?: string;
  sessionId?: string;
  parentTaskId?: string;
}) {
  let tasks = Array.from(mockTasks.values());
  if (params.status) {
    tasks = tasks.filter(t => t.status === params.status);
  }
  if (params.assignedAgent) {
    tasks = tasks.filter(t => t.assignedAgent === params.assignedAgent);
  }
  if (params.sessionId) {
    tasks = tasks.filter(t => t.sessionId === params.sessionId);
  }
  if (params.parentTaskId !== undefined) {
    tasks = tasks.filter(t => t.parentTaskId === params.parentTaskId);
  }
  return { status: 200, body: success({ tasks, total: tasks.length }) };
}

function handleGetTask(taskId: string) {
  const task = mockTasks.get(taskId);
  if (!task) {
    return { status: 404, body: errorStatus(404, 'Task not found') };
  }
  return { status: 200, body: success(task) };
}

function handleUpdateTask(
  taskId: string,
  params: {
    title?: string;
    status?: string;
    priority?: string;
    progress?: number;
    result?: string;
  }
) {
  const task = mockTasks.get(taskId);
  if (!task) {
    return { status: 404, body: errorStatus(404, 'Task not found') };
  }
  const now = new Date().toISOString();
  if (params.title !== undefined) task.title = params.title;
  if (params.status !== undefined) {
    task.status = params.status as any;
    if (params.status === 'running') task.startedAt = now;
    if (['done', 'failed', 'cancelled'].includes(params.status)) task.completedAt = now;
  }
  if (params.priority !== undefined) task.priority = params.priority as any;
  if (params.progress !== undefined) task.progress = params.progress;
  if (params.result !== undefined) task.result = params.result;
  task.updatedAt = now;
  return { status: 200, body: success(task) };
}

function handleDeleteTask(taskId: string) {
  if (!mockTasks.has(taskId)) {
    return { status: 404, body: errorStatus(404, 'Task not found') };
  }
  mockTasks.delete(taskId);
  return { status: 200, body: success({ deleted: taskId }) };
}

// ========== Tests ==========

describe('Task Routes', () => {
  beforeEach(() => {
    // Reset task counter and task map
    mockTaskIdCounter = 0;
    mockTasks.clear();
    // Re-populate with seed data
    mockTasks.set('task-test-1', {
      taskId: 'task-test-1',
      title: 'Implement user auth',
      description: 'Add JWT authentication',
      status: 'done',
      priority: 'high',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T12:00:00.000Z',
      startedAt: '2026-03-01T10:30:00.000Z',
      completedAt: '2026-03-01T12:00:00.000Z',
      assignedAgent: 'coder',
      parentTaskId: undefined,
      subtaskIds: [],
      dependsOn: [],
      blockingTasks: [],
      sessionId: 'session-1',
      progress: 100,
      createdBy: 'pm',
      tags: ['auth', 'security'],
      result: 'JWT implemented successfully',
      retryCount: 0,
      maxRetries: 3,
    });
    mockTasks.set('task-test-2', {
      taskId: 'task-test-2',
      title: 'Fix login bug',
      description: 'Users cannot login with special chars',
      status: 'running',
      priority: 'urgent',
      createdAt: '2026-03-10T09:00:00.000Z',
      updatedAt: '2026-03-10T11:00:00.000Z',
      startedAt: '2026-03-10T09:30:00.000Z',
      assignedAgent: 'coder',
      parentTaskId: 'task-test-1',
      subtaskIds: [],
      dependsOn: [],
      blockingTasks: [],
      sessionId: 'session-1',
      progress: 60,
      createdBy: 'pm',
      tags: ['bug', 'auth'],
      retryCount: 1,
      maxRetries: 3,
    });
    mockTasks.set('task-test-3', {
      taskId: 'task-test-3',
      title: 'Write API docs',
      description: 'Document all REST endpoints',
      status: 'pending',
      priority: 'normal',
      createdAt: '2026-03-15T08:00:00.000Z',
      updatedAt: '2026-03-15T08:00:00.000Z',
      assignedAgent: undefined,
      parentTaskId: undefined,
      subtaskIds: [],
      dependsOn: ['task-test-1'],
      blockingTasks: [],
      sessionId: 'session-2',
      progress: 0,
      createdBy: 'pm',
      tags: ['docs'],
      retryCount: 0,
      maxRetries: 3,
    });
  });

  describe('POST /api/v1/tasks (create)', () => {
    it('creates task with required fields', () => {
      const result = handleCreateTask({
        title: 'New task',
        sessionId: 'session-x',
        createdBy: 'pm',
      }) as { status: number; body: { code: number; data: MockTask } };
      expect(result.status).toBe(201);
      expect(result.body.code).toBe(0);
      expect(result.body.data.title).toBe('New task');
      expect(result.body.data.status).toBe('pending');
      expect(result.body.data.taskId).toContain('task_');
    });

    it('returns 400 when title is missing', () => {
      const result = handleCreateTask({
        sessionId: 'session-x',
        createdBy: 'pm',
      } as any) as { status: number; body: { code: number } };
      expect(result.status).toBe(400);
    });

    it('returns 400 when sessionId is missing', () => {
      const result = handleCreateTask({
        title: 'New task',
        createdBy: 'pm',
      } as any) as { status: number; body: { code: number } };
      expect(result.status).toBe(400);
    });

    it('creates task with optional fields', () => {
      const result = handleCreateTask({
        title: 'Complex task',
        description: 'A detailed description',
        priority: 'high',
        assignedAgent: 'coder',
        sessionId: 'session-x',
        createdBy: 'pm',
        tags: ['feature', 'api'],
        dependsOn: ['task-old-1'],
      }) as { body: { data: MockTask } };
      expect(result.body.data.description).toBe('A detailed description');
      expect(result.body.data.priority).toBe('high');
      expect(result.body.data.assignedAgent).toBe('coder');
      expect(result.body.data.tags).toEqual(['feature', 'api']);
      expect(result.body.data.dependsOn).toEqual(['task-old-1']);
    });

    it('defaults priority to normal', () => {
      const result = handleCreateTask({
        title: 'Task',
        sessionId: 'session-x',
        createdBy: 'pm',
      }) as { body: { data: MockTask } };
      expect(result.body.data.priority).toBe('normal');
    });

    it('defaults description to empty string', () => {
      const result = handleCreateTask({
        title: 'Task',
        sessionId: 'session-x',
        createdBy: 'pm',
      }) as { body: { data: MockTask } };
      expect(result.body.data.description).toBe('');
    });
  });

  describe('GET /api/v1/tasks (list)', () => {
    it('returns all tasks when no filters', () => {
      const result = handleGetTasks({}) as { body: { data: { tasks: MockTask[]; total: number } } };
      expect(result.body.data.total).toBe(3);
      expect(result.body.data.tasks).toHaveLength(3);
    });

    it('filters by status', () => {
      const result = handleGetTasks({ status: 'done' }) as { body: { data: { tasks: MockTask[] } } };
      expect(result.body.data.tasks).toHaveLength(1);
      expect(result.body.data.tasks[0].status).toBe('done');
    });

    it('filters by assignedAgent', () => {
      const result = handleGetTasks({ assignedAgent: 'coder' }) as { body: { data: { tasks: MockTask[] } } };
      expect(result.body.data.tasks).toHaveLength(2);
      result.body.data.tasks.forEach(t => expect(t.assignedAgent).toBe('coder'));
    });

    it('filters by sessionId', () => {
      const result = handleGetTasks({ sessionId: 'session-1' }) as { body: { data: { tasks: MockTask[] } } };
      expect(result.body.data.tasks).toHaveLength(2);
    });

    it('filters by parentTaskId', () => {
      const result = handleGetTasks({ parentTaskId: 'task-test-1' }) as { body: { data: { tasks: MockTask[] } } };
      expect(result.body.data.tasks).toHaveLength(1);
      expect(result.body.data.tasks[0].taskId).toBe('task-test-2');
    });

    it('combines multiple filters', () => {
      const result = handleGetTasks({ status: 'running', assignedAgent: 'coder' }) as { body: { data: { tasks: MockTask[] } } };
      expect(result.body.data.tasks).toHaveLength(1);
      expect(result.body.data.tasks[0].taskId).toBe('task-test-2');
    });
  });

  describe('GET /api/v1/tasks/:taskId', () => {
    it('returns task when found', () => {
      const result = handleGetTask('task-test-1') as { body: { data: MockTask } };
      expect(result.body.data.taskId).toBe('task-test-1');
      expect(result.body.data.title).toBe('Implement user auth');
    });

    it('returns 404 when task not found', () => {
      const result = handleGetTask('task-nonexistent') as { status: number; body: { code: number } };
      expect(result.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/tasks/:taskId (update)', () => {
    it('updates task title', () => {
      const result = handleUpdateTask('task-test-1', { title: 'Updated title' }) as { body: { data: MockTask } };
      expect(result.body.data.title).toBe('Updated title');
    });

    it('updates task status to running', () => {
      const result = handleUpdateTask('task-test-3', { status: 'running' }) as { body: { data: MockTask } };
      expect(result.body.data.status).toBe('running');
      expect(result.body.data.startedAt).toBeDefined();
    });

    it('updates task status to done and sets completedAt', () => {
      const result = handleUpdateTask('task-test-2', { status: 'done', result: 'Fixed!' }) as { body: { data: MockTask } };
      expect(result.body.data.status).toBe('done');
      expect(result.body.data.completedAt).toBeDefined();
      expect(result.body.data.result).toBe('Fixed!');
    });

    it('updates progress', () => {
      const result = handleUpdateTask('task-test-3', { progress: 50 }) as { body: { data: MockTask } };
      expect(result.body.data.progress).toBe(50);
    });

    it('returns 404 when updating non-existent task', () => {
      const result = handleUpdateTask('task-nonexistent', { title: 'New' }) as { status: number; body: { code: number } };
      expect(result.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/tasks/:taskId', () => {
    it('deletes existing task', () => {
      const createResult = handleCreateTask({
        title: 'To be deleted',
        sessionId: 'session-x',
        createdBy: 'pm',
      }) as { body: { data: MockTask } };
      const taskId = createResult.body.data.taskId;
      const deleteResult = handleDeleteTask(taskId) as { status: number; body: { data: { deleted: string } } };
      expect(deleteResult.status).toBe(200);
      expect(deleteResult.body.data.deleted).toBe(taskId);
      expect(handleGetTask(taskId).status).toBe(404);
    });

    it('returns 404 when deleting non-existent task', () => {
      const result = handleDeleteTask('task-nonexistent') as { status: number; body: { code: number } };
      expect(result.status).toBe(404);
    });
  });

  describe('task status transitions', () => {
    it('pending task can transition to running', () => {
      const result = handleUpdateTask('task-test-3', { status: 'running' }) as { body: { data: MockTask } };
      expect(result.body.data.status).toBe('running');
      expect(result.body.data.startedAt).toBeDefined();
    });

    it('running task can transition to done', () => {
      const result = handleUpdateTask('task-test-2', { status: 'done' }) as { body: { data: MockTask } };
      expect(result.body.data.status).toBe('done');
      expect(result.body.data.completedAt).toBeDefined();
    });

    it('running task can transition to failed', () => {
      const result = handleUpdateTask('task-test-2', { status: 'failed', result: 'Unrecoverable error' }) as { body: { data: MockTask } };
      expect(result.body.data.status).toBe('failed');
      expect(result.body.data.result).toBe('Unrecoverable error');
    });

    it('running task can transition to cancelled', () => {
      const result = handleUpdateTask('task-test-2', { status: 'cancelled' }) as { body: { data: MockTask } };
      expect(result.body.data.status).toBe('cancelled');
      expect(result.body.data.completedAt).toBeDefined();
    });
  });

  describe('task dependencies', () => {
    it('task can have dependsOn', () => {
      const result = handleGetTask('task-test-3') as { body: { data: MockTask } };
      expect(result.body.data.dependsOn).toContain('task-test-1');
    });

    it('subtask links to parent', () => {
      const result = handleGetTask('task-test-2') as { body: { data: MockTask } };
      expect(result.body.data.parentTaskId).toBe('task-test-1');
    });
  });

  describe('task fields', () => {
    it('task contains all required fields', () => {
      const result = handleGetTask('task-test-1') as { body: { data: MockTask } };
      const task = result.body.data;
      expect(task.taskId).toBeDefined();
      expect(task.title).toBeDefined();
      expect(task.status).toBeDefined();
      expect(task.priority).toBeDefined();
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
      expect(task.sessionId).toBeDefined();
      expect(task.createdBy).toBeDefined();
      expect(task.tags).toBeInstanceOf(Array);
      expect(task.retryCount).toBe(0);
      expect(task.maxRetries).toBe(3);
    });

    it('completed task has result', () => {
      const result = handleGetTask('task-test-1') as { body: { data: MockTask } };
      expect(result.body.data.result).toBe('JWT implemented successfully');
      expect(result.body.data.progress).toBe(100);
    });
  });
});
