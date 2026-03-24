#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 加载环境变量
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source <(grep -v '^\s*#' "$PROJECT_DIR/.env" | grep -v '^\s*$')
  set +a
fi

DB_CONTAINER="${DB_CONTAINER:-teamclaw-postgres}"
DB_NAME="${POSTGRES_DB:-teamclaw}"
DB_USER="${POSTGRES_USER:-teamclaw}"

echo "========== 数据库初始化 =========="

# 1. 等待 PostgreSQL 就绪（通过 docker exec，无需本地 pg_isready）
echo "[1/3] 等待 PostgreSQL..."
for i in $(seq 1 30); do
  if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -q 2>/dev/null; then
    echo "✅ PostgreSQL 就绪"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ PostgreSQL 连接超时"
    exit 1
  fi
  sleep 1
done

# 2. 执行迁移（run.ts 现在支持直接执行）
echo "[2/3] 执行数据库迁移..."
cd "$PROJECT_DIR"
npx tsx server/src/db/migrations/run.ts
echo "✅ 迁移完成"

# 3. 验证（通过 docker exec，无需本地 psql）
echo "[3/3] 验证表结构..."
TABLES=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
echo "✅ 当前表数量：$TABLES"

echo "========== 初始化完成 =========="
