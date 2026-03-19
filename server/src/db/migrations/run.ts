import { getDb } from '../sqlite.js';

export function runMigrations() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      branch TEXT DEFAULT 'main',
      summary TEXT,
      commit_hash TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      build_status TEXT DEFAULT 'pending',
      tag_created INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      version_id TEXT,
      commit_hash TEXT,
      annotation TEXT,
      protected INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS download_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      file_ids TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      downloaded_bytes INTEGER DEFAULT 0,
      zip_path TEXT,
      zip_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      error_message TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_download_tasks_user ON download_tasks(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_download_tasks_status ON download_tasks(status);
  `);

  console.log('[migrations] Database migrations completed');
}
