#!/bin/bash
# ============================================================
# TeamClaw Production Deploy Script
# Usage: ./scripts/deploy.sh [--production]
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV=${1:-production}

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Pre-flight checks ────────────────────────────────────────
log_info "Starting deployment (env=$ENV)..."

if [ ! -f ".env.$ENV" ] && [ ! -f ".env" ]; then
    log_warn "No .env file found. Copy .env.production.example to .env.$ENV"
fi

# Validate required tools
for cmd in docker docker-compose git; do
    if ! command -v $cmd &> /dev/null; then
        log_error "$cmd not found. Please install $cmd first."
        exit 1
    fi
done

# ── Git pull / archive ───────────────────────────────────────
if [ -d ".git" ]; then
    log_info "Checking git status..."
    CURRENT_BRANCH=$(git branch --show-current)
    log_info "Current branch: $CURRENT_BRANCH"
    
    if [ "$CURRENT_BRANCH" == "main" ]; then
        read -p "Deploying from main branch. Continue? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled."
            exit 0
        fi
    fi
fi

# ── Build & start ───────────────────────────────────────────
log_info "Building Docker images..."
docker-compose build --parallel

log_info "Starting services..."
docker-compose up -d

# ── Health check ────────────────────────────────────────────
log_info "Waiting for services to be healthy..."
MAX_WAIT=60
WAITED=0
INTERVAL=5

while [ $WAITED -lt $MAX_WAIT ]; do
    SERVER_HEALTH=$(curl -sf http://localhost:9700/api/v1/health 2>/dev/null && echo "ok" || echo "fail")
    FRONTEND_HEALTH=$(curl -sf http://localhost:3000/api/health 2>/dev/null && echo "ok" || echo "fail")
    
    if [ "$SERVER_HEALTH" == "ok" ] && [ "$FRONTEND_HEALTH" == "ok" ]; then
        log_info "All services healthy!"
        docker-compose ps
        log_info "Deployment complete!"
        exit 0
    fi
    
    echo "  Waiting... ($WAITED/${MAX_WAIT}s) [server:$SERVER_HEALTH frontend:$FRONTEND_HEALTH]"
    sleep $INTERVAL
    WAITED=$((WAITED + INTERVAL))
done

log_error "Services did not become healthy within ${MAX_WAIT}s"
log_error "Showing service status:"
docker-compose ps
log_error "Showing logs:"
docker-compose logs --tail=50
exit 1
