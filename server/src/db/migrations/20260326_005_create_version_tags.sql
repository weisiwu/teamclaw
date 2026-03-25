-- Migration: Create version_tags junction table
-- Many-to-many relationship between versions and tags

CREATE TABLE IF NOT EXISTS version_tags (
  version_id  VARCHAR(64) REFERENCES versions(id) ON DELETE CASCADE,
  tag_id      VARCHAR(64) REFERENCES tags(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (version_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_version_tags_version ON version_tags(version_id);
CREATE INDEX IF NOT EXISTS idx_version_tags_tag    ON version_tags(tag_id);
