#!/bin/bash
# ============================================================
# TeamClaw API 健康检查脚本 v2
# 访问所有关键 API 路由，记录 HTTP 状态码
# 改进: 响应时间阈值、JSON 格式验证、路由分组优化
# ============================================================
set -euo pipefail

# ── 配置 ───────────────────────────────────────────────────
FRONTEND_URL="${HEALTHCHECK_FRONTEND_URL:-http://localhost:3000}"
BACKEND_URL="${HEALTHCHECK_BACKEND_URL:-http://localhost:9700}"
RESPONSE_TIME_THRESHOLD=3000  # 响应时间阈值 ms

# 关键前端 API 路由（Next.js → Express 代理）
FRONTEND_ROUTES=(
  "/api/health"
  "/api/v1/tasks"
  "/api/v1/tools"
  "/api/v1/versions"
  "/api/v1/agents"
  "/api/v1/branches"
  "/api/v1/skills"
  "/api/v1/feishu/chats"
  "/api/v1/feishu/messages"
  "/api/v1/tags"
  "/api/v1/dashboard/overview"
  "/api/v1/search"
  "/api/v1/projects"
  "/api/v1/members"
  "/api/v1/messages"
  "/api/v1/builds"
  "/api/v1/settings"
)

# 关键后端 API 路由（Express 直连）
BACKEND_ROUTES=(
  "/api/v1/health"
  "/api/v1/health/ready"
  "/api/v1/health/live"
  "/api/v1/projects"
  "/api/v1/users"
  "/api/v1/messages"
  "/api/v1/auth/login"
  "/api/v1/versions"
  "/api/v1/agents"
  "/api/v1/tasks"
  "/api/v1/tools"
  "/api/v1/skills"
  "/api/v1/branches"
  "/api/v1/dashboard/overview"
  "/api/v1/tags"
  "/api/v1/search"
  "/api/v1/builds"
  "/api/v1/members"
  "/api/v1/settings"
)

# 需要返回 JSON 的路由（用于 JSON 格式验证）
JSON_ROUTES=(
  "/api/v1/tasks"
  "/api/v1/versions"
  "/api/v1/tags"
  "/api/v1/agents"
  "/api/v1/projects"
  "/api/v1/members"
  "/api/v1/messages"
  "/api/v1/dashboard/overview"
  "/api/v1/branches"
  "/api/v1/skills"
)

# ── 颜色 ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── 检查单个路由 ─────────────────────────────────────────────
check_route() {
  local url="$1"
  local label="$2"
  local expected_codes="${3:-200,201,204}"

  local http_code time_ms
  local curl_output
  curl_output=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" --max-time 10 "$url" 2>/dev/null || echo "000|0")
  http_code="${curl_output%%|*}"
  time_ms=$(printf "%.0f" "$(echo "${curl_output##*|}" | awk '{print $1 * 1000}')" )

  # 判断是否匹配预期状态码
  local match=0
  IFS=',' read -ra EXPECTED <<< "$expected_codes"
  for ec in "${EXPECTED[@]}"; do
    [[ "$http_code" == "$ec" ]] && match=1 && break
  done

  local time_warn=""
  if [[ "$http_code" != "000" ]] && [[ "$time_ms" -gt "$RESPONSE_TIME_THRESHOLD" ]]; then
    time_warn=" (${time_ms}ms > ${RESPONSE_TIME_THRESHOLD}ms ⚠️)"
  fi

  if [[ "$match" == "1" ]]; then
    echo -e "${GREEN}[PASS]${NC}  [$http_code] ${time_ms}ms $label${time_warn}"
    return 0
  else
    echo -e "${RED}[FAIL]${NC}  [$http_code] ${time_ms}ms $label"
    return 1
  fi
}

# ── JSON 格式验证 ───────────────────────────────────────────
check_json() {
  local url="$1"
  local label="$2"

  local http_code content_type
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  content_type=$(curl -s -I "$url" 2>/dev/null | grep -i "content-type:" | head -1 || echo "")

  if [[ "$http_code" == "000" ]]; then
    echo -e "${RED}[SKIP]${NC}  $label (服务不可用)"
    return 0
  fi

  if echo "$content_type" | grep -qi "application/json"; then
    # 进一步验证是否为有效 JSON
    local body
    body=$(curl -s --max-time 10 "$url" 2>/dev/null || echo "")
    if echo "$body" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
      echo -e "${GREEN}[PASS]${NC}  [JSON] $label"
      return 0
    else
      echo -e "${RED}[FAIL]${NC}  [JSON INVALID] $label 返回的不是有效 JSON"
      return 1
    fi
  elif echo "$content_type" | grep -qi "text/html"; then
    echo -e "${RED}[FAIL]${NC}  [HTML!] $label 返回了 HTML 而不是 JSON"
    return 1
  else
    echo -e "${YELLOW}[WARN]${NC}  [未知] $label (Content-Type: $content_type)"
    return 0
  fi
}

# ── 打印报告 ────────────────────────────────────────────────
print_header() {
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  TeamClaw API 健康检查  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
  echo ""
}

# ── 检查服务可用性 ──────────────────────────────────────────
check_service() {
  local name="$1"
  local url="$2"

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")

  if [[ "$http_code" != "000" ]]; then
    echo -e "${GREEN}[UP]${NC}   $name ($url)"
    return 0
  else
    echo -e "${RED}[DOWN]${NC} $name ($url)"
    return 1
  fi
}

# ── 主流程 ──────────────────────────────────────────────────
print_header

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
TOTAL_COUNT=0

# 1. 检查服务可用性
echo -e "${YELLOW}[1/5] 检查服务可用性${NC}"
check_service "Frontend (Next.js)" "$FRONTEND_URL" || true
check_service "Backend  (Express)" "$BACKEND_URL" || true

# 2. 检查前端 API 路由
echo ""
echo -e "${YELLOW}[2/5] 检查前端 API 路由 (Next.js → Express)${NC}"
for route in "${FRONTEND_ROUTES[@]}"; do
  ((TOTAL_COUNT++))
  label="FRONTEND $route"
  if check_route "${FRONTEND_URL}${route}" "$label"; then
    ((PASS_COUNT++))
  else
    ((FAIL_COUNT++))
  fi
done

# 3. 检查后端 API 路由
echo ""
echo -e "${YELLOW}[3/5] 检查后端 API 路由 (Express 直连)${NC}"
for route in "${BACKEND_ROUTES[@]}"; do
  ((TOTAL_COUNT++))
  label="BACKEND $route"
  if check_route "${BACKEND_URL}${route}" "$label"; then
    ((PASS_COUNT++))
  else
    ((FAIL_COUNT++))
  fi
done

# 4. JSON 格式验证（关键路由）
echo ""
echo -e "${YELLOW}[4/5] JSON 格式验证（关键路由）${NC}"
for route in "${JSON_ROUTES[@]}"; do
  ((TOTAL_COUNT++))
  label="$route"
  if check_json "${FRONTEND_URL}${route}" "$label"; then
    ((PASS_COUNT++))
  else
    ((FAIL_COUNT++))
  fi
done

# 5. 总结报告
echo ""
echo -e "${YELLOW}[5/5] 检查结果汇总${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  总检查数: $TOTAL_COUNT"
echo -e "  ${GREEN}通过: $PASS_COUNT${NC}"
echo -e "  ${RED}失败: $FAIL_COUNT${NC}"
echo -e "  ${YELLOW}警告: $WARN_COUNT${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo ""
  echo -e "${YELLOW}常见问题排查：${NC}"
  echo "  1. 后端未启动 → cd server && npm run dev"
  echo "  2. 数据库未初始化 → ./scripts/setup-db.sh"
  echo "  3. 迁移未执行 → npx tsx server/src/db/migrations/run.ts"
  echo "  4. 前端未启动 → npm run dev"
  echo ""
  exit 1
else
  echo ""
  echo -e "${GREEN}✅ 所有检查通过！${NC}"
  exit 0
fi
