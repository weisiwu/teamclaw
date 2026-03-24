-- Migration: Create agent_executions table
-- Agent execution context - persists in-memory executionLogs Map

CREATE TABLE IF NOT EXISTS agent_executions (
  execution_id    VARCHAR(64) PRIMARY KEY,
  task_id         VARCHAR(64),
  dispatcher      VARCHAR(64) NOT NULL,
  target_agent    VARCHAR(64) NOT NULL,
  prompt          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  status          VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timeout')),
  result          TEXT,
  error           TEXT,
  model           VARCHAR(128),
  duration_ms     BIGINT,
  usage_input_tokens  BIGINT,
  usage_output_tokens BIGINT,
  usage_total_tokens BIGINT,
  cost_usd        NUMERIC(14, 6)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_executions_task_id     ON agent_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_target      ON agent_executions(target_agent);
CREATE INDEX IF NOT EXISTS idx_agent_executions_dispatcher  ON agent_executions(dispatcher);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status      ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at  ON agent_executions(created_at DESC);

-- Index for agent execution state lookup (which agent is currently running)
CREATE INDEX IF NOT EXISTS idx_agent_executions_running ON agent_executions(target_agent, status)
  WHERE status = 'running';
