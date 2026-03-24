-- PostgreSQL Schema for TeamClaw
-- H1: 统一数据存储到 PostgreSQL

-- ============ Schema Migrations (managed by server/src/db/migrations/run.ts) ============
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT,
  execution_time_ms INTEGER,
  status TEXT DEFAULT 'success'
);

-- ============ Versions ============
CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  project_id TEXT,
  summary TEXT,
  commit_hash TEXT,
  git_tag TEXT,
  git_tag_created_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  build_status TEXT DEFAULT 'pending',
  tag_created BOOLEAN DEFAULT FALSE,
  rollback_count INTEGER DEFAULT 0,
  last_rollback_at TIMESTAMPTZ,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'draft',
  project_path TEXT,
  commits JSONB DEFAULT '[]',
  related_tasks JSONB DEFAULT '[]',
  token_used INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_versions_status_branch_created ON versions(build_status, branch, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_created_at ON versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_rollback ON versions(rollback_count, last_rollback_at);

-- ============ Tags ============
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  version_id TEXT REFERENCES versions(id) ON DELETE SET NULL,
  commit_hash TEXT,
  annotation TEXT,
  protected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'git'
);

CREATE INDEX IF NOT EXISTS idx_tags_version ON tags(version_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Source column (added by migration 20260321_002)
DO $$ BEGIN
  ALTER TABLE tags ADD COLUMN source TEXT DEFAULT 'manual';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============ Branches ============
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  is_remote BOOLEAN DEFAULT FALSE,
  is_protected BOOLEAN DEFAULT FALSE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_commit_at TIMESTAMPTZ,
  commit_message TEXT,
  author TEXT DEFAULT 'system',
  description TEXT,
  version_id TEXT REFERENCES versions(id) ON DELETE SET NULL,
  base_branch TEXT
);

CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);
CREATE INDEX IF NOT EXISTS idx_branches_is_main ON branches(is_main);
CREATE INDEX IF NOT EXISTS idx_branches_is_current ON branches(is_current);

-- Branch config
CREATE TABLE IF NOT EXISTS branch_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_branch TEXT NOT NULL DEFAULT 'main',
  protected_branches TEXT NOT NULL DEFAULT '["main","master","release/*"]',
  allow_force_push INTEGER NOT NULL DEFAULT 0,
  auto_cleanup_merged INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ Tasks (from memory Map) ============
CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  assigned_agent TEXT,
  parent_task_id TEXT,
  session_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  context_snapshot JSONB,
  tags TEXT[] DEFAULT '{}',
  max_retries INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  last_heartbeat TIMESTAMPTZ,
  result TEXT,
  version_id TEXT,
  subtask_ids JSONB DEFAULT '[]',
  depends_on JSONB DEFAULT '[]',
  blocking_tasks JSONB DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent);

-- ============ Messages / Message Queue (from memory Map) ============
CREATE TABLE IF NOT EXISTS messages (
  message_id TEXT PRIMARY KEY,
  queue_id TEXT,
  channel TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT '未知用户',
  role TEXT DEFAULT 'employee',
  role_weight INTEGER DEFAULT 3,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  urgency INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'queued',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  merged_into TEXT,
  merged_from JSONB DEFAULT '[]',
  preempted_by TEXT,
  file_info JSONB
);

CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ============ Import Tasks (from memory Map) ============
CREATE TABLE IF NOT EXISTS import_tasks (
  task_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  steps JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_tasks_status ON import_tasks(status);
CREATE INDEX IF NOT EXISTS idx_import_tasks_project ON import_tasks(project_id);

-- ============ Search History ============
CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'keyword',
  filters JSONB,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, created_at DESC);

-- ============ Download Tasks ============
CREATE TABLE IF NOT EXISTS download_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  file_ids TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  total_bytes INTEGER DEFAULT 0,
  downloaded_bytes INTEGER DEFAULT 0,
  zip_path TEXT,
  zip_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_download_tasks_user ON download_tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_tasks_status ON download_tasks(status);

-- ============ Bump History ============
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bump_history_version ON bump_history(version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bump_history_trigger ON bump_history(trigger_type, created_at DESC);

-- ============ Version Summaries ============
CREATE TABLE IF NOT EXISTS version_summaries (
  id TEXT PRIMARY KEY,
  version_id TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT,
  features TEXT,
  fixes TEXT,
  changes TEXT,
  breaking TEXT,
  changes_detail JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT,
  branch_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_version_summaries_version ON version_summaries(version_id);

-- ============ Rollback History ============
CREATE TABLE IF NOT EXISTS rollback_history (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  version_name TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('tag', 'branch', 'commit')),
  mode TEXT NOT NULL CHECK (mode IN ('revert', 'checkout')),
  previous_ref TEXT,
  new_branch TEXT,
  backup_created BOOLEAN DEFAULT FALSE,
  message TEXT,
  success BOOLEAN NOT NULL,
  error TEXT,
  performed_by TEXT DEFAULT 'developer',
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actor_id TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_rollback_history_version ON rollback_history(version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rollback_history_created ON rollback_history(created_at DESC);

-- ============ Audit Log ============
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT,
  target TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============ Screenshots ============
CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  message_id TEXT,
  message_content TEXT,
  sender_name TEXT,
  sender_avatar TEXT,
  screenshot_url TEXT NOT NULL,
  thumbnail_url TEXT,
  branch_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_screenshots_version ON screenshots(version_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_created ON screenshots(created_at DESC);

-- ============ Version Change Events ============
CREATE TABLE IF NOT EXISTS version_change_events (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  actor TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_version_change_events_version ON version_change_events(version_id);
CREATE INDEX IF NOT EXISTS idx_version_change_events_created ON version_change_events(created_at DESC);

-- ============ Users (from 20260324_001_create_users.sql) ============
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  weight INTEGER NOT NULL DEFAULT 0,
  wechat_id TEXT,
  feishu_id TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_wechat_id ON users(wechat_id);
CREATE INDEX IF NOT EXISTS idx_users_feishu_id ON users(feishu_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_id_unique ON users(wechat_id) WHERE wechat_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_feishu_id_unique ON users(feishu_id) WHERE feishu_id IS NOT NULL;

-- ============ Cron Jobs (from 20260324_002_create_cron_tables.sql) ============
CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cron TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'system',
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_run_output TEXT,
  last_run_error TEXT,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cron_runs (
  id TEXT PRIMARY KEY,
  cron_job_id TEXT NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  output TEXT,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_cron_job_id ON cron_runs(cron_job_id);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_status ON cron_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run_at ON cron_jobs(next_run_at) WHERE enabled = TRUE;

-- ============ Role Memory (from 20260324_003_create_role_memory_tables.sql) ============
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
