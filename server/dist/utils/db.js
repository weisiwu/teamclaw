import pg from 'pg';
import { onShutdown } from './shutdown.js';
const { Pool } = pg;
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/teamclaw',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
// 注册优雅关闭
onShutdown('PostgreSQL', async () => {
    await pool.end();
});
