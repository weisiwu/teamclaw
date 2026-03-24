/**
 * Project Route 集成测试
 * 覆盖: GET /api/v1/projects, GET /api/v1/projects/:id,
 *       DELETE /api/v1/projects/:id, GET /api/v1/projects/import/:taskId,
 *       GET /api/v1/projects/:id/git-history
 */

// Mock all external service dependencies
jest.mock('../../src/services/importOrchestrator.js', () => {
  const mockProjects = new Map();
  return {
    projects: mockProjects,
    createImportTask: () => ({
      taskId: 'task_test_001',
      projectId: 'proj_test_001',
      status: 'pending',
      steps: [],
      createdAt: new Date().toISOString(),
    }),
    runAllSteps: async () => {},
    getTaskStatus: (taskId: string) => ({
      taskId,
      projectId: 'proj_test_001',
      status: 'done',
      steps: [
        { name: 'clone', status: 'done', completedAt: new Date().toISOString() },
        { name: 'scan', status: 'done', completedAt: new Date().toISOString() },
        { name: 'detectTech', status: 'done', completedAt: new Date().toISOString() },
        { name: 'detectBuild', status: 'done', completedAt: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
    }),
    ImportContext: {},
  };
});

jest.mock('../../src/services/gitClone.js', () => ({
  cloneOrCopyProject: async () => '/tmp/test-project',
}));

jest.mock('../../src/services/fileScanner.js', () => ({
  scanDirectory: async () => ({
    name: 'test-project',
    path: '/tmp/test-project',
    files: ['package.json', 'README.md'],
  }),
}));

jest.mock('../../src/services/techDetector.js', () => ({
  detectTechStack: async () => ({
    language: ['TypeScript'],
    framework: ['Next.js'],
    buildTool: ['npm'],
  }),
}));

jest.mock('../../src/services/vectorStore.js', () => ({
  query: async () => [],
}));

jest.mock('../../src/services/gitHistoryAnalysis.js', () => ({
  analyzeGitHistory: () => ({
    totalCommits: 42,
    contributors: ['dev1', 'dev2'],
    languages: { TypeScript: 80, CSS: 20 },
    firstCommitDate: '2024-01-01',
    lastCommitDate: '2025-03-01',
  }),
  parseGitLog: () => [
    { hash: 'abc123', message: 'Initial commit', date: '2024-01-01', author: 'dev1' },
  ],
}));

// Static imports after mocks
import express, { Express } from 'express';
import request from 'supertest';
import projectRouter from '../../src/routes/project.js';
import { projects } from '../../src/services/importOrchestrator.js';

describe('Project Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/projects', projectRouter);
  });

  beforeEach(() => {
    projects.clear();
  });

  describe('GET /api/v1/projects', () => {
    it('should return empty list when no projects exist', async () => {
      const res = await request(app).get('/api/v1/projects');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('projects');
      expect(Array.isArray(res.body.data.projects)).toBe(true);
    });

    it('should return list with seeded projects', async () => {
      projects.set('proj_001', {
        id: 'proj_001',
        name: 'Test Project',
        source: 'local' as const,
        techStack: ['TypeScript'],
        buildTool: 'npm',
        hasGit: true,
        importedAt: new Date().toISOString(),
        status: 'active' as const,
      });

      const res = await request(app).get('/api/v1/projects');

      expect(res.status).toBe(200);
      expect(res.body.data.projects.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should return 404 for non-existent project', async () => {
      const res = await request(app).get('/api/v1/projects/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return project when it exists', async () => {
      projects.set('proj_002', {
        id: 'proj_002',
        name: 'Existing Project',
        source: 'url' as const,
        url: 'https://github.com/test/repo',
        techStack: ['Python'],
        buildTool: 'pip',
        hasGit: true,
        importedAt: new Date().toISOString(),
        status: 'active' as const,
      });

      const res = await request(app).get('/api/v1/projects/proj_002');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.id).toBe('proj_002');
      expect(res.body.data.project.name).toBe('Existing Project');
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should return 404 when deleting non-existent project', async () => {
      const res = await request(app).delete('/api/v1/projects/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should delete existing project and return success', async () => {
      projects.set('proj_del_001', {
        id: 'proj_del_001',
        name: 'To Delete',
        source: 'local' as const,
        techStack: ['Go'],
        buildTool: 'go mod',
        hasGit: false,
        importedAt: new Date().toISOString(),
        status: 'active' as const,
      });

      const res = await request(app).delete('/api/v1/projects/proj_del_001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe('proj_del_001');
      expect(projects.has('proj_del_001')).toBe(false);
    });
  });

  describe('GET /api/v1/projects/import/:taskId', () => {
    it('should return task status for a valid taskId', async () => {
      const res = await request(app).get('/api/v1/projects/import/task_test_001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('task');
      expect(res.body.data.task).toHaveProperty('taskId');
      expect(res.body.data.task).toHaveProperty('status');
      expect(res.body.data.task).toHaveProperty('steps');
    });
  });

  describe('GET /api/v1/projects/:id/git-history', () => {
    it('should return 404 for non-existent project git history', async () => {
      const res = await request(app).get('/api/v1/projects/nonexistent/git-history');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return git history for project with localPath', async () => {
      projects.set('proj_git_001', {
        id: 'proj_git_001',
        name: 'Git Project',
        source: 'local' as const,
        localPath: '/tmp/test-project',
        techStack: ['TypeScript'],
        buildTool: 'npm',
        hasGit: true,
        importedAt: new Date().toISOString(),
        status: 'active' as const,
      });

      const res = await request(app).get('/api/v1/projects/proj_git_001/git-history');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('analysis');
      expect(res.body.data).toHaveProperty('commits');
      expect(Array.isArray(res.body.data.commits)).toBe(true);
      expect(res.body.data.analysis).toHaveProperty('totalCommits');
    });
  });
});
