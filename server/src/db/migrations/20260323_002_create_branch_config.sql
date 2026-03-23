-- UP
CREATE TABLE IF NOT EXISTS branch_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_branch TEXT NOT NULL DEFAULT 'main',
  protected_branches TEXT NOT NULL DEFAULT '["main","master","release/*"]',
  allow_force_push INTEGER NOT NULL DEFAULT 0,
  auto_cleanup_merged INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO branch_config (id, default_branch) VALUES (1, 'main')
  ON CONFLICT (id) DO NOTHING;

-- DOWN
DROP TABLE IF EXISTS branch_config;
