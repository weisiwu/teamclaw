-- Migration: Create agent_token_bindings table
-- Agent 与 API Token 的绑定关系

CREATE TABLE IF NOT EXISTS agent_token_bindings (
  id              VARCHAR(64) PRIMARY KEY,
  agent_name      VARCHAR(64) NOT NULL,
  token_id        VARCHAR(64) NOT NULL,
  priority        INTEGER NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 100),
  model_filter    JSON,
  tier_filter     JSON,
  enabled         INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_name, token_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_token_bindings_agent ON agent_token_bindings(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_token_bindings_token ON agent_token_bindings(token_id);
CREATE INDEX IF NOT EXISTS idx_agent_token_bindings_enabled ON agent_token_bindings(enabled);
CREATE INDEX IF NOT EXISTS idx_agent_token_bindings_priority ON agent_token_bindings(priority);

-- Foreign key constraints (optional, if using referential integrity)
-- ALTER TABLE agent_token_bindings 
--   ADD CONSTRAINT fk_agent_token_bindings_token 
--   FOREIGN KEY (token_id) REFERENCES api_tokens(id) ON DELETE CASCADE;
