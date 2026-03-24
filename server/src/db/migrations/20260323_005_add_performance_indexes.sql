-- UP
-- Performance indexes for hot queries
CREATE INDEX IF NOT EXISTS idx_versions_status_branch_created
  ON versions(build_status, branch, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rollback_history_created
  ON rollback_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action_created
  ON audit_log(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_history_user_created
  ON search_history(user_id, created_at DESC);

-- DOWN
DROP INDEX IF EXISTS idx_versions_status_branch_created;
DROP INDEX IF EXISTS idx_rollback_history_created;
DROP INDEX IF EXISTS idx_audit_log_action_created;
DROP INDEX IF EXISTS idx_search_history_user_created;
