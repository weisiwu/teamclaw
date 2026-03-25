-- Migration: Create experiment tracking tables
-- Tracks AI experiment sessions and results

CREATE TABLE IF NOT EXISTS experiment_sessions (
  id          VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        VARCHAR(256) NOT NULL,
  description  TEXT,
  status      VARCHAR(32) DEFAULT 'active'
              CHECK (status IN ('active','paused','completed','archived')),
  config      JSONB DEFAULT '{}',
  created_by  VARCHAR(128),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS experiment_results (
  id            VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id    VARCHAR(64) REFERENCES experiment_sessions(id) ON DELETE CASCADE,
  run_number    INTEGER NOT NULL,
  status        VARCHAR(32) DEFAULT 'pending'
                CHECK (status IN ('pending','running','success','failed')),
  metrics       JSONB DEFAULT '{}',
  parameters    JSONB DEFAULT '{}',
  output        TEXT,
  error_log     TEXT,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_experiment_results_session ON experiment_results(session_id);
CREATE INDEX IF NOT EXISTS idx_experiment_results_status ON experiment_results(status);
CREATE INDEX IF NOT EXISTS idx_experiment_sessions_status ON experiment_sessions(status);
