-- Migration: Create api_token table
-- Supports multiple LLM provider API keys management

CREATE TABLE IF NOT EXISTS api_token (
  id              VARCHAR(64) PRIMARY KEY,
  alias           VARCHAR(255) NOT NULL,
  provider        VARCHAR(32) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'deepseek', 'custom')),
  api_key         TEXT NOT NULL,                    -- AES-256-GCM encrypted
  base_url        TEXT,
  models          JSONB NOT NULL DEFAULT '[]',
  status          VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired')),
  monthly_budget_usd  NUMERIC(10,2),
  current_month_usage_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  total_usage_usd     NUMERIC(14,4) NOT NULL DEFAULT 0,
  call_count         BIGINT NOT NULL DEFAULT 0,
  last_used_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         VARCHAR(64) NOT NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note              TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_api_token_provider ON api_token(provider);
CREATE INDEX IF NOT EXISTS idx_api_token_status   ON api_token(status);
CREATE INDEX IF NOT EXISTS idx_api_token_created_by ON api_token(created_by);
