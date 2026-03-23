#!/bin/bash
# 数据库种子数据脚本 — 仅开发环境使用
# 用法: ./scripts/db-seed.sh
#
# 功能：为开发环境插入初始测试数据（幂等操作）
# 原则：ON CONFLICT DO NOTHING，仅新增不覆盖已有数据

set -e

# Database connection settings from environment or defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-teamclaw}"
DB_USER="${DB_USER:-teamclaw}"
DB_PASSWORD="${DB_PASSWORD:-teamclaw}"

export PGPASSWORD="$DB_PASSWORD"

echo "🌱 开始插入种子数据..."
echo "   数据库: $DB_HOST:$DB_PORT/$DB_NAME"
echo "   用户: $DB_USER"

# Insert seed users
echo "📦 插入用户种子数据..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
-- 插入开发环境初始用户（幂等）
INSERT INTO users (user_id, name, role, weight, wechat_id, feishu_id, remark, created_at)
VALUES
  ('user_001', '卫思伍', 'admin', 10, 'wxid_weisiwu', 'ou_da6b48690e83a478e3e3993ecc62da0e', '项目创始人', NOW()),
  ('user_002', '张三', 'vice_admin', 8, 'wxid_zhangsan', NULL, '技术负责人', NOW()),
  ('user_003', '李四', 'member', 5, 'wxid_lisi', NULL, '开发工程师', NOW())
ON CONFLICT (user_id) DO NOTHING;
SQL

echo "✅ 种子数据插入完成（仅新增，不覆盖已有数据）"
echo ""
echo "💡 提示：生产环境请勿运行此脚本"
