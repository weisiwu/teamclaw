#!/bin/bash
# ============================================================
# TeamClaw 开发环境一键启动脚本
#
# 使用方式:
#   ./scripts/dev.sh              # 启动全部服务（Docker + 后端 + 前端）
#   ./scripts/dev.sh --skip-docker # 跳过 Docker（已有外部数据库/Redis）
#   ./scripts/dev.sh --backend     # 仅启动后端
#   ./scripts/dev.sh --frontend    # 仅启动前端
#   ./scripts/dev.sh --install     # 仅安装依赖，不启动服务
#   ./scripts/dev.sh --status      # 查看服务状态
#   ./scripts/dev.sh --stop        # 停止所有服务
# ============================================================

set -e

# ── 路径 ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$PROJECT_ROOT/server"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/.pids"

# ── 颜色 ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $1"; }

# ── 参数解析 ──────────────────────────────────────────────────
SKIP_DOCKER=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
INSTALL_ONLY=false
SHOW_STATUS=false
DO_STOP=false

for arg in "$@"; do
  case $arg in
    --skip-docker) SKIP_DOCKER=true ;;
    --backend)     BACKEND_ONLY=true ;;
    --frontend)    FRONTEND_ONLY=true ;;
    --install)     INSTALL_ONLY=true ;;
    --status)      SHOW_STATUS=true ;;
    --stop)        DO_STOP=true ;;
    --help|-h)
      echo "用法: ./scripts/dev.sh [选项]"
      echo ""
      echo "选项:"
      echo "  --skip-docker  跳过 Docker 服务启动"
      echo "  --backend      仅启动后端服务"
      echo "  --frontend     仅启动前端服务"
      echo "  --install      仅安装依赖"
      echo "  --status       查看所有服务状态"
      echo "  --stop         停止所有服务"
      echo "  --help, -h     显示帮助"
      exit 0
      ;;
    *)
      warn "未知参数: $arg（使用 --help 查看用法）"
      ;;
  esac
done

# ── 初始化目录 ────────────────────────────────────────────────
mkdir -p "$LOG_DIR" "$PID_DIR"

# ── 停止所有服务 ──────────────────────────────────────────────
stop_all() {
  info "正在停止所有服务..."

  # 停止前端
  if [ -f "$PID_DIR/frontend.pid" ]; then
    FPID=$(cat "$PID_DIR/frontend.pid" 2>/dev/null)
    if [ -n "$FPID" ] && kill -0 "$FPID" 2>/dev/null; then
      kill "$FPID" 2>/dev/null && success "前端服务已停止 (PID: $FPID)"
    fi
    rm -f "$PID_DIR/frontend.pid"
  fi

  # 停止后端
  if [ -f "$PID_DIR/backend.pid" ]; then
    BPID=$(cat "$PID_DIR/backend.pid" 2>/dev/null)
    if [ -n "$BPID" ] && kill -0 "$BPID" 2>/dev/null; then
      kill "$BPID" 2>/dev/null && success "后端服务已停止 (PID: $BPID)"
    fi
    rm -f "$PID_DIR/backend.pid"
  fi

  # 停止 Docker
  cd "$PROJECT_ROOT"
  if command -v docker &> /dev/null; then
    if [ -f "docker-compose.yml" ]; then
      docker compose down 2>/dev/null && success "Docker 服务已停止"
    fi
  fi

  success "所有服务已停止"
}

# ── --stop 模式 ───────────────────────────────────────────────
if [ "$DO_STOP" = true ]; then
  stop_all
  exit 0
fi

# ── --status 模式 ─────────────────────────────────────────────
if [ "$SHOW_STATUS" = true ]; then
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════${NC}"
  echo -e "${CYAN}       TeamClaw 服务状态${NC}"
  echo -e "${CYAN}═══════════════════════════════════════${NC}"

  # 前端
  if [ -f "$PID_DIR/frontend.pid" ] && kill -0 "$(cat "$PID_DIR/frontend.pid" 2>/dev/null)" 2>/dev/null; then
    success "前端 (Next.js)      http://localhost:3000   PID: $(cat "$PID_DIR/frontend.pid")"
  else
    fail "前端 (Next.js)      未运行"
  fi

  # 后端
  if [ -f "$PID_DIR/backend.pid" ] && kill -0 "$(cat "$PID_DIR/backend.pid" 2>/dev/null)" 2>/dev/null; then
    success "后端 (Express)      http://localhost:9700   PID: $(cat "$PID_DIR/backend.pid")"
  else
    fail "后端 (Express)      未运行"
  fi

  # Docker 服务
  if command -v docker &> /dev/null; then
    for svc in teamclaw-postgres teamclaw-redis teamclaw-chroma; do
      if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${svc}$"; then
        success "$svc   运行中"
      else
        fail "$svc   未运行"
      fi
    done
  else
    warn "Docker 未安装，无法检查基础服务"
  fi

  echo ""
  exit 0
fi

# ── 信号捕获（Ctrl+C 优雅退出）────────────────────────────────
cleanup() {
  echo ""
  info "收到中断信号，正在清理..."
  stop_all
  exit 0
}
trap cleanup SIGINT SIGTERM

# ============================================================
# 开始启动
# ============================================================

echo ""
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}    TeamClaw 开发环境启动${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo ""

cd "$PROJECT_ROOT"

# ── Step 1: 环境检查 ──────────────────────────────────────────
info "检查运行环境..."

# Node.js
if ! command -v node &> /dev/null; then
  fail "Node.js 未安装。请安装 Node.js 18+ (https://nodejs.org)"
  exit 1
fi
NODE_VER=$(node -v)
success "Node.js $NODE_VER"

# npm
if ! command -v npm &> /dev/null; then
  fail "npm 未安装"
  exit 1
fi
success "npm $(npm -v)"

# Docker (可选)
if command -v docker &> /dev/null; then
  success "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
else
  warn "Docker 未安装 — 需要手动启动 PostgreSQL、Redis、ChromaDB"
  SKIP_DOCKER=true
fi

echo ""

# ── Step 2: 环境变量 ──────────────────────────────────────────
info "检查环境变量..."

if [ ! -f "$PROJECT_ROOT/.env" ]; then
  if [ -f "$PROJECT_ROOT/.env.example" ]; then
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    success "已从 .env.example 创建 .env（请检查并填写 API Keys）"
  else
    warn ".env 文件不存在，部分功能可能不可用"
  fi
else
  success ".env 文件已存在"
fi

echo ""

# ── Step 3: 安装依赖 ──────────────────────────────────────────
info "检查依赖..."

# 前端依赖
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  info "安装前端依赖..."
  npm install --prefix "$PROJECT_ROOT" 2>&1 | tail -1
  success "前端依赖安装完成"
else
  success "前端依赖已安装"
fi

# 后端依赖
if [ ! -d "$SERVER_DIR/node_modules" ]; then
  info "安装后端依赖..."
  npm install --prefix "$SERVER_DIR" 2>&1 | tail -1
  success "后端依赖安装完成"
else
  success "后端依赖已安装"
fi

echo ""

# --install 模式到此结束
if [ "$INSTALL_ONLY" = true ]; then
  success "依赖安装完成"
  exit 0
fi

# ── Step 4: Docker 基础服务 ───────────────────────────────────
if [ "$SKIP_DOCKER" = false ] && [ "$FRONTEND_ONLY" = false ]; then
  info "启动 Docker 基础服务（PostgreSQL、Redis、ChromaDB）..."

  # 只启动基础设施服务，不启动 frontend/server 容器
  docker compose up -d postgres redis chroma 2>&1 | tail -3
  success "Docker 容器已启动"

  # 等待 PostgreSQL 就绪
  info "等待 PostgreSQL 就绪..."
  RETRIES=0
  MAX_RETRIES=30
  while [ $RETRIES -lt $MAX_RETRIES ]; do
    if docker exec teamclaw-postgres pg_isready -U teamclaw -q 2>/dev/null; then
      success "PostgreSQL 已就绪"
      break
    fi
    RETRIES=$((RETRIES + 1))
    sleep 1
  done
  if [ $RETRIES -eq $MAX_RETRIES ]; then
    warn "PostgreSQL 启动超时，后端可能连接失败"
  fi

  # 等待 Redis 就绪
  info "等待 Redis 就绪..."
  RETRIES=0
  while [ $RETRIES -lt $MAX_RETRIES ]; do
    if docker exec teamclaw-redis redis-cli ping 2>/dev/null | grep -q PONG; then
      success "Redis 已就绪"
      break
    fi
    RETRIES=$((RETRIES + 1))
    sleep 1
  done
  if [ $RETRIES -eq $MAX_RETRIES ]; then
    warn "Redis 启动超时"
  fi

  # 等待 ChromaDB 就绪
  info "等待 ChromaDB 就绪..."
  RETRIES=0
  while [ $RETRIES -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
      success "ChromaDB 已就绪"
      break
    fi
    RETRIES=$((RETRIES + 1))
    sleep 1
  done
  if [ $RETRIES -eq $MAX_RETRIES ]; then
    warn "ChromaDB 启动超时"
  fi

  # 数据库迁移由后端 server 启动时自动执行（index.ts → runMigrations）
  # 如需手动执行：./scripts/db-init.sh

  echo ""
fi

# ── Step 5: 加载 .env ─────────────────────────────────────────
if [ -f "$PROJECT_ROOT/.env" ]; then
  info "加载环境变量..."
  set -a
  source <(grep -v '^\s*#' "$PROJECT_ROOT/.env" | grep -v '^\s*$')
  set +a
  success ".env 已加载"
fi

# ── Step 6: 启动后端 ──────────────────────────────────────────
if [ "$FRONTEND_ONLY" = false ]; then
  info "启动后端服务 (Express :9700)..."

  # 检查端口是否被占用
  if lsof -i :9700 -sTCP:LISTEN > /dev/null 2>&1; then
    warn "端口 9700 已被占用，跳过后端启动"
    EXISTING_PID=$(lsof -ti :9700 -sTCP:LISTEN 2>/dev/null | head -1)
    echo "$EXISTING_PID" > "$PID_DIR/backend.pid"
    success "使用已有后端进程 (PID: $EXISTING_PID)"
  else
    # 从项目根目录启动后端（确保 .env 路径正确）
    cd "$PROJECT_ROOT"
    npx tsx watch server/src/index.ts > "$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "$PID_DIR/backend.pid"

    # 等待后端启动
    RETRIES=0
    while [ $RETRIES -lt 15 ]; do
      if curl -sf http://localhost:9700/api/v1/health > /dev/null 2>&1; then
        success "后端服务已启动 (PID: $BACKEND_PID)"
        break
      fi
      # 检查进程是否还活着
      if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        fail "后端服务启动失败，查看日志: $LOG_DIR/backend.log"
        tail -5 "$LOG_DIR/backend.log" 2>/dev/null
        break
      fi
      RETRIES=$((RETRIES + 1))
      sleep 1
    done
    if [ $RETRIES -eq 15 ]; then
      warn "后端启动较慢，可查看日志: $LOG_DIR/backend.log"
    fi
  fi

  echo ""
fi

# ── Step 6: 启动前端 ──────────────────────────────────────────
if [ "$BACKEND_ONLY" = false ]; then
  info "启动前端服务 (Next.js :3000)..."

  # 检查端口是否被占用
  if lsof -i :3000 -sTCP:LISTEN > /dev/null 2>&1; then
    warn "端口 3000 已被占用，跳过前端启动"
    EXISTING_PID=$(lsof -ti :3000 -sTCP:LISTEN 2>/dev/null | head -1)
    echo "$EXISTING_PID" > "$PID_DIR/frontend.pid"
    success "使用已有前端进程 (PID: $EXISTING_PID)"
  else
    cd "$PROJECT_ROOT"
    npx next dev > "$LOG_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "$PID_DIR/frontend.pid"

    # 等待前端启动
    RETRIES=0
    while [ $RETRIES -lt 20 ]; do
      if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        success "前端服务已启动 (PID: $FRONTEND_PID)"
        break
      fi
      if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
        fail "前端服务启动失败，查看日志: $LOG_DIR/frontend.log"
        tail -5 "$LOG_DIR/frontend.log" 2>/dev/null
        break
      fi
      RETRIES=$((RETRIES + 1))
      sleep 1
    done
    if [ $RETRIES -eq 20 ]; then
      warn "前端启动较慢，可查看日志: $LOG_DIR/frontend.log"
    fi
  fi

  echo ""
fi

# ── 启动完成 ──────────────────────────────────────────────────
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✨ TeamClaw 开发环境启动完成${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo ""

if [ "$BACKEND_ONLY" = false ]; then
  echo -e "  ${BLUE}前端${NC}     http://localhost:3000"
fi
if [ "$FRONTEND_ONLY" = false ]; then
  echo -e "  ${BLUE}后端 API${NC} http://localhost:9700"
  echo -e "  ${BLUE}健康检查${NC} http://localhost:9700/api/v1/health"
fi

echo ""
echo -e "  ${YELLOW}日志目录${NC}   $LOG_DIR/"
echo -e "  ${YELLOW}查看状态${NC}   ./scripts/dev.sh --status"
echo -e "  ${YELLOW}停止服务${NC}   ./scripts/dev.sh --stop  或  Ctrl+C"
echo ""

# 等待子进程（阻塞直到 Ctrl+C）
wait
