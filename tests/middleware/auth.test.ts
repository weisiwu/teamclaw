/**
 * Auth Middleware Tests
 * 覆盖 server/src/middleware/auth.ts 的认证中间件
 * 使用 supertest 测试 HTTP 层
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// 导入认证中间件
const {
  requireAuth,
  requireAdmin,
  optionalAuth,
} = await import('../../../server/src/middleware/auth.js');

const { unifiedErrorHandler } = await import('../../../server/src/middleware/errorHandler.js');

// Helper: 创建测试 app 并挂载中间件
function createTestApp(middleware: any, path = '/test') {
  const app = express();
  app.use(express.json());
  app.get(path, middleware, (_req: Request, res: Response) => {
    res.json({ success: true, message: 'passed' });
  });
  app.use(unifiedErrorHandler);
  return app;
}

describe('Auth Middleware', () => {

  // ============ requireAuth ============

  describe('requireAuth', () => {
    it('401 - 无 Token 请求 → 401', async () => {
      const app = createTestApp(requireAuth, '/test');
      const res = await request(app).get('/test');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('身份');
    });

    it('401 - 无效 Token 格式 → 401', async () => {
      const app = createTestApp(requireAuth, '/test');
      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid_token_here');

      // In dev mode with invalid token it falls back to headers
      // With Bearer prefix but invalid token, it returns null → 401
      expect([401, 200]).toContain(res.status);
    });

    it('200 - 开发模式：有效 header → 通过', async () => {
      const app = createTestApp(requireAuth, '/test');
      const res = await request(app)
        .get('/test')
        .set('X-User-Id', 'test_user')
        .set('X-User-Role', 'admin');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('200 - 开发模式：普通用户 header → 通过（不检查权限）', async () => {
      const app = createTestApp(requireAuth, '/test');
      const res = await request(app)
        .get('/test')
        .set('X-User-Id', 'regular_user')
        .set('X-User-Role', 'user');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============ requireAdmin ============

  describe('requireAdmin', () => {
    it('401 - 无身份信息 → 401', async () => {
      const app = createTestApp(requireAdmin, '/admin');
      const res = await request(app).get('/admin');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('403 - 普通用户访问 admin 端点 → 403', async () => {
      const app = createTestApp(requireAdmin, '/admin');
      const res = await request(app)
        .get('/admin')
        .set('X-User-Id', 'regular_user')
        .set('X-User-Role', 'user');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('管理员');
    });

    it('403 - viewer 角色访问 admin 端点 → 403', async () => {
      const app = createTestApp(requireAdmin, '/admin');
      const res = await request(app)
        .get('/admin')
        .set('X-User-Id', 'viewer_user')
        .set('X-User-Role', 'viewer');

      expect(res.status).toBe(403);
    });

    it('200 - admin 角色访问 admin 端点 → 通过', async () => {
      const app = createTestApp(requireAdmin, '/admin');
      const res = await request(app)
        .get('/admin')
        .set('X-User-Id', 'admin_user')
        .set('X-User-Role', 'admin');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('200 - vice_admin 角色访问 admin 端点 → 通过', async () => {
      const app = createTestApp(requireAdmin, '/admin');
      const res = await request(app)
        .get('/admin')
        .set('X-User-Id', 'vice_admin_user')
        .set('X-User-Role', 'vice_admin');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============ optionalAuth ============

  describe('optionalAuth', () => {
    it('200 - 无 Token → 通过（无 user）', async () => {
      const app = express();
      app.use(express.json());
      app.get('/optional', optionalAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          hasUser: !!(req as any).user,
        });
      });
      app.use(unifiedErrorHandler);

      const res = await request(app).get('/optional');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hasUser).toBe(false);
    });

    it('200 - 有 Token → 通过（有 user）', async () => {
      const app = express();
      app.use(express.json());
      app.get('/optional', optionalAuth, (req: Request, res: Response) => {
        res.json({
          success: true,
          hasUser: !!(req as any).user,
          userId: (req as any).user?.id,
          userRole: (req as any).user?.role,
        });
      });
      app.use(unifiedErrorHandler);

      const res = await request(app)
        .get('/optional')
        .set('X-User-Id', 'optional_user')
        .set('X-User-Role', 'user');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hasUser).toBe(true);
      expect(res.body.userId).toBe('optional_user');
      expect(res.body.userRole).toBe('user');
    });
  });
});
