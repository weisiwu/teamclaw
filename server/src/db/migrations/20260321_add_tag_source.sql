-- Migration: Add source field to tags table
-- Purpose: Distinguish between auto-created and manually-created tags
-- Issue: iter72-tag-display

-- Add source column to track tag creation method
ALTER TABLE tags ADD COLUMN source TEXT DEFAULT 'manual';
-- Values: 'auto' (created by system) | 'manual' (created by user)

-- Create index for source filtering
CREATE INDEX IF NOT EXISTS idx_tags_source ON tags(source);
