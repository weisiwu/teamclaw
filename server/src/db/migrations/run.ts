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
  `);

  console.log('[migrations] Database migrations completed');
}
