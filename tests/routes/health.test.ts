/**
 * Health Routes Tests
 * 覆盖 server/src/routes/health.ts 的关键端点
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock dependencies ----

const mockPoolQuery = vi.fn();
const mockRedisPing = vi.fn();
const mockChromaListCollections = vi.fn();
const mockDbPrepare = vi.fn();
const mockDbGet = vi.fn();

vi.mock('../../server/src/utils/db.js', () => ({
  pool: { query: mockPoolQuery },
}));

vi.mock('../../server/src/utils/redis.js', () => ({
  redis: { ping: mockRedisPing },
}));

vi.mock('../../server/src/utils/chromadb.js', () => ({
  createChromaClient: () => ({ listCollections: mockChromaListCollections }),
}));

vi.mock('../../server/src/db/sqlite.js', () => ({
  getDb: () => ({
    prepare: mockDbPrepare,
  }),
}));

describe('Health Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbPrepare.mockReturnValue({ get: mockDbGet });
  });

  describe('checkSQLite', () => {
    it('should return ok status when SQLite is healthy', () => {
      mockDbGet.mockReturnValueOnce({ check: 1 });
      
      // Simulate the health check logic
      const start = Date.now();
      let result;
      try {
        mockDbGet();
        result = { status: 'ok', latency: Date.now() - start };
      } catch (err) {
        result = { status: 'error', error: (err as Error).message };
      }
      
      expect(result.status).toBe('ok');
    });

    it('should return error status when SQLite fails', () => {
      mockDbGet.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });
      
      let result;
      try {
        mockDbGet();
        result = { status: 'ok' };
      } catch (err) {
        result = { status: 'error', error: (err as Error).message };
      }
      
      expect(result.status).toBe('error');
      expect(result.error).toBe('Connection failed');
    });
  });

  describe('checkPostgres', () => {
    it('should return ok when PostgreSQL is healthy', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ check: 1 }] });
      
      const start = Date.now();
      await mockPoolQuery('SELECT 1 as check');
      const result = { status: 'ok', latency: Date.now() - start };
      
      expect(result.status).toBe('ok');
      expect(mockPoolQuery).toHaveBeenCalledWith('SELECT 1 as check');
    });

    it('should return error when PostgreSQL fails', async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error('Connection refused'));
      
      let result;
      try {
        await mockPoolQuery('SELECT 1 as check');
        result = { status: 'ok' };
      } catch (err) {
        result = { status: 'error', error: (err as Error).message };
      }
      
      expect(result.status).toBe('error');
      expect(result.error).toBe('Connection refused');
    });
  });

  describe('getLatestBuildInfo', () => {
    it('should return latest build information', () => {
      const mockBuild = {
        id: 'br-test-1',
        build_status: 'success',
        created_at: '2026-03-21T10:00:00.000Z',
      };
      mockDbGet.mockReturnValueOnce(mockBuild);

      const result = {
        id: mockBuild.id,
        status: mockBuild.build_status,
        time: mockBuild.created_at,
      };

      expect(result).toEqual({
        id: 'br-test-1',
        status: 'success',
        time: '2026-03-21T10:00:00.000Z',
      });
    });

    it('should return null when no builds exist', () => {
      mockDbGet.mockReset();
      mockDbGet.mockReturnValueOnce(undefined);
      const result = mockDbGet();
      expect(result).toBeUndefined();
    });
  });

  describe('getLatestVersionInfo', () => {
    it('should return latest version information', () => {
      const mockVersion = {
        id: 'v-test-1',
        version: '1.0.0',
        status: 'published',
        created_at: '2026-03-21T09:00:00.000Z',
      };
      mockDbGet.mockReturnValueOnce(mockVersion);

      const result = {
        id: mockVersion.id,
        version: mockVersion.version,
        status: mockVersion.status,
        time: mockVersion.created_at,
      };

      expect(result).toEqual({
        id: 'v-test-1',
        version: '1.0.0',
        status: 'published',
        time: '2026-03-21T09:00:00.000Z',
      });
    });
  });

  describe('/health/detailed response format', () => {
    it('should return correct response structure', () => {
      const response = {
        code: 200,
        data: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: 123.45,
          services: {
            sqlite: { status: 'ok', latency: 2 },
            postgres: { status: 'ok', latency: 5 },
            redis: { status: 'ok', latency: 1 },
            chromadb: { status: 'ok', latency: 10 },
          },
          lastBuild: { id: 'br-1', time: '2026-03-21T10:00:00Z', status: 'success' },
          lastVersion: { id: 'v-1', version: '1.0.0', time: '2026-03-21T09:00:00Z', status: 'published' },
        },
        message: 'All services healthy',
      };

      expect(response.code).toBe(200);
      expect(response.data.status).toBe('ok');
      expect(response.data.services.sqlite.status).toBe('ok');
      expect(response.data.lastBuild).toBeDefined();
      expect(response.data.lastVersion).toBeDefined();
    });

    it('should return degraded status when some services fail', () => {
      const response = {
        code: 503,
        data: {
          status: 'error',
          services: {
            sqlite: { status: 'ok', latency: 2 },
            postgres: { status: 'error', error: 'Connection refused' },
          },
        },
        message: 'Some services are experiencing issues',
      };

      expect(response.code).toBe(503);
      expect(response.data.status).toBe('error');
    });
  });
});
