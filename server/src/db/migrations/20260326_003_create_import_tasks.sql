-- Migration: Create import_tasks table
-- Tracks data import jobs (GitHub, Jira, CSV, JSON)

CREATE TABLE IF NOT EXISTS import_tasks (
  id              VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id      VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
  source_type     VARCHAR(32) NOT NULL
                  CHECK (source_type IN ('github','gitlab','jira','csv','json')),
  source_url      TEXT,
  source_data     JSONB,
  status          VARCHAR(32) DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','completed','failed')),
  progress        INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total_items     INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  error_count     INTEGER DEFAULT 0,
  error_log       JSONB DEFAULT '[]',
  mapping_config  JSONB DEFAULT '{}',
  created_by      VARCHAR(128),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_tasks_project ON import_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_import_tasks_status  ON import_tasks(status);
