-- UP
CREATE TABLE IF NOT EXISTS version_change_events (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'version_created', 'version_published', 'version_rollback', 'version_archived',
    'screenshot_linked', 'screenshot_removed', 'changelog_generated', 'changelog_updated',
    'bump_executed', 'tag_created', 'build_triggered', 'build_completed', 'manual_note'
  )),
  title TEXT NOT NULL,
  description TEXT,
  actor TEXT DEFAULT 'system',
  actor_id TEXT,
  screenshot_id TEXT,
  changelog_id TEXT,
  build_id TEXT,
  task_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_version_events_version ON version_change_events(version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_version_events_type ON version_change_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_version_events_actor ON version_change_events(actor_id, created_at DESC);

-- DOWN
DROP TABLE IF EXISTS version_change_events;
