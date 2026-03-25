#!/bin/bash
# ============================================================
# TeamClaw 数据库一键启动脚本
# 版本: 1.4.0（2026-03-26）
# 用法:
#   ./scripts/setup-db.sh              # 默认：启动 Docker DB 并初始化
#   ./scripts/setup-db.sh --external  # 连接外部已存在的数据库
#   ./scripts/setup-db.sh --reset     # 重置数据库（删除重建）
#   ./scripts/setup-db.sh --dry-run   # 预检模式（只检查不执行）
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

# ── 参数解析 ────────────────────────────────────────────────
MODE="docker"  # docker | external | reset
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --external) MODE="external" ;;
    --reset)    MODE="reset" ;;
    --dry-run)  DRY_RUN=true; MODE="dry-run" ;;
    --help|-h)
      echo "用法: $0 [--external|--reset|--dry-run]"
      echo "  （无参数）默认：启动 Docker DB 并初始化"
      echo "  --external  连接外部已存在的数据库（跳过 Docker）"
      echo "  --reset     重置数据库（删除重建）"
      echo "  --dry-run  预检模式：检查环境变量、Docker 状态，不执行写入操作"
      exit 0
      ;;
  esac
done

# ── 0. 环境变量加载 ─────────────────────────────────────────
log_info "加载环境变量..."

# 支持从 server/.env 和根目录 .env 加载
for env_file in "$PROJECT_DIR/server/.env" "$PROJECT_DIR/.env"; do
  if [ -f "$env_file" ]; then
    set -a
    source <(grep -v '^\s*#' "$env_file" | grep -v '^\s*$')
    set +a
    log_info "已加载: $env_file"
  fi
done

DB_CONTAINER="${DB_CONTAINER:-teamclaw-postgres}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-teamclaw}}"
DB_USER="${DB_USER:-${POSTGRES_USER:-teamclaw}}"
DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-password}}"
DB_PORT="${DB_PORT:-5432}"

if [ -z "$DATABASE_URL" ]; then
  log_warn "DATABASE_URL 未设置，使用默认值"
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
fi

# ── 0.1 DATABASE_URL 格式验证 ──────────────────────────────
_validate_url() {
  local url="$1"
  if ! echo "$url" | grep -qE '^postgresql://[^:]+:[^@]+@[^:]+:[0-9]+/[^/]+$'; then
    log_fail "DATABASE_URL 格式不正确：$url"
    log_fail "正确格式：postgresql://user:password@host:port/dbname"
    return 1
  fi
  log_ok "DATABASE_URL 格式验证通过"
  return 0
}

# --external 模式必须先验证 URL
if [ "$MODE" = "external" ]; then
  if ! _validate_url "$DATABASE_URL"; then
    log_fail "请检查 server/.env 中的 DATABASE_URL 配置"
    exit 1
  fi
fi

# 解析 DATABASE_URL 获取各组件（用于外部连接）
_parse_db_url() {
  # 格式: postgresql://user:password@host:port/dbname
  local url="$1"
  _DB_EXT_HOST="${url#*@}"
  _DB_EXT_HOST="${_DB_EXT_HOST%%:*}"
  _DB_EXT_PORT="${url#*:}"
  _DB_EXT_PORT="${_DB_EXT_PORT#*/}"
  _DB_EXT_PORT="${_DB_EXT_PORT%%/*}"
  _DB_EXT_DB="${url##*/}"
}

# ── 前置检查 ────────────────────────────────────────────────
_check_prereq() {
  log_info "检查前置条件..."

  if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    log_fail "缺少必需环境变量: DB_NAME=$DB_NAME 或 DB_USER=$DB_USER"
    log_fail "请先执行: cp server/.env.example server/.env"
    exit 1
  fi

  # 检查 psql 是否可用（外部模式必须）
  if [ "$MODE" = "external" ] && ! command -v psql &>/dev/null; then
    log_warn "psql 未安装，尝试用 docker exec 代替..."
    MODE="external-docker"
  fi

  log_ok "前置检查通过"
}

# ── 1. Docker PostgreSQL 启动 ─────────────────────────────
_start_docker_postgres() {
  log_info "启动 PostgreSQL（Docker 模式）..."

  if ! docker info > /dev/null 2>&1; then
    log_fail "Docker 未运行，请先启动 Docker Desktop"
    exit 1
  fi

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
}

# ── 2. 等待 PostgreSQL 就绪 ─────────────────────────────────
_wait_postgres() {
  local psql_cmd="${1:-docker exec}"
  log_info "等待 PostgreSQL 就绪..."

  local RETRIES=30
  for i in $(seq 1 $RETRIES); do
    if [ "$psql_cmd" = "docker exec" ]; then
      docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -q 2>/dev/null && ok=true || ok=false
    else
      $psql_cmd -U "$DB_USER" -d postgres -q 2>/dev/null && ok=true || ok=false
    fi

    if $ok; then
      log_ok "PostgreSQL 已就绪（${i}s）"
      return 0
    fi

    if [ "$i" -eq $RETRIES ]; then
      log_fail "PostgreSQL 连接超时（${RETRIES}s）"
      exit 1
    fi
    sleep 1
  done
}

# ── 3. 重置数据库（reset 模式） ────────────────────────────
_reset_db() {
  log_info "重置数据库..."
  local cmd="docker exec"
  if [ "$MODE" = "external" ]; then
    cmd="psql"
    _parse_db_url "$DATABASE_URL"
    DB_HOST="$_DB_EXT_HOST" DB_PORT="$_DB_EXT_PORT"
  fi

  if $cmd psql -U "$DB_USER" -d postgres -c "SELECT 1" &>/dev/null; then
    $cmd psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\"" &>/dev/null \
      && log_ok "旧数据库已删除" \
      || log_warn "删除旧数据库失败（可能不存在）"
    $cmd psql -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\"" \
      && log_ok "新数据库已创建" \
      || { log_fail "创建数据库失败"; exit 1; }
  else
    log_fail "无法连接到 PostgreSQL"
    exit 1
  fi
}

# ── 4. 初始化数据库（扩展 & 迁移）──────────────────────────
_init_db() {
  log_info "执行数据库初始化..."
  local cmd="docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME"
  local use_docker=true

  if [ "$MODE" = "external" ] || [ "$MODE" = "external-docker" ]; then
    use_docker=false
    if [ "$MODE" = "external-docker" ]; then
      cmd="docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME"
    else
      _parse_db_url "$DATABASE_URL"
      cmd="psql -h $_DB_EXT_HOST -p $_DB_EXT_PORT -U $DB_USER -d $DB_NAME"
    fi
  fi

  # 4a. 扩展初始化
  if [ -f "$PROJECT_DIR/scripts/db-init.sql" ]; then
    if $use_docker; then
      docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
        < "$PROJECT_DIR/scripts/db-init.sql" > /dev/null 2>&1 \
        && log_ok "扩展初始化完成" \
        || log_warn "扩展已存在，跳过"
    else
      $cmd < "$PROJECT_DIR/scripts/db-init.sql" > /dev/null 2>&1 \
        && log_ok "扩展初始化完成" \
        || log_warn "扩展已存在，跳过"
    fi
  fi

  # 4b. 运行迁移
  if [ -f "$PROJECT_DIR/server/src/db/migrations/run.ts" ]; then
    cd "$PROJECT_DIR"
    if npx tsx server/src/db/migrations/run.ts 2>&1 | tee /tmp/migration.log; then
      log_ok "数据库迁移完成"
    else
      log_warn "迁移有警告，请检查 /tmp/migration.log"
    fi
  fi
}

# ── 5. 验证 ─────────────────────────────────────────────────
_verify() {
  log_info "验证数据库状态..."
  local cmd="docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME"
  local count

  if [ "$MODE" = "external" ]; then
    _parse_db_url "$DATABASE_URL"
    cmd="psql -h $_DB_EXT_HOST -p $_DB_EXT_PORT -U $DB_USER -d $DB_NAME"
  elif [ "$MODE" = "external-docker" ]; then
    cmd="docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME"
  fi

  count=$($cmd -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ' || echo "0")

  if [ "${count:-0}" -gt 0 ]; then
    log_ok "数据库验证成功：${count} 张公共表"
  else
    log_warn "未检测到公共表，迁移可能未执行"
  fi
}

# ── 主流程 ──────────────────────────────────────────────────
main() {
  echo ""
  log_info "=========================================="
  log_info "  TeamClaw 数据库初始化脚本"
  log_info "  模式: $MODE"
  log_info "=========================================="
  echo ""

  _check_prereq

  case "$MODE" in
    docker|reset)
      _start_docker_postgres
      _wait_postgres
      ;;
    external|external-docker)
      log_info "使用外部 PostgreSQL: $DATABASE_URL"
      _wait_postgres "$([ "$MODE" = "external" ] && echo "psql" || echo "docker exec")"
      ;;
    dry-run)
      log_info "=== 预检模式（Dry Run）==="
      _check_prereq
      log_ok "环境检查通过"
      log_info "DATABASE_URL: $DATABASE_URL"
      log_info "DB_NAME: $DB_NAME"
      log_info "DB_USER: $DB_USER"
      log_info "DB_HOST: ${_DB_EXT_HOST:-localhost}"
      log_info "DB_PORT: ${_DB_EXT_PORT:-5432}"
      echo ""
      log_ok "预检完成，所有检查通过（未执行任何写入操作）"
      exit 0
      ;;
  esac

  if [ "$MODE" = "reset" ]; then
    _reset_db
  fi

  _init_db
  _verify

  echo ""
  log_ok "=========================================="
  log_ok "  数据库初始化完成！"
  log_ok "=========================================="
  echo ""
  echo -e "  连接地址: ${CYAN}${DATABASE_URL}${NC}"
  [ "$MODE" != "external" ] && echo -e "  容器名称: ${CYAN}${DB_CONTAINER}${NC}"
  echo ""
  [ "$MODE" = "docker" ] && log_info "停止 DB: docker stop $DB_CONTAINER"
  [ "$MODE" = "docker" ] && log_info "删除容器: docker rm -f $DB_CONTAINER"
}

main
