-- Migration: Create agents table
-- Persisted Agent configuration (migrated from hardcoded AGENT_TEAM constant)

CREATE TABLE IF NOT EXISTS agents (
  id              TEXT PRIMARY KEY,
  name            TEXT UNIQUE NOT NULL,
  role            TEXT NOT NULL,
  level           INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  description     TEXT,
  in_group        BOOLEAN DEFAULT false,
  default_model   TEXT,
  capabilities    TEXT,  -- JSON array stored as text
  workspace       TEXT,
  session_key    TEXT,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agents_name      ON agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_level     ON agents(level);
CREATE INDEX IF NOT EXISTS idx_agents_status   ON agents(status);
