-- Version change events table - records all version-related changes
CREATE TABLE IF NOT EXISTS version_change_events (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'version_created',
    'version_published',
    'version_rollback',
    'version_archived',
    'screenshot_linked',
    'screenshot_removed',
    'changelog_generated',
    'changelog_updated',
    'bump_executed',
    'tag_created',
    'build_triggered',
    'build_completed',
    'manual_note'
  )),
  title TEXT NOT NULL,
  description TEXT,
  actor TEXT DEFAULT 'system',
  actor_id TEXT,
  screenshot_id TEXT,
  changelog_id TEXT,
  build_id TEXT,
  task_id TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_version_events_version ON version_change_events(version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_version_events_type ON version_change_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_version_events_actor ON version_change_events(actor_id, created_at DESC);

-- Migrate screenshots table from JSON to SQLite (append-only, existing data preserved)
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
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT 'system',
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_screenshots_version ON screenshots(version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_message ON screenshots(message_id);

-- Version changelog entries table
CREATE TABLE IF NOT EXISTS version_changelog_entries (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  event_id TEXT,
  features TEXT,
  fixes TEXT,
  improvements TEXT,
  breaking TEXT,
  docs TEXT,
  raw_commits TEXT,
  generated_by TEXT DEFAULT 'ai',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES version_change_events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_changelog_entries_version ON version_changelog_entries(version_id, created_at DESC);
