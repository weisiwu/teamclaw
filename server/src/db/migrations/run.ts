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

    CREATE TABLE IF NOT EXISTS bump_history (
      id TEXT PRIMARY KEY,
      version_id TEXT NOT NULL,
      version_name TEXT NOT NULL,
      previous_version TEXT NOT NULL,
      new_version TEXT NOT NULL,
      bump_type TEXT NOT NULL CHECK (bump_type IN ('patch', 'minor', 'major')),
      trigger_type TEXT NOT NULL CHECK (trigger_type IN ('task_done', 'build_success', 'manual')),
      trigger_task_id TEXT,
      trigger_task_title TEXT,
      summary TEXT,
      created_by TEXT DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_bump_history_version ON bump_history(version_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bump_history_trigger ON bump_history(trigger_type, created_at DESC);

    CREATE TABLE IF NOT EXISTS version_summaries (
      id TEXT PRIMARY KEY,
      version_id TEXT UNIQUE NOT NULL,
      title TEXT,
      content TEXT,
      features TEXT,
      fixes TEXT,
      changes TEXT,
      breaking TEXT,
      changes_detail TEXT,
      generated_at TEXT DEFAULT (datetime('now')),
      generated_by TEXT,
      branch_name TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_version_summaries_version ON version_summaries(version_id);
  `);

  // Add git_tag columns if they don't exist (iter-79)
  try {
    db.prepare("ALTER TABLE versions ADD COLUMN git_tag TEXT").run();
  } catch (e: unknown) {
    // Column may already exist in newer dbs, ignore
  }
  try {
    db.prepare("ALTER TABLE versions ADD COLUMN git_tag_created_at TEXT").run();
  } catch (e: unknown) {
    // Column may already exist in newer dbs, ignore
  }

  console.log('[migrations] Database migrations completed');
}
