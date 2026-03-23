/**
 * Idempotent Migration Runner
 * - Tracks executed migrations in _migrations table
 * - Only runs migrations not yet recorded
 * - Supports UP/DOWN sections (DOWN is optional)
 * - Records execution time and status
 */
import { pool } from '../../utils/db.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
const MIGRATIONS_DIR = path.join(import.meta.dirname, '.');
// Ensure _migrations table exists
async function ensureMigrationTable() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW(),
      checksum TEXT,
      execution_time_ms INTEGER,
      status TEXT DEFAULT 'success'
    )
  `);
}
// Get list of already-executed migrations
async function getExecutedMigrations() {
    const { rows } = await pool.query('SELECT name FROM _migrations WHERE status = $1 ORDER BY name', ['success']);
    return new Set(rows.map((r) => r.name));
}
// Scan and sort migration files matching YYYYMMDD_NNN pattern
function scanMigrationFiles() {
    return fs.readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql') && /^\d{8}_\d{3}_/.test(f))
        .sort()
        .map((f) => {
        const content = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8');
        return {
            name: f.replace(/\.sql$/, ''),
            path: path.join(MIGRATIONS_DIR, f),
            checksum: crypto.createHash('md5').update(content).digest('hex'),
        };
    });
}
// Execute a single migration (UP section only)
async function executeMigration(migration) {
    const sql = fs.readFileSync(migration.path, 'utf-8');
    const upSection = sql.split(/-- DOWN/)[0]; // Only run UP
    const start = Date.now();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(upSection.trim());
        await client.query('INSERT INTO _migrations (name, checksum, execution_time_ms, status) VALUES ($1, $2, $3, $4)', [migration.name, migration.checksum, Date.now() - start, 'success']);
        await client.query('COMMIT');
        console.log(`  ✅ ${migration.name} (${Date.now() - start}ms)`);
    }
    catch (err) {
        await client.query('ROLLBACK');
        await pool.query('INSERT INTO _migrations (name, checksum, execution_time_ms, status) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO UPDATE SET status = EXCLUDED.status, execution_time_ms = EXCLUDED.execution_time_ms', [migration.name, migration.checksum, Date.now() - start, 'failed']);
        console.error(`  ❌ ${migration.name}: ${err}`);
        throw err;
    }
    finally {
        client.release();
    }
}
// Main entry point
export async function runMigrations() {
    console.log('[migrations] Checking database migrations...');
    await ensureMigrationTable();
    const executed = await getExecutedMigrations();
    const files = scanMigrationFiles();
    const pending = files.filter((f) => !executed.has(f.name));
    if (pending.length === 0) {
        console.log('[migrations] Database is up to date');
        return;
    }
    console.log(`[migrations] Running ${pending.length} pending migration(s)...`);
    for (const migration of pending) {
        await executeMigration(migration);
    }
    console.log('[migrations] All migrations completed');
}
