-- Migration: Add bump_history table for tracking version bumps
-- Trigger types: 'task_done' | 'build_success' | 'manual'

CREATE TABLE IF NOT EXISTS bump_history (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  version_name TEXT NOT NULL,
  previous_version TEXT NOT NULL,
  new_version TEXT NOT NULL,
  bump_type TEXT NOT NULL CHECK (bump_type IN ('patch', 'minor', 'major')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('task_done', 'build_success', 'manual')),
  trigger_task_id TEXT,
  trigger_task_title TEXT,
  summary TEXT,
  created_by TEXT DEFAULT 'system',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bump_history_version ON bump_history(version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bump_history_trigger ON bump_history(trigger_type, created_at DESC);
