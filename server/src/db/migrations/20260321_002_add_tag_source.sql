-- UP
-- Add source column to distinguish auto-created vs manually-created tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- DOWN
ALTER TABLE tags DROP COLUMN IF EXISTS source;
