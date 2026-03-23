-- UP
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  is_remote BOOLEAN DEFAULT FALSE,
  is_protected BOOLEAN DEFAULT FALSE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_commit_at TIMESTAMPTZ,
  commit_message TEXT,
  author TEXT DEFAULT 'system',
  description TEXT,
  version_id TEXT REFERENCES versions(id) ON DELETE SET NULL,
  base_branch TEXT
);

CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);
CREATE INDEX IF NOT EXISTS idx_branches_is_main ON branches(is_main);
CREATE INDEX IF NOT EXISTS idx_branches_is_current ON branches(is_current);
CREATE INDEX IF NOT EXISTS idx_branches_is_protected ON branches(is_protected);

-- DOWN
DROP TABLE IF EXISTS branches;
