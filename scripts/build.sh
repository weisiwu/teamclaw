#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========== TeamClaw 生产构建 =========="

# 1. 后端编译
echo "[1/3] 编译后端 TypeScript..."
cd "$PROJECT_DIR/server"
npm run build
echo "✅ 后端编译完成"

# 2. 前端构建
echo "[2/3] 构建前端..."
cd "$PROJECT_DIR"
npm run build
echo "✅ 前端构建完成"

# 3. 检查产物
echo "[3/3] 检查构建产物..."
if [ ! -d "$PROJECT_DIR/server/dist" ]; then
  echo "❌ 后端编译产物不存在"
  exit 1
fi
if [ ! -d "$PROJECT_DIR/.next" ]; then
  echo "❌ 前端构建产物不存在"
  exit 1
fi

echo "========== 构建完成 =========="
echo "后端产物：$PROJECT_DIR/server/dist/"
echo "前端产物：$PROJECT_DIR/.next/"
echo ""
echo "启动命令："
echo "  pm2 start ecosystem.config.js --env production"
echo "  npm run start  # 前端 Next.js standalone"
