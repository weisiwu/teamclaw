/**
 * Migration: 20260322_add_performance_indexes
 * Performance optimization: Add composite indexes for hot queries
 */

import type { Database } from 'better-sqlite3';

export function run(db: Database): void {
  // Composite index for versions list with status + branch + build_status filter + created_at sort
  // Covers: SELECT * FROM versions WHERE status=? AND branch=? AND build_status=? ORDER BY created_at DESC
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_versions_status_branch_created
    ON versions(build_status, branch, created_at DESC)
  `);

  // Composite index for rollback_history time-ordered queries (no version_id filter)
  // Covers: SELECT * FROM rollback_history ORDER BY created_at DESC LIMIT ?
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_rollback_history_created
    ON rollback_history(created_at DESC)
  `);

  // Index for audit_log action + time ordered queries
  // Covers: SELECT * FROM audit_log WHERE action=? ORDER BY created_at DESC
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_action_created
    ON audit_log(action, created_at DESC)
  `);

  // Index for search_history user + recent queries (FTS fallback prep)
  // Covers: SELECT * FROM search_history WHERE user_id=? ORDER BY created_at DESC LIMIT 50
  // Already has idx_search_history_user but adding created_at for covering
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_history_user_created
    ON search_history(user_id, created_at DESC)
  `);

  console.log('[Migration 20260322] Performance indexes created successfully');
}
