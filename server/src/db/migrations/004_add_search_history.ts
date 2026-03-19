import { getDb } from '../sqlite.js';

export function migrate_004_add_search_history() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      query TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'keyword',
      filters TEXT,
      result_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, created_at DESC);
  `);
  console.log('[migration 004] search_history table created');
}
