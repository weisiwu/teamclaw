/**
 * Health Route 集成测试
 * 覆盖: GET /health, /health/detailed, /health/live, /health/ready
 */

// Mock infrastructure modules (jest.mock is automatically hoisted above imports in Jest)
jest.mock('../../src/utils/db.js', () => ({
  pool: {
    query: async () => ({ rows: [], rowCount: 0 }),
    connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => {} }),
    end: async () => {},
    on: () => {},
  },
}));

jest.mock('../../src/utils/redis.js', () => ({
  redis: {
    ping: async () => 'PONG',
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    on: () => {},
  },
}));

jest.mock('../../src/utils/chromadb.js', () => ({
  createChromaClient: () => ({
    listCollections: async () => [],
  }),
}));

jest.mock('../../src/db/sqlite.js', () => ({
  getDb: () => ({
    prepare: () => ({ all: () => [], get: () => null, run: () => ({ changes: 0, lastInsertRowid: BigInt(0) }) }),
    exec: () => {},
    close: () => {},
  }),
}));

// Static imports run after jest.mock calls are hoisted
import express, { Express } from 'express';
import request from 'supertest';
import healthRouter from '../../src/routes/health.js';

describe('Health Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', healthRouter);
  });

  describe('GET /health', () => {
    it('should return 200 with health status when all services are up', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data).toHaveProperty('services');
      expect(res.body.data.services).toHaveProperty('postgres');
      expect(res.body.data.services).toHaveProperty('redis');
      expect(res.body.data.services).toHaveProperty('chromadb');
    });

    it('should set Cache-Control header', async () => {
      const res = await request(app).get('/health');

      expect(res.headers['cache-control']).toContain('public');
      expect(res.headers['cache-control']).toContain('max-age=30');
    });

    it('should include uptime', async () => {
      const res = await request(app).get('/health');

      expect(typeof res.body.data.uptime).toBe('number');
      expect(res.body.data.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /health/detailed', () => {
    it('should return 200 with detailed health including sqlite', async () => {
      const res = await request(app).get('/health/detailed');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('services');
      expect(res.body.data.services).toHaveProperty('sqlite');
      expect(res.body.data).toHaveProperty('lastBuild');
      expect(res.body.data).toHaveProperty('lastVersion');
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 with alive true', async () => {
      const res = await request(app).get('/health/live');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alive).toBe(true);
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when postgres is ready', async () => {
      const res = await request(app).get('/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ready).toBe(true);
    });
  });
});
