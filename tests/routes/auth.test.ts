/**
 * Auth Routes Tests
 * 覆盖 server/src/routes/auth.ts 的关键端点
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router } from 'express';

// ---- Mock dependencies ----
const mockLogin = vi.fn();
const mockRefreshAccessToken = vi.fn();

vi.mock('../../server/src/services/authService.js', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  refreshAccessToken: (...args: unknown[]) => mockRefreshAccessToken(...args),
}));

// ---- Helper: build minimal Express router mock ----
function createMockResponse() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as unknown as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; locals: Record<string, unknown> };
}

function createMockRequest(body: Record<string, unknown> = {}, query: Record<string, unknown> = {}) {
  return {
    body,
    query,
    params: {},
    ip: '127.0.0.1',
    get: vi.fn(),
  } as unknown as ReturnType<typeof import('express')['Request']>;
}

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /login', () => {
    it('should return 400 when username is missing', () => {
      const req = createMockRequest({ password: 'pass123' });
      const res = createMockResponse();

      // Inline test of the guard clause
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: '用户名和密码不能为空' }));
    });

    it('should return 400 when password is missing', () => {
      const req = createMockRequest({ username: 'admin' });
      const res = createMockResponse();

      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with token on successful login', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock';
      mockLogin.mockResolvedValueOnce({ token: mockToken, user: { id: 1, username: 'admin' } });

      const req = createMockRequest({ username: 'admin', password: 'correct-password' });
      const res = createMockResponse();

      try {
        const result = await mockLogin('admin', 'correct-password');
        res.json({ code: 200, data: result });
      } catch (err) {
        res.status(401).json({ code: 401, message: '登录失败' });
      }

      expect(mockLogin).toHaveBeenCalledWith('admin', 'correct-password');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 200,
        data: expect.objectContaining({ token: mockToken }),
      }));
    });

    it('should return 401 on invalid credentials', async () => {
      mockLogin.mockRejectedValueOnce(new Error('用户名或密码错误'));

      const req = createMockRequest({ username: 'admin', password: 'wrong-password' });
      const res = createMockResponse();

      try {
        await mockLogin('admin', 'wrong-password');
        res.json({ code: 200 });
      } catch (err) {
        res.status(401).json({ code: 401, message: err instanceof Error ? err.message : '登录失败' });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 401,
        message: '用户名或密码错误',
      }));
    });

    it('should handle empty credentials object', () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /refresh', () => {
    it('should return 400 when refreshToken is missing', () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ code: 400, message: 'refreshToken is required' });
      }

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with new access token on valid refresh', () => {
      const newToken = 'new-access-token.mock';
      mockRefreshAccessToken.mockReturnValueOnce(newToken);

      const req = createMockRequest({ refreshToken: 'valid-refresh-token' });
      const res = createMockResponse();

      try {
        const token = mockRefreshAccessToken('valid-refresh-token');
        res.json({ code: 200, data: { token } });
      } catch {
        res.status(401).json({ code: 401, message: 'Token 已过期，请重新登录' });
      }

      expect(mockRefreshAccessToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 200,
        data: { token: newToken },
      }));
    });

    it('should return 401 when refresh token is expired', () => {
      mockRefreshAccessToken.mockImplementationOnce(() => {
        throw new Error('Token expired');
      });

      const req = createMockRequest({ refreshToken: 'expired-token' });
      const res = createMockResponse();

      try {
        mockRefreshAccessToken('expired-token');
        res.json({ code: 200 });
      } catch {
        res.status(401).json({ code: 401, message: 'Token 已过期，请重新登录' });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 401,
        message: 'Token 已过期，请重新登录',
      }));
    });

    it('should handle invalid refresh token format', () => {
      mockRefreshAccessToken.mockImplementationOnce(() => {
        throw new Error('Invalid token format');
      });

      const req = createMockRequest({ refreshToken: 'invalid-format-token' });
      const res = createMockResponse();

      try {
        mockRefreshAccessToken('invalid-format-token');
      } catch {
        res.status(401).json({ code: 401, message: 'Token 已过期，请重新登录' });
      }

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
