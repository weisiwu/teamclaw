-- UP
CREATE TABLE IF NOT EXISTS version_summaries (
  id TEXT PRIMARY KEY,
  version_id TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT,
  features TEXT,
  fixes TEXT,
  changes TEXT,
  breaking TEXT,
  changes_detail JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT,
  branch_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_version_summaries_version ON version_summaries(version_id);

-- DOWN
DROP TABLE IF EXISTS version_summaries;
