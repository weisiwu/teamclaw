-- UP
CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  project_id TEXT,
  summary TEXT,
  commit_hash TEXT,
  git_tag TEXT,
  git_tag_created_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  build_status TEXT DEFAULT 'pending',
  tag_created BOOLEAN DEFAULT FALSE,
  rollback_count INTEGER DEFAULT 0,
  last_rollback_at TIMESTAMPTZ,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'draft',
  project_path TEXT,
  commits JSONB DEFAULT '[]',
  related_tasks JSONB DEFAULT '[]',
  token_used INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_versions_status_branch_created ON versions(build_status, branch, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_created_at ON versions(created_at DESC);

-- DOWN
DROP TABLE IF EXISTS versions;
