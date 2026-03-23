-- UP
-- Add rollback tracking fields to versions table
ALTER TABLE versions ADD COLUMN IF NOT EXISTS rollback_count INTEGER DEFAULT 0;
ALTER TABLE versions ADD COLUMN IF NOT EXISTS last_rollback_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_versions_rollback ON versions(rollback_count, last_rollback_at);

-- DOWN
ALTER TABLE versions DROP COLUMN IF EXISTS rollback_count;
ALTER TABLE versions DROP COLUMN IF EXISTS last_rollback_at;
