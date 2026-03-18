#!/bin/bash
# TeamClaw 数据库备份脚本
# 使用方式: ./scripts/backup.sh [--restore <backup_file>]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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

mkdir -p "$BACKUP_DIR"

echo "💾 TeamClaw 备份工具"
echo "===================="

backup_postgres() {
    local backup_file="$BACKUP_DIR/postgres_${TIMESTAMP}.sql"
    echo "📦 备份 PostgreSQL..."
    
    if docker exec teamclaw-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$backup_file" 2>/dev/null; then
        echo "✅ PostgreSQL 备份完成: $backup_file"
        gzip "$backup_file"
        echo "✅ 已压缩: ${backup_file}.gz"
    else
        echo "❌ PostgreSQL 备份失败"
        return 1
    fi
}

backup_redis() {
    local backup_file="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
    echo "📦 备份 Redis..."
    
    if docker exec teamclaw-redis redis-cli SAVE 2>/dev/null; then
        docker cp teamclaw-redis:/data/dump.rdb "$backup_file" 2>/dev/null
        if [ -f "$backup_file" ]; then
            echo "✅ Redis 备份完成: $backup_file"
            gzip "$backup_file"
            echo "✅ 已压缩: ${backup_file}.gz"
        else
            echo "⚠️ Redis 备份文件未找到"
        fi
    else
        echo "⚠️ Redis 备份失败"
    fi
}

backup_chromadb() {
    local backup_file="$BACKUP_DIR/chromadb_${TIMESTAMP}.tar.gz"
    echo "📦 备份 ChromaDB..."
    
    if docker exec teamclaw-chromadb tar -czf /tmp/chromadb_backup.tar.gz -C /chroma/chroma . 2>/dev/null; then
        docker cp teamclaw-chromadb:/tmp/chromadb_backup.tar.gz "$backup_file"
        echo "✅ ChromaDB 备份完成: $backup_file"
    else
        echo "⚠️ ChromaDB 备份失败"
    fi
}

restore_postgres() {
    local backup_file="$1"
    echo "📥 恢复 PostgreSQL from $backup_file..."
    
    if [ ! -f "$backup_file" ]; then
        echo "❌ 备份文件不存在: $backup_file"
        return 1
    fi
    
    # 解压如果需要
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | docker exec -i teamclaw-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    else
        cat "$backup_file" | docker exec -i teamclaw-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    fi
    echo "✅ PostgreSQL 恢复完成"
}

list_backups() {
    echo "📋 可用的备份文件:"
    ls -lh "$BACKUP_DIR" 2>/dev/null || echo "   无备份文件"
}

case "${1:-backup}" in
    backup)
        backup_postgres
        backup_redis
        backup_chromadb
        echo ""
        echo "✨ 所有备份完成!"
        echo "📁 备份目录: $BACKUP_DIR"
        ;;
    restore)
        if [ -z "$2" ]; then
            echo "❌ 请指定备份文件"
            echo "   用法: $0 restore <backup_file>"
            list_backups
            exit 1
        fi
        restore_postgres "$2"
        ;;
    list)
        list_backups
        ;;
    *)
        echo "用法: $0 {backup|restore <file>|list}"
        exit 1
        ;;
esac
