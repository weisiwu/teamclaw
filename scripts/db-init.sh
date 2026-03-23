#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 加载环境变量
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-teamclaw}"
DB_USER="${POSTGRES_USER:-teamclaw}"

echo "========== 数据库初始化 =========="
echo "目标：$DB_HOST:$DB_PORT/$DB_NAME"

# 1. 等待 PostgreSQL 就绪
echo "[1/3] 等待 PostgreSQL..."
for i in $(seq 1 30); do
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    echo "✅ PostgreSQL 就绪"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ PostgreSQL 连接超时"
    exit 1
  fi
  sleep 1
done

# 2. 执行迁移
echo "[2/3] 执行数据库迁移..."
cd "$PROJECT_DIR"
npx tsx server/src/db/migrations/run.ts
echo "✅ 迁移完成"

# 3. 验证
echo "[3/3] 验证表结构..."
TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
echo "✅ 当前表数量：$TABLES"

echo "========== 初始化完成 =========="
