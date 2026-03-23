-- UP
CREATE TABLE IF NOT EXISTS rollback_history (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  version_name TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('tag', 'branch', 'commit')),
  mode TEXT NOT NULL CHECK (mode IN ('revert', 'checkout')),
  previous_ref TEXT,
  new_branch TEXT,
  backup_created BOOLEAN DEFAULT FALSE,
  message TEXT,
  success BOOLEAN NOT NULL,
  error TEXT,
  performed_by TEXT DEFAULT 'developer',
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actor_id TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_rollback_history_version ON rollback_history(version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rollback_history_created ON rollback_history(created_at DESC);

-- DOWN
DROP TABLE IF EXISTS rollback_history;
