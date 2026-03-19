-- Version summaries table: stores auto-generated version summaries in DB
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
