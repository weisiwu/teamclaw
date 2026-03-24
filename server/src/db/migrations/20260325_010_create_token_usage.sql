-- Migration: Create token_usage table
-- Token consumption statistics - persists in-memory tokenUsage array

CREATE TABLE IF NOT EXISTS token_usage (
  id              VARCHAR(64) PRIMARY KEY,
  task_id         VARCHAR(64),
  layer           VARCHAR(16) NOT NULL CHECK (layer IN ('light', 'medium', 'strong')),
  input_tokens    BIGINT NOT NULL DEFAULT 0,
  output_tokens   BIGINT NOT NULL DEFAULT 0,
  total_tokens    BIGINT NOT NULL DEFAULT 0,
  cost            NUMERIC(14, 6) NOT NULL DEFAULT 0,
  model           VARCHAR(128),
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_token_usage_task_id      ON token_usage(task_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_layer        ON token_usage(layer);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp    ON token_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp_layer ON token_usage(timestamp, layer);
