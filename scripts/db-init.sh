#!/bin/bash
# TeamClaw 数据库初始化脚本
# 使用方式: ./scripts/db-init.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SQL_FILE="$PROJECT_ROOT/server/migrations/001_init.sql"

# 加载环境变量
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

# 默认值
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-teamclaw}"
POSTGRES_USER="${POSTGRES_USER:-teamclaw}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-teamclaw}"

echo "🗄️ 初始化 TeamClaw 数据库..."
echo "   Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "   Database: $POSTGRES_DB"
echo "   User: $POSTGRES_USER"

# 检查 PostgreSQL 连接
if command -v psql &> /dev/null; then
    echo "🔌 检查 PostgreSQL 连接..."
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c "\q" 2>/dev/null; then
        echo "✅ PostgreSQL 连接成功"
    else
        echo "⚠️ 无法连接 PostgreSQL，尝试通过 Docker..."
        docker exec teamclaw-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\q" 2>/dev/null || echo "⚠️ PostgreSQL 未就绪"
    fi
else
    echo "⚠️ psql 未安装，尝试通过 Docker 执行..."
fi

# 创建数据库（如果不存在）
echo "📋 创建数据库..."
if command -v docker &> /dev/null; then
    docker exec teamclaw-postgres psql -U "$POSTGRES_USER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$POSTGRES_DB'" 2>/dev/null | grep -q 1 || \
    docker exec teamclaw-postgres psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $POSTGRES_DB" 2>/dev/null
    echo "✅ 数据库检查完成"
fi

# 执行迁移脚本
if [ -f "$SQL_FILE" ]; then
    echo "📜 执行迁移脚本: $SQL_FILE"
    if command -v docker &> /dev/null; then
        cat "$SQL_FILE" | docker exec -i teamclaw-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
        echo "✅ 迁移脚本执行完成"
    fi
else
    echo "⚠️ 迁移文件不存在: $SQL_FILE"
    echo "📜 创建 migrations 目录和基础 SQL..."
    mkdir -p "$PROJECT_ROOT/server/migrations"
fi

echo "✨ 数据库初始化完成!"
