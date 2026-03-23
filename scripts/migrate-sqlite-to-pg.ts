#!/usr/bin/env node
/**
 * migrate-sqlite-to-pg.ts
 * 数据迁移脚本：将 SQLite 数据迁移到 PostgreSQL
 * 用法：npx ts-node scripts/migrate-sqlite-to-pg.ts
 */

import Database from 'better-sqlite3';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const SQLITE_DB = process.env.SQLITE_DB || path.join(__dirname, '..', 'data', 'teamclaw.db');
const PG_HOST = process.env.PGHOST || process.env.DB_HOST || 'localhost';
const PG_PORT = parseInt(process.env.PGPORT || '5432');
const PG_USER = process.env.PGUSER || process.env.DB_USER || 'postgres';
const PG_PASSWORD = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres';
const PG_DATABASE = process.env.PGDATABASE || process.env.DB_NAME || 'teamclaw';

async function main() {
  console.log('='.repeat(60));
  console.log('SQLite → PostgreSQL 数据迁移脚本');
  console.log('='.repeat(60));

  // 检查 SQLite 数据库是否存在
  if (!fs.existsSync(SQLITE_DB)) {
    console.warn(`[WARN] SQLite 数据库不存在: ${SQLITE_DB}`);
    console.warn('[WARN] 跳过数据迁移（无数据需要迁移）');
    process.exit(0);
  }

  // 连接 SQLite
  console.log(`\n[1] 连接 SQLite: ${SQLITE_DB}`);
  const sqlite = new Database(SQLITE_DB, { readonly: true });

  // 连接 PostgreSQL
  console.log(`[2] 连接 PostgreSQL: ${PG_HOST}:${PG_PORT}/${PG_DATABASE}`);
  const pool = new Pool({
    host: PG_HOST,
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASSWORD,
    database: PG_DATABASE,
    max: 5,
  });

  try {
    await pool.query('SELECT 1');
    console.log('[OK] PostgreSQL 连接成功');
  } catch (err) {
    console.error('[ERROR] PostgreSQL 连接失败:', err);
    process.exit(1);
  }

  // ========== 迁移函数 ==========

  async function migrateTable(
    table: string,
    columns: string[],
    rowMapper: (row: Record<string, unknown>) => Record<string, unknown>
  ) {
    try {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      console.log(`  - ${table}: ${rows.length} 行`);
      if (rows.length === 0) return 0;

      const pgCols = columns.join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${table} (${pgCols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      let imported = 0;
      for (const row of rows) {
        try {
          const data = rowMapper(row);
          const vals = columns.map(col => data[col] ?? null);
          await pool.query(sql, vals);
          imported++;
        } catch (err) {
          console.warn(`    [WARN] 行导入失败:`, err);
        }
      }
      console.log(`    导入成功: ${imported}/${rows.length}`);
      return imported;
    } catch (err) {
      console.warn(`    [SKIP] 表 ${table} 迁移失败:`, err);
      return 0;
    }
  }

  console.log('\n[3] 开始迁移数据...\n');

  // versions
  await migrateTable('versions', [
    'id', 'version', 'branch', 'project_id', 'summary', 'commit_hash',
    'git_tag', 'git_tag_created_at', 'created_by', 'created_at',
    'build_status', 'tag_created', 'rollback_count', 'last_rollback_at',
    'title', 'description', 'status', 'project_path',
  ], row => ({
    id: row.id,
    version: row.version,
    branch: row.branch ?? 'main',
    project_id: row.project_id,
    summary: row.summary,
    commit_hash: row.commit_hash,
    git_tag: row.git_tag,
    git_tag_created_at: row.git_tag_created_at ? new Date(row.git_tag_created_at as string) : null,
    created_by: row.created_by ?? 'system',
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    build_status: row.build_status ?? 'pending',
    tag_created: Boolean(row.tag_created),
    rollback_count: row.rollback_count ?? 0,
    last_rollback_at: row.last_rollback_at ? new Date(row.last_rollback_at as string) : null,
    title: row.title,
    description: row.description,
    status: row.status ?? 'draft',
    project_path: row.project_path,
  }));

  // tags
  await migrateTable('tags', [
    'id', 'name', 'version_id', 'commit_hash', 'annotation',
    'protected', 'created_at', 'source',
  ], row => ({
    id: row.id,
    name: row.name,
    version_id: row.version_id,
    commit_hash: row.commit_hash,
    annotation: row.annotation,
    protected: Boolean(row.protected),
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    source: row.source ?? 'git',
  }));

  // branches
  await migrateTable('branches', [
    'id', 'name', 'is_main', 'is_remote', 'is_protected', 'is_current',
    'created_at', 'last_commit_at', 'commit_message', 'author',
    'description', 'version_id', 'base_branch',
  ], row => ({
    id: row.id,
    name: row.name,
    is_main: Boolean(row.is_main),
    is_remote: Boolean(row.is_remote),
    is_protected: Boolean(row.is_protected),
    is_current: Boolean(row.is_current),
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    last_commit_at: row.last_commit_at ? new Date(row.last_commit_at as string) : null,
    commit_message: row.commit_message,
    author: row.author ?? 'system',
    description: row.description,
    version_id: row.version_id,
    base_branch: row.base_branch,
  }));

  // branch_config
  await migrateTable('branch_config', [
    'id', 'default_branch', 'protected_branches',
    'allow_force_push', 'auto_cleanup_merged', 'updated_at',
  ], row => ({
    id: row.id,
    default_branch: row.default_branch ?? 'main',
    protected_branches: row.protected_branches ?? '["main","master","release/*"]',
    allow_force_push: row.allow_force_push ?? 0,
    auto_cleanup_merged: row.auto_cleanup_merged ?? 0,
    updated_at: row.updated_at ? new Date(row.updated_at as string) : new Date(),
  }));

  // bump_history
  await migrateTable('bump_history', [
    'id', 'version_id', 'version_name', 'previous_version', 'new_version',
    'bump_type', 'trigger_type', 'trigger_task_id', 'trigger_task_title',
    'summary', 'created_by', 'created_at',
  ], row => ({
    id: row.id,
    version_id: row.version_id,
    version_name: row.version_name,
    previous_version: row.previous_version,
    new_version: row.new_version,
    bump_type: row.bump_type,
    trigger_type: row.trigger_type,
    trigger_task_id: row.trigger_task_id,
    trigger_task_title: row.trigger_task_title,
    summary: row.summary,
    created_by: row.created_by ?? 'system',
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
  }));

  // version_summaries
  await migrateTable('version_summaries', [
    'id', 'version_id', 'title', 'content', 'features', 'fixes',
    'changes', 'breaking', 'changes_detail', 'generated_at',
    'generated_by', 'branch_name',
  ], row => ({
    id: row.id,
    version_id: row.version_id,
    title: row.title ?? '',
    content: row.content ?? '',
    features: row.features ?? '[]',
    fixes: row.fixes ?? '[]',
    changes: row.changes ?? '[]',
    breaking: row.breaking ?? '[]',
    changes_detail: row.changes_detail ?? '[]',
    generated_at: row.generated_at ? new Date(row.generated_at as string) : new Date(),
    generated_by: row.generated_by ?? 'system',
    branch_name: row.branch_name,
  }));

  // screenshots
  await migrateTable('screenshots', [
    'id', 'version_id', 'message_id', 'message_content', 'sender_name',
    'sender_avatar', 'screenshot_url', 'thumbnail_url', 'branch_name',
    'file_size', 'mime_type', 'created_at', 'created_by',
  ], row => ({
    id: row.id,
    version_id: row.version_id,
    message_id: row.message_id,
    message_content: row.message_content,
    sender_name: row.sender_name,
    sender_avatar: row.sender_avatar,
    screenshot_url: row.screenshot_url,
    thumbnail_url: row.thumbnail_url,
    branch_name: row.branch_name,
    file_size: row.file_size,
    mime_type: row.mime_type,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    created_by: row.created_by ?? 'system',
  }));

  // audit_log
  await migrateTable('audit_log', [
    'id', 'action', 'user_id', 'target', 'details',
    'ip_address', 'user_agent', 'created_at',
  ], row => ({
    id: row.id,
    action: row.action,
    user_id: row.user_id,
    target: row.target,
    details: row.details,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
  }));

  // rollback_history
  await migrateTable('rollback_history', [
    'id', 'version_id', 'version_name', 'target_ref', 'target_type',
    'mode', 'previous_ref', 'new_branch', 'backup_created', 'message',
    'success', 'error', 'performed_by', 'performed_at', 'created_at',
    'actor_id', 'metadata',
  ], row => ({
    id: row.id,
    version_id: row.version_id,
    version_name: row.version_name,
    target_ref: row.target_ref,
    target_type: row.target_type,
    mode: row.mode,
    previous_ref: row.previous_ref,
    new_branch: row.new_branch,
    backup_created: Boolean(row.backup_created),
    message: row.message,
    success: Boolean(row.success),
    error: row.error,
    performed_by: row.performed_by ?? 'developer',
    performed_at: row.performed_at ? new Date(row.performed_at as string) : new Date(),
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    actor_id: row.actor_id,
    metadata: row.metadata,
  }));

  // search_history
  await migrateTable('search_history', [
    'id', 'user_id', 'query', 'type', 'filters',
    'result_count', 'created_at',
  ], row => ({
    id: row.id,
    user_id: row.user_id,
    query: row.query,
    type: row.type ?? 'keyword',
    filters: row.filters,
    result_count: row.result_count ?? 0,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
  }));

  // download_tasks
  await migrateTable('download_tasks', [
    'id', 'user_id', 'type', 'file_ids', 'status',
    'progress', 'total_bytes', 'downloaded_bytes', 'zip_path', 'zip_name',
    'created_at', 'completed_at', 'error_message',
  ], row => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    file_ids: row.file_ids,
    status: row.status,
    progress: row.progress ?? 0,
    total_bytes: row.total_bytes ?? 0,
    downloaded_bytes: row.downloaded_bytes ?? 0,
    zip_path: row.zip_path,
    zip_name: row.zip_name,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    completed_at: row.completed_at ? new Date(row.completed_at as string) : null,
    error_message: row.error_message,
  }));

  // version_change_events
  await migrateTable('version_change_events', [
    'id', 'version_id', 'event_type', 'title', 'description',
    'actor', 'metadata', 'created_at',
  ], row => ({
    id: row.id,
    version_id: row.version_id,
    event_type: row.event_type,
    title: row.title,
    description: row.description,
    actor: row.actor,
    metadata: row.metadata,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
  }));

  console.log('\n[4] 迁移完成！\n');
  console.log('注意：');
  console.log('  1. 请手动验证 PostgreSQL 中的数据');
  console.log('  2. 确认无误后，可以删除 SQLite 数据库文件');
  console.log(`  3. SQLite 数据库位置: ${SQLITE_DB}`);

  sqlite.close();
  await pool.end();
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
