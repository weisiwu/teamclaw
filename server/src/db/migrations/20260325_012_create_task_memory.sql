-- Migration: Create task_memory table
-- Task context/memory persistence - persists in-memory contexts Map

CREATE TABLE IF NOT EXISTS task_memory (
  id              BIGSERIAL PRIMARY KEY,
  task_id         VARCHAR(64) NOT NULL,
  session_id      VARCHAR(128) NOT NULL,
  context_key     VARCHAR(256) NOT NULL,  -- "${sessionId}:${taskId}"
  messages        JSONB NOT NULL DEFAULT '[]',
  checkpoints     JSONB NOT NULL DEFAULT '[]',
  summary         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, session_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_task_memory_task_id     ON task_memory(task_id);
CREATE INDEX IF NOT EXISTS idx_task_memory_session_id  ON task_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_task_memory_context_key ON task_memory(context_key);
CREATE INDEX IF NOT EXISTS idx_task_memory_updated_at  ON task_memory(updated_at DESC);
