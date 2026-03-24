-- Migration: Create agent_token_binding table
-- Binds agents to API tokens with priority and filter rules

CREATE TABLE IF NOT EXISTS agent_token_binding (
  id              VARCHAR(64) PRIMARY KEY,
  agent_name      VARCHAR(128) NOT NULL,
  token_id        VARCHAR(64) NOT NULL REFERENCES api_token(id) ON DELETE CASCADE,
  priority        INTEGER NOT NULL DEFAULT 100,
  model_filter    JSONB,
  tier_filter     JSONB,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_name, token_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_binding_agent_name ON agent_token_binding(agent_name);
CREATE INDEX IF NOT EXISTS idx_binding_token_id   ON agent_token_binding(token_id);
CREATE INDEX IF NOT EXISTS idx_binding_priority  ON agent_token_binding(agent_name, priority);
CREATE INDEX IF NOT EXISTS idx_binding_enabled   ON agent_token_binding(enabled);
