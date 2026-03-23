#!/bin/bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "用法：$0 <备份文件.tar.gz>"
  exit 1
fi

BACKUP_FILE="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEMP_DIR="$PROJECT_DIR/backups/_restore_tmp"

# 加载环境变量
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

echo "========== TeamClaw 数据恢复 =========="
echo "备份文件：$BACKUP_FILE"
echo "⚠️ 此操作将覆盖当前数据，是否继续？(y/N)"
read -r confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "已取消"
  exit 0
fi

# 解压
mkdir -p "$TEMP_DIR"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
RESTORE_DIR=$(ls "$TEMP_DIR")

# 恢复 PostgreSQL
if [ -f "$TEMP_DIR/$RESTORE_DIR/postgres.sql" ]; then
  echo "[1/3] 恢复 PostgreSQL..."
  psql -h "${POSTGRES_HOST:-localhost}" \
       -p "${POSTGRES_PORT:-5432}" \
       -U "${POSTGRES_USER:-teamclaw}" \
       "${POSTGRES_DB:-teamclaw}" < "$TEMP_DIR/$RESTORE_DIR/postgres.sql"
  echo "✅ PostgreSQL 恢复完成"
fi

# 恢复本地数据
if [ -d "$TEMP_DIR/$RESTORE_DIR/data" ]; then
  echo "[2/3] 恢复本地数据..."
  cp -r "$TEMP_DIR/$RESTORE_DIR/data" "$PROJECT_DIR/"
  echo "✅ 本地数据恢复完成"
fi

# 清理
rm -rf "$TEMP_DIR"
echo "========== 恢复完成 =========="
