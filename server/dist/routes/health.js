import { Router } from 'express';
import { pool } from '../utils/db.js';
import { redis } from '../utils/redis.js';
import { createChromaClient } from '../utils/chromadb.js';
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
