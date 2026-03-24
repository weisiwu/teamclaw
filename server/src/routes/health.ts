import { Router, Request, Response } from 'express';
import { pool } from '../utils/db.js';
import { redis } from '../utils/redis.js';
import { createChromaClient } from '../utils/chromadb.js';
import { queryOne } from '../db/pg.js';
import { success, error } from '../utils/response.js';

const router = Router();

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    postgres: { status: string; latency?: number; error?: string };
    redis: { status: string; latency?: number; error?: string };
    chromadb: { status: string; latency?: number; error?: string };
  };
  uptime: number;
}

async function checkPostgres(): Promise<{ status: string; latency?: number; error?: string }> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1 as check');
    return { status: 'ok', latency: Date.now() - start };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function checkRedis(): Promise<{ status: string; latency?: number; error?: string }> {
  const start = Date.now();
  try {
    await redis.ping();
    return { status: 'ok', latency: Date.now() - start };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function checkChromaDB(): Promise<{ status: string; latency?: number; error?: string }> {
  const start = Date.now();
  try {
    const client = createChromaClient();
    await client.listCollections();
    return { status: 'ok', latency: Date.now() - start };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Get latest build info (iter-21, migrated to pg)
async function getLatestBuildInfo(): Promise<{ id?: string; time?: string; status?: string } | null> {
  try {
    const row = await queryOne<{ id: string; build_status: string; created_at: string }>(
      `SELECT id, build_status, created_at FROM build_records ORDER BY created_at DESC LIMIT 1`
    );
    if (!row) return null;
    return {
      id: row.id,
      time: row.created_at,
      status: row.build_status,
    };
  } catch {
    return null;
  }
}

// Get latest version info (iter-21, migrated to pg)
async function getLatestVersionInfo(): Promise<{ id?: string; time?: string; status?: string; version?: string } | null> {
  try {
    const row = await queryOne<{ id: string; version: string; status: string; created_at: string }>(
      `SELECT id, version, status, created_at FROM versions ORDER BY created_at DESC LIMIT 1`
    );
    if (!row) return null;
    return {
      id: row.id,
      version: row.version,
      time: row.created_at,
      status: row.status,
    };
  } catch {
    return null;
  }
}

router.get('/health', async (req: Request, res: Response) => {
  const [postgres, redis, chromadb] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkChromaDB(),
  ]);

  const allOk = [postgres, redis, chromadb].every(s => s.status === 'ok');
  const anyError = [postgres, redis, chromadb].some(s => s.status === 'error');

  const health: HealthStatus = {
    status: allOk ? 'ok' : anyError ? 'degraded' : 'degraded',
    timestamp: new Date().toISOString(),
    services: { postgres, redis, chromadb },
    uptime: process.uptime(),
  };

  const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode)
    .setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
    .json({
    code: statusCode,
    data: health,
    message: health.status === 'ok' ? 'All services healthy' : 'Some services degraded',
  });
});

// GET /api/v1/health/detailed — Detailed health check (iter-21, migrated to pg)
router.get('/health/detailed', async (req: Request, res: Response) => {
  const [postgres, redis, chromadb] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkChromaDB(),
  ]);

  const lastBuild = await getLatestBuildInfo();
  const lastVersion = await getLatestVersionInfo();

  const allOk = [postgres, redis, chromadb].every(s => s.status === 'ok');
  const anyError = [postgres, redis, chromadb].some(s => s.status === 'error');

  const statusCode = allOk ? 200 : anyError ? 503 : 200;
  
  const healthData = {
    status: allOk ? 'ok' : anyError ? 'error' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: { postgres, redis, chromadb },
    lastBuild: lastBuild || { status: 'none', message: 'No builds found' },
    lastVersion: lastVersion || { status: 'none', message: 'No versions found' },
  };

  if (statusCode === 200) {
    res.status(200)
      .setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
      .json(success(healthData));
  } else {
    res.status(503)
      .setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
      .json(error(503, 'Some services are experiencing issues', 'SERVICE_UNAVAILABLE'));
  }
});

router.get('/health/live', (_req: Request, res: Response) => {
  res.json(success({ alive: true }));
});

router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json(success({ ready: true }));
  } catch {
    res.status(503).json(error(503, 'Not ready', 'SERVICE_UNAVAILABLE'));
  }
});

export default router;
