-- Migration: Create settings and token_stats tables
-- Key-value settings store and per-agent token usage statistics

CREATE TABLE IF NOT EXISTS settings (
  id          VARCHAR(64) PRIMARY KEY DEFAULT 'global',
  key         VARCHAR(256) UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  VARCHAR(128),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS token_stats (
  id               VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id         VARCHAR(64) REFERENCES agents(id) ON DELETE CASCADE,
  model            VARCHAR(128) NOT NULL,
  date             DATE NOT NULL,
  prompt_tokens    INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens    INTEGER DEFAULT 0,
  request_count    INTEGER DEFAULT 0,
  cost_usd         DECIMAL(12, 6) DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, model, date)
);

CREATE INDEX IF NOT EXISTS idx_token_stats_agent ON token_stats(agent_id);
CREATE INDEX IF NOT EXISTS idx_token_stats_date  ON token_stats(date);
CREATE INDEX IF NOT EXISTS idx_token_stats_model ON token_stats(model);
