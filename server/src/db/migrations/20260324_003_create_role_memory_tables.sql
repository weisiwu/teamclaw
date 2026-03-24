-- Migration: 20260324_003_create_role_memory_tables.sql
-- Role change log and permission delegation persistence tables

-- DOWN
-- DROP TABLE IF EXISTS permission_delegations;
-- DROP TABLE IF EXISTS role_change_log;

-- UP
CREATE TABLE IF NOT EXISTS role_change_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  from_role TEXT,
  to_role TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  reason TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permission_delegations (
  id TEXT PRIMARY KEY,
  delegator_id TEXT NOT NULL,
  delegate_id TEXT NOT NULL,
  permissions TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_role_change_log_user_id ON role_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_log_timestamp ON role_change_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_permission_delegations_delegate_id ON permission_delegations(delegate_id);
CREATE INDEX IF NOT EXISTS idx_permission_delegations_delegator_id ON permission_delegations(delegator_id);
CREATE INDEX IF NOT EXISTS idx_permission_delegations_active ON permission_delegations(delegate_id) WHERE revoked_at IS NULL;
