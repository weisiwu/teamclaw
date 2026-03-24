-- Migration: Create tools table
-- Stores Agent Tool definitions

CREATE TABLE IF NOT EXISTS tools (
  id              VARCHAR(64) PRIMARY KEY,
  name            VARCHAR(64) NOT NULL UNIQUE,
  display_name    VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  category        VARCHAR(16) NOT NULL CHECK (category IN ('file', 'git', 'shell', 'api', 'browser', 'custom')),
  source          VARCHAR(16) NOT NULL DEFAULT 'user' CHECK (source IN ('builtin', 'user', 'imported')),
  enabled         INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  parameters      JSON NOT NULL DEFAULT '[]',
  output_schema   TEXT,
  risk_level      VARCHAR(8) NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  requires_approval INTEGER NOT NULL DEFAULT 0 CHECK (requires_approval IN (0, 1)),
  timeout         INTEGER,
  max_retries     INTEGER,
  version         VARCHAR(16) NOT NULL DEFAULT '1.0.0',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      VARCHAR(64)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_tools_source ON tools(source);
CREATE INDEX IF NOT EXISTS idx_tools_enabled ON tools(enabled);
CREATE INDEX IF NOT EXISTS idx_tools_risk_level ON tools(risk_level);
