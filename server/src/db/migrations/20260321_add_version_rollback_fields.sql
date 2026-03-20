-- Migration: Add rollback tracking fields to versions table
-- Purpose: Track rollback count and last rollback time per version
-- Issue: iter75-version-rollback

-- Add rollback_count column (default 0)
ALTER TABLE versions ADD COLUMN rollback_count INTEGER DEFAULT 0;

-- Add last_rollback_at column (ISO timestamp)
ALTER TABLE versions ADD COLUMN last_rollback_at TEXT;

-- Create index for querying versions by rollback activity
CREATE INDEX IF NOT EXISTS idx_versions_rollback ON versions(rollback_count, last_rollback_at);
