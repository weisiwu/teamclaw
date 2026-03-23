/**
 * PostgreSQL Query Utilities
 * Replaces better-sqlite3 with pg driver
 */
import { pool } from '../utils/db.js';
export async function query(sql, params) {
    const result = await pool.query(sql, params ?? []);
    return result.rows;
}
export async function queryOne(sql, params) {
    const rows = await query(sql, params);
    return rows[0] ?? null;
}
export async function execute(sql, params) {
    const result = await pool.query(sql, params ?? []);
    return result.rowCount ?? 0;
}
export async function transaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn();
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
