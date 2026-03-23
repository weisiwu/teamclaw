-- UP
-- Add missing columns to rollback_history table
ALTER TABLE rollback_history ADD COLUMN IF NOT EXISTS actor_id TEXT;
ALTER TABLE rollback_history ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add screenshots table
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
  created_by TEXT DEFAULT 'system',
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_screenshots_version ON screenshots(version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_message ON screenshots(message_id);

-- DOWN
ALTER TABLE rollback_history DROP COLUMN IF EXISTS actor_id;
ALTER TABLE rollback_history DROP COLUMN IF EXISTS metadata;
DROP TABLE IF EXISTS screenshots;
