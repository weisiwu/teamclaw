-- Migration: 20260324_001_create_users.sql
-- Description: Create users table for persistent user storage (replaces in-memory Map in userService.ts)
-- Fixes: BUG-05 内存Map存储重启全丢

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,              -- External ID (WeChat/Feishu)
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  weight INTEGER NOT NULL DEFAULT 0,
  wechat_id TEXT,
  feishu_id TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_wechat_id ON users(wechat_id);
CREATE INDEX IF NOT EXISTS idx_users_feishu_id ON users(feishu_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Unique constraint on external IDs (allow NULL for users without external ID)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_id_unique ON users(wechat_id) WHERE wechat_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_feishu_id_unique ON users(feishu_id) WHERE feishu_id IS NOT NULL;
