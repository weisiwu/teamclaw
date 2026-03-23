-- UP
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

-- DOWN
DROP TABLE IF EXISTS download_tasks;
