-- Migration: Create skills table
-- Stores Agent Skill (knowledge base) documents

CREATE TABLE IF NOT EXISTS skills (
  id              VARCHAR(64) PRIMARY KEY,
  name            VARCHAR(64) NOT NULL UNIQUE,
  display_name    VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  category        VARCHAR(16) NOT NULL CHECK (category IN ('build', 'deploy', 'test', 'structure', 'coding', 'review', 'custom')),
  source          VARCHAR(16) NOT NULL DEFAULT 'user' CHECK (source IN ('generated', 'user', 'imported')),
  content         TEXT NOT NULL,
  file_path       TEXT,
  applicable_agents JSON NOT NULL DEFAULT '[]',
  enabled         INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  tags            JSON NOT NULL DEFAULT '[]',
  version         VARCHAR(16) NOT NULL DEFAULT '1.0.0',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      VARCHAR(64),
  project_id      VARCHAR(64)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_source ON skills(source);
CREATE INDEX IF NOT EXISTS idx_skills_enabled ON skills(enabled);
CREATE INDEX IF NOT EXISTS idx_skills_project_id ON skills(project_id);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);

-- Full text search index on content (if using PostgreSQL)
-- CREATE INDEX IF NOT EXISTS idx_skills_content_fts ON skills USING gin(to_tsvector('english', content));
