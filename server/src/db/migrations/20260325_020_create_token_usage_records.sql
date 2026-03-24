-- Migration: Create token_usage_records table
-- Records every LLM call with API token, agent, model, token counts, latency and status

CREATE TABLE IF NOT EXISTS token_usage_records (
  id              VARCHAR(64) PRIMARY KEY,
  api_token_id    VARCHAR(64),                           -- Foreign key to api_token (nullable for backward compat)
  agent_name      VARCHAR(128),                          -- Calling agent name (e.g. "coder", "pm")
  model           VARCHAR(128) NOT NULL,                  -- Model name used
  provider        VARCHAR(32) NOT NULL DEFAULT 'unknown',-- "deepseek" | "openai" | "anthropic"
  input_tokens    BIGINT NOT NULL DEFAULT 0,
  output_tokens   BIGINT NOT NULL DEFAULT 0,
  total_tokens    BIGINT NOT NULL DEFAULT 0,
  latency_ms      INTEGER NOT NULL DEFAULT 0,
  status          VARCHAR(16) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
  error_message   TEXT,
  cost_usd        NUMERIC(14, 8) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_token_usage_records_api_token_id ON token_usage_records(api_token_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_records_agent_name  ON token_usage_records(agent_name);
CREATE INDEX IF NOT EXISTS idx_token_usage_records_created_at  ON token_usage_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_records_model       ON token_usage_records(model);
CREATE INDEX IF NOT EXISTS idx_token_usage_records_status      ON token_usage_records(status);
-- Composite index for time-range + token queries
CREATE INDEX IF NOT EXISTS idx_token_usage_records_token_time  ON token_usage_records(api_token_id, created_at DESC);
-- Composite index for agent + time queries
CREATE INDEX IF NOT EXISTS idx_token_usage_records_agent_time  ON token_usage_records(agent_name, created_at DESC);
