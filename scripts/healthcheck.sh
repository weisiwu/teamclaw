#!/bin/bash
# ============================================================
# TeamClaw 页面健康检查脚本
# 检查所有 API 路由的可用性，记录 HTTP 状态码
# ============================================================

set -e

SERVER_URL="${SERVER_URL:-http://localhost:9700}"
OUTPUT_FILE="${OUTPUT_FILE:-}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 统计
TOTAL=0
PASS=0
FAIL=0
WARN=0

log_ok()   { echo -e "${GREEN}[PASS]${NC} $1"; ((PASS++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL++)); }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; ((WARN++)); }
log_info() { echo -e "[INFO] $1"; }

check_route() {
  local method=${1:-GET}
  local path=${2}
  local description=${3:-}
  local expected_status=${4:-200}

  ((TOTAL++))
  
  local full_url="${SERVER_URL}${path}"
  local response
  local http_code
  local content_type
  
  # 获取 HTTP 状态码和 Content-Type
  response=$(curl -s -o /dev/null -w "%{http_code}|%{content_type}" --max-time 10 "$full_url" 2>/dev/null) || true
  http_code=$(echo "$response" | cut -d'|' -f1)
  content_type=$(echo "$response" | cut -d'|' -f2)
  
  local desc_text=""
  [ -n "$description" ] && desc_text=" ($description)"
  
  if [ "$http_code" = "$expected_status" ]; then
    log_ok "${method} ${path}${desc_text} → ${http_code}"
  elif [ "$http_code" = "000" ]; then
    log_fail "${method} ${path}${desc_text} → 连接失败（服务未启动？）"
  elif [ "$http_code" = "404" ]; then
    log_fail "${method} ${path}${desc_text} → 404 Not Found"
  elif [ "$http_code" = "500" ]; then
    log_fail "${method} ${path}${desc_text} → 500 Internal Server Error"
  elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    log_warn "${method} ${path}${desc_text} → ${http_code}（需要认证）"
  else
    log_warn "${method} ${path}${desc_text} → ${http_code}（期望 ${expected_status}）"
  fi
}

# 检查服务是否可达
check_server_reachable() {
  log_info "检查后端服务连通性: ${SERVER_URL}"
  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${SERVER_URL}/health" 2>/dev/null) || response="000"
  if [ "$response" = "000" ]; then
    log_fail "后端服务不可达: ${SERVER_URL}"
    log_info "请确保后端服务已启动: cd server && npm run dev"
    exit 1
  fi
  log_ok "后端服务可达 (${response})"
}

echo "============================================"
echo " TeamClaw 页面健康检查"
echo " 后端: ${SERVER_URL}"
echo " 时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

check_server_reachable
echo ""

echo "--- 健康检查路由 ---"
check_route GET "/health" "健康检查"

echo ""
echo "--- 认证相关 ---"
check_route POST "/api/auth/login" "登录" 400
check_route GET "/api/auth/me" "当前用户" 401

echo ""
echo "--- 任务管理 ---"
check_route GET "/api/v1/tasks" "任务列表" 401
check_route GET "/api/v1/tasks/test-task-id" "任务详情" 401

echo ""
echo "--- 项目与版本 ---"
check_route GET "/api/v1/projects" "项目列表" 401
check_route GET "/api/v1/versions" "版本列表" 401

echo ""
echo "--- 统计数据 ---"
check_route GET "/api/v1/dashboard/stats" "仪表盘统计" 401
check_route GET "/api/v1/token-stats" "Token 统计" 401

echo ""
echo "--- 管理接口 ---"
check_route GET "/api/v1/admin/config" "管理配置" 401
check_route GET "/api/v1/audit-logs" "审计日志" 401

echo ""
echo "============================================"
echo " 检查完成: ${TOTAL} 个路由 | ${PASS} 通过 | ${FAIL} 失败 | ${WARN} 警告"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
elif [ "$WARN" -gt 0 ]; then
  exit 0
fi
exit 0
