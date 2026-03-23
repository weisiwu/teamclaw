#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

# 加载环境变量
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

mkdir -p "$BACKUP_DIR"

echo "========== TeamClaw 数据备份 =========="
echo "备份目录：$BACKUP_DIR"

# 1. PostgreSQL 备份
echo "[1/3] 备份 PostgreSQL..."
pg_dump -h "${POSTGRES_HOST:-localhost}" \
        -p "${POSTGRES_PORT:-5432}" \
        -U "${POSTGRES_USER:-teamclaw}" \
        "${POSTGRES_DB:-teamclaw}" > "$BACKUP_DIR/postgres.sql"
echo "✅ PostgreSQL 备份完成 ($(du -h "$BACKUP_DIR/postgres.sql" | cut -f1))"

# 2. Redis 备份
echo "[2/3] 备份 Redis..."
redis-cli -h "${REDIS_HOST:-localhost}" \
          -p "${REDIS_PORT:-6379}" \
          --rdb "$BACKUP_DIR/redis.rdb" 2>/dev/null || echo "⚠️ Redis 备份跳过（可能未运行）"

# 3. SQLite 备份（如果存在）
echo "[3/3] 备份本地数据..."
if [ -d "$PROJECT_DIR/data" ]; then
  cp -r "$PROJECT_DIR/data" "$BACKUP_DIR/data"
  echo "✅ 本地数据备份完成"
fi

# 4. 压缩
echo "压缩备份..."
cd "$(dirname "$BACKUP_DIR")"
tar -czf "$(basename "$BACKUP_DIR").tar.gz" "$(basename "$BACKUP_DIR")"
rm -rf "$BACKUP_DIR"
echo "✅ 备份完成：$(dirname "$BACKUP_DIR")/$(basename "$BACKUP_DIR").tar.gz"

# 5. 清理旧备份（保留最近 7 个）
echo "清理旧备份..."
ls -t "$PROJECT_DIR/backups/"*.tar.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
echo "========== 备份完成 =========="
