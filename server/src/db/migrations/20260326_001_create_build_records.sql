-- Migration: Create build_records table
-- Tracks build/CI execution history

CREATE TABLE IF NOT EXISTS build_records (
  id              VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id      VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
  version_id      VARCHAR(64) REFERENCES versions(id) ON DELETE SET NULL,
  branch_id       VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','success','failed','cancelled')),
  build_type      VARCHAR(32) DEFAULT 'manual'
                  CHECK (build_type IN ('manual','auto','webhook')),
  trigger_by      VARCHAR(128),
  artifact_url    TEXT,
  log_url         TEXT,
  duration_ms     INTEGER,
  error_message   TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_build_records_project   ON build_records(project_id);
CREATE INDEX IF NOT EXISTS idx_build_records_version   ON build_records(version_id);
CREATE INDEX IF NOT EXISTS idx_build_records_status    ON build_records(status);
CREATE INDEX IF NOT EXISTS idx_build_records_created   ON build_records(created_at DESC);
