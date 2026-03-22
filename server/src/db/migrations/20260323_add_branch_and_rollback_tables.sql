-- BranchService SQLite persistence migration
-- Migrates in-memory branch storage to SQLite + adds missing rollback_history fields

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_main INTEGER NOT NULL DEFAULT 0,
  is_remote INTEGER NOT NULL DEFAULT 0,
  is_protected INTEGER NOT NULL DEFAULT 0,
  is_current INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_commit_at TEXT,
  commit_message TEXT,
  author TEXT DEFAULT 'system',
  description TEXT,
  version_id TEXT,
  base_branch TEXT,
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);
CREATE INDEX IF NOT EXISTS idx_branches_is_main ON branches(is_main);
CREATE INDEX IF NOT EXISTS idx_branches_is_current ON branches(is_current);
CREATE INDEX IF NOT EXISTS idx_branches_is_protected ON branches(is_protected);

-- Branch configuration table
CREATE TABLE IF NOT EXISTS branch_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_branch TEXT NOT NULL DEFAULT 'main',
  protected_branches TEXT NOT NULL DEFAULT '["main","master","release/*"]',
  allow_force_push INTEGER NOT NULL DEFAULT 0,
  auto_cleanup_merged INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO branch_config (id, default_branch) VALUES (1, 'main');

-- Add missing columns to rollback_history
-- These may already exist in some databases; ALTER TABLE fails gracefully if they do
ALTER TABLE rollback_history ADD COLUMN actor_id TEXT;
ALTER TABLE rollback_history ADD COLUMN metadata TEXT;
