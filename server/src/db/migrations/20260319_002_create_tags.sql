-- UP
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  version_id TEXT REFERENCES versions(id) ON DELETE SET NULL,
  commit_hash TEXT,
  annotation TEXT,
  protected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'git'
);

CREATE INDEX IF NOT EXISTS idx_tags_version ON tags(version_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_source ON tags(source);

-- DOWN
DROP TABLE IF EXISTS tags;
