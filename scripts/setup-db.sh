#!/bin/bash
# ============================================================
# TeamClaw 数据库一键启动脚本
# 用法: ./scripts/setup-db.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# ── 颜色定义 ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}   $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_fail()  { echo -e "${RED}[FAIL]${NC} $*" >&2; }

# ── 0. 环境变量检查 ─────────────────────────────────────────
log_info "检查环境变量..."

# 加载 .env 文件（如果存在）
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source <(grep -v '^\s*#' "$PROJECT_DIR/.env" | grep -v '^\s*$')
  set +a
fi

DB_CONTAINER="${DB_CONTAINER:-teamclaw-postgres}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-teamclaw}}"
DB_USER="${DB_USER:-${POSTGRES_USER:-teamclaw}}"
DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-password}}"
DB_PORT="${DB_PORT:-5432}"

if [ -z "$DATABASE_URL" ]; then
  log_warn "DATABASE_URL 未设置，将使用默认值"
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
fi

# 验证关键变量
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
  log_fail "缺少必需的环境变量: DB_NAME 或 DB_USER"
  exit 1
fi
log_ok "环境变量检查通过"

# ── 1. Docker PostgreSQL 启动 ─────────────────────────────
log_info "启动 PostgreSQL 容器..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
  log_fail "Docker 未运行，请先启动 Docker Desktop"
  exit 1
fi

# 如果容器已存在但未运行，则启动
if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    log_ok "PostgreSQL 容器已在运行"
  else
    log_info "启动已有容器 ${DB_CONTAINER}..."
    docker start "$DB_CONTAINER"
    log_ok "容器已启动"
  fi
else
  log_info "创建并启动 PostgreSQL 容器..."
  docker run -d \
    --name "$DB_CONTAINER" \
    -e POSTGRES_DB="$DB_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_INITDB_ARGS="-c max_connections=200" \
    -p "${DB_PORT}:5432" \
    -v "${PROJECT_DIR}/scripts/db-init.sql:/docker-entrypoint-initdb.d/init.sql:ro" \
    postgres:16-alpine

  log_ok "容器已创建并启动（postgres:16-alpine）"
fi

# ── 2. 等待 PostgreSQL 就绪 ─────────────────────────────────
log_info "等待 PostgreSQL 就绪..."

RETRIES=30
for i in $(seq 1 $RETRIES); do
  if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -q 2>/dev/null; then
    log_ok "PostgreSQL 已就绪"
    break
  fi
  if [ "$i" -eq $RETRIES ]; then
    log_fail "PostgreSQL 连接超时（${RETRIES}s）"
    exit 1
  fi
  sleep 1
done

# ── 3. 初始化数据库（扩展 & 迁移）──────────────────────────
log_info "执行数据库初始化..."

# 3a. 运行 db-init.sql 中的扩展初始化（如 uuid-ossp、pg_trgm）
if [ -f "$PROJECT_DIR/scripts/db-init.sql" ]; then
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
    < "$PROJECT_DIR/scripts/db-init.sql" > /dev/null 2>&1 \
    && log_ok "数据库扩展初始化完成" \
    || log_warn "扩展初始化未执行（可能已存在）"
fi

# 3b. 执行迁移脚本
if [ -f "$PROJECT_DIR/server/src/db/migrations/run.ts" ]; then
  cd "$PROJECT_DIR"
  if npx tsx server/src/db/migrations/run.ts 2>/dev/null; then
    log_ok "数据库迁移完成"
  else
    log_warn "迁移脚本执行异常，请检查 server/src/db/migrations/ 目录"
  fi
fi

# ── 4. 验证 ─────────────────────────────────────────────────
log_info "验证数据库状态..."

TABLE_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
TABLE_COUNT=${TABLE_COUNT:-0}

if [ "$TABLE_COUNT" -gt 0 ]; then
  log_ok "数据库验证成功，当前公共表数量: ${TABLE_COUNT}"
else
  log_warn "未检测到公共表，可能迁移脚本不存在或 db-init.sql 路径有误"
fi

echo ""
log_ok "=========================================="
log_ok "  数据库搭建完成！"
log_ok "=========================================="
echo ""
echo -e "  连接地址: ${CYAN}${DATABASE_URL}${NC}"
echo -e "  容器名称: ${CYAN}${DB_CONTAINER}${NC}"
echo -e "  端口映射: ${CYAN}${DB_PORT}:5432${NC}"
echo ""
log_info "如需停止数据库，请运行: docker stop ${DB_CONTAINER}"
log_info "完全删除容器请运行: docker rm -f ${DB_CONTAINER}"
