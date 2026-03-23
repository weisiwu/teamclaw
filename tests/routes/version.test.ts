/**
 * Version Routes Tests
 * 覆盖 server/src/routes/version.ts 的核心端点
 * 使用 supertest 测试 HTTP 层（状态码、响应格式、边界条件）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ===== Mock services =====

vi.mock('../../../server/src/db/repositories/versionRepo.js', () => ({
  versionRepo: {
    search: vi.fn(() => []),
    findById: vi.fn(() => null),
    create: vi.fn(() => ({ id: 'v_new' })),
    update: vi.fn(() => true),
    delete: vi.fn(() => true),
  },
}));

vi.mock('../../../server/src/db/sqlite.js', () => {
  const mockRow = {
    id: 'v_1',
    version: '1.0.0',
    branch: 'main',
    summary: 'Initial release',
    created_by: 'system',
    created_at: '2026-03-01T10:00:00.000Z',
    build_status: 'pending',
    tag_created: 0,
    git_tag: null,
    git_tag_created_at: null,
  };
  return {
    getDb: vi.fn(() => ({
      prepare: vi.fn(() => ({
        get: vi.fn(() => mockRow),
        run: vi.fn(),
        all: vi.fn(() => [mockRow]),
      })),
    })),
  };
});

vi.mock('../../../server/src/models/screenshot.js', () => ({
  ScreenshotModel: {
    getAllScreenshots: vi.fn(() => []),
    findByVersionId: vi.fn(() => []),
  },
}));

vi.mock('../../../server/src/models/versionSummary.js', () => ({
  VersionSummaryModel: {
    findAll: vi.fn(() => []),
    findByVersionId: vi.fn(() => null),
    upsert: vi.fn(),
  },
}));

vi.mock('../../../server/src/services/semver.js', () => ({
  isValidSemver: vi.fn((v: string) => /^\d+\.\d+\.\d+$/.test(v)),
}));

vi.mock('../../../server/src/services/gitService.js', () => ({
  createTag: vi.fn(() => false),
}));

vi.mock('../../../server/src/services/tagService.js', () => ({
  createTagRecord: vi.fn(),
  autoCreateTagForVersion: vi.fn(),
}));

vi.mock('../../../server/src/services/changeTracker.js', () => ({
  onVersionCreated: vi.fn(),
}));

vi.mock('../../../server/src/services/auditService.js', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

vi.mock('../../../server/src/middleware/auth.js', () => ({
  requireAuth: (_req: any, _res: any, next: any) => next(),
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../server/src/middleware/projectAccess.js', () => ({
  requireProjectAccess: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../server/src/middleware/validation.js', () => ({
  validateIdParam: () => (_req: any, _res: any, next: any) => next(),
}));

// Sub-routers (versionBuild, versionRollback, etc.)
vi.mock('../../../server/src/routes/versionBuild.js', () => ({
  default: express.Router(),
}));
vi.mock('../../../server/src/routes/versionRollback.js', () => ({
  default: express.Router(),
}));
vi.mock('../../../server/src/routes/versionTag.js', () => ({
  default: express.Router(),
}));
vi.mock('../../../server/src/routes/versionCompare.js', () => ({
  default: express.Router(),
}));
vi.mock('../../../server/src/routes/versionScreenshot.js', () => ({
  default: express.Router(),
}));
vi.mock('../../../server/src/routes/versionSummary.js', () => ({
  default: express.Router(),
}));
vi.mock('../../../server/src/routes/versionBump.js', () => ({
  default: express.Router(),
}));
vi.mock('../../../server/src/routes/versionSettings.js', () => ({
  default: express.Router(),
}));
vi.mock('../../../server/src/routes/versionChangeStats.js', () => ({
  default: express.Router(),
}));

// ===== Import after mocks =====
const { default: versionRouter } = await import('../../../server/src/routes/version.js');
const { notFoundHandler, unifiedErrorHandler } = await import('../../../server/src/middleware/errorHandler.js');
const { authHeaders } = await import('../helpers/auth.js');

function createVersionApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/versions', versionRouter);
  app.use(notFoundHandler);
  app.use(unifiedErrorHandler);
  return app;
}

describe('Version Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createVersionApp();
    vi.clearAllMocks();
  });

  // ============ GET /api/v1/versions - 版本列表 ============

  describe('GET /api/v1/versions', () => {
    it('200 - 获取版本列表', async () => {
      const res = await request(app).get('/api/v1/versions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.data).toBeDefined(); // paginated data
    });

    it('200 - 分页参数', async () => {
      const res = await request(app)
        .get('/api/v1/versions?page=1&pageSize=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.page).toBe(1);
    });

    it('200 - 按状态过滤', async () => {
      const res = await request(app)
        .get('/api/v1/versions?status=published');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============ POST /api/v1/versions - 创建版本 ============

  describe('POST /api/v1/versions', () => {
    it('201 - 创建版本成功', async () => {
      const res = await request(app)
        .post('/api/v1/versions')
        .send({
          version: '1.0.0',
          title: 'Release 1.0',
          description: 'Initial release',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.version).toBe('1.0.0');
    });

    it('400 - 缺少 version 字段', async () => {
      const res = await request(app)
        .post('/api/v1/versions')
        .send({ title: 'Release 1.0' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('400 - 缺少 title 字段', async () => {
      const res = await request(app)
        .post('/api/v1/versions')
        .send({ version: '1.0.0' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('400 - 无效的 semver 格式', async () => {
      const res = await request(app)
        .post('/api/v1/versions')
        .send({ version: 'invalid', title: 'Bad Version' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ============ GET /api/v1/versions/:id - 版本详情 ============

  describe('GET /api/v1/versions/:id', () => {
    it('200 - 获取存在的版本', async () => {
      const res = await request(app).get('/api/v1/versions/v_1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('v_1');
    });

    it('404 - 获取不存在的版本', async () => {
      const res = await request(app).get('/api/v1/versions/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ============ PUT /api/v1/versions/:id - 更新版本 ============

  describe('PUT /api/v1/versions/:id', () => {
    it('200 - 更新版本', async () => {
      const res = await request(app)
        .put('/api/v1/versions/v_1')
        .set('X-User-Id', 'test_admin')
        .set('X-User-Role', 'admin')
        .send({ description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('404 - 更新不存在的版本', async () => {
      const res = await request(app)
        .put('/api/v1/versions/nonexistent')
        .set('X-User-Id', 'test_admin')
        .set('X-User-Role', 'admin')
        .send({ description: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  // ============ DELETE /api/v1/versions/:id - 删除版本 ============

  describe('DELETE /api/v1/versions/:id', () => {
    it('200 - 删除版本', async () => {
      const res = await request(app)
        .delete('/api/v1/versions/v_1')
        .set('X-User-Id', 'test_admin')
        .set('X-User-Role', 'admin');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('404 - 删除不存在的版本', async () => {
      const res = await request(app)
        .delete('/api/v1/versions/nonexistent')
        .set('X-User-Id', 'test_admin')
        .set('X-User-Role', 'admin');

      expect(res.status).toBe(404);
    });
  });

  // ============ 404 for unknown routes ============

  describe('404 handling', () => {
    it('404 - 不存在的路由', async () => {
      const res = await request(app).get('/api/v1/versions/unknown/route');

      expect(res.status).toBe(404);
    });
  });
});
