-- Migration: 20260325_014_add_is_demo_columns
-- 为 tasks/versions/messages 表添加 is_demo 标记列，支持 Demo 数据独立管理
BEGIN;

-- tasks 表
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN tasks.is_demo IS '标记是否为 Demo 数据';

-- versions 表
ALTER TABLE versions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN versions.is_demo IS '标记是否为 Demo 数据';

-- messages 表
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN messages.is_demo IS '标记是否为 Demo 数据';

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_tasks_is_demo ON tasks(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_versions_is_demo ON versions(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_messages_is_demo ON messages(is_demo) WHERE is_demo = true;

COMMIT;
