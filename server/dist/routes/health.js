import { Router } from 'express';
import { pool } from '../utils/db.js';
import { redis } from '../utils/redis.js';
import { createChromaClient } from '../utils/chromadb.js';
import { getDb } from '../db/sqlite.js';
const router = Router();
async function checkPostgres() {
    const start = Date.now();
    try {
        await pool.query('SELECT 1 as check');
        return { status: 'ok', latency: Date.now() - start };
    }
    catch (err) {
        return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
    }
}
async function checkRedis() {
    const start = Date.now();
    try {
        await redis.ping();
        return { status: 'ok', latency: Date.now() - start };
    }
    catch (err) {
        return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
    }
}
async function checkChromaDB() {
    const start = Date.now();
    try {
        const client = createChromaClient();
        await client.listCollections();
        return { status: 'ok', latency: Date.now() - start };
    }
    catch (err) {
        return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
    }
}
// Check SQLite connection (iter-21)
async function checkSQLite() {
    const start = Date.now();
    try {
        const db = getDb();
        db.prepare('SELECT 1').get();
        return { status: 'ok', latency: Date.now() - start };
    }
    catch (err) {
        return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
    }
}
// Get latest build info (iter-21)
function getLatestBuildInfo() {
    try {
        const db = getDb();
        const row = db.prepare(`
      SELECT id, build_status, created_at 
      FROM build_records 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get();
        if (!row)
            return null;
        return {
            id: row.id,
            time: row.created_at,
            status: row.build_status,
        };
    }
    catch {
        return null;
    }
}
// Get latest version info (iter-21)
function getLatestVersionInfo() {
    try {
        const db = getDb();
        const row = db.prepare(`
      SELECT id, version, status, created_at 
      FROM versions 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get();
        if (!row)
            return null;
        return {
            id: row.id,
            version: row.version,
            time: row.created_at,
            status: row.status,
        };
    }
    catch {
        return null;
    }
}
router.get('/health', async (req, res) => {
    const [postgres, redis, chromadb] = await Promise.all([
        checkPostgres(),
        checkRedis(),
        checkChromaDB(),
    ]);
    const allOk = [postgres, redis, chromadb].every(s => s.status === 'ok');
    const anyError = [postgres, redis, chromadb].some(s => s.status === 'error');
    const health = {
        status: allOk ? 'ok' : anyError ? 'degraded' : 'degraded',
        timestamp: new Date().toISOString(),
        services: { postgres, redis, chromadb },
        uptime: process.uptime(),
    };
    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json({
        code: statusCode,
        data: health,
        message: health.status === 'ok' ? 'All services healthy' : 'Some services degraded',
    });
});
// GET /api/v1/health/detailed — Detailed health check (iter-21)
router.get('/health/detailed', async (req, res) => {
    const [postgres, redis, chromadb, sqlite] = await Promise.all([
        checkPostgres(),
        checkRedis(),
        checkChromaDB(),
        checkSQLite(),
    ]);
    const lastBuild = getLatestBuildInfo();
    const lastVersion = getLatestVersionInfo();
    const allOk = [postgres, redis, chromadb, sqlite].every(s => s.status === 'ok');
    const anyError = [postgres, redis, chromadb, sqlite].some(s => s.status === 'error');
    const statusCode = allOk ? 200 : anyError ? 503 : 200;
    res.status(statusCode).json({
        code: statusCode,
        data: {
            status: allOk ? 'ok' : anyError ? 'error' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: { postgres, redis, chromadb, sqlite },
            lastBuild: lastBuild || { status: 'none', message: 'No builds found' },
            lastVersion: lastVersion || { status: 'none', message: 'No versions found' },
        },
        message: allOk ? 'All services healthy' : 'Some services are experiencing issues',
    });
});
router.get('/health/live', (req, res) => {
    res.json({ code: 200, data: { alive: true }, message: 'OK' });
});
router.get('/health/ready', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ code: 200, data: { ready: true }, message: 'Ready' });
    }
    catch {
        res.status(503).json({ code: 503, data: { ready: false }, message: 'Not ready' });
    }
});
export default router;
