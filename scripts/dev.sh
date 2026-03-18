#!/bin/bash
# TeamClaw 开发环境启动脚本
# 使用方式: ./scripts/dev.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🚀 启动 TeamClaw 开发环境..."

# 1. 启动 Docker 服务
echo "📦 启动 Docker 服务..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
    echo "✅ Docker 服务已启动"
elif command -v docker &> /dev/null; then
    docker compose up -d
    echo "✅ Docker 服务已启动"
else
    echo "⚠️ Docker 未安装，跳过数据库服务"
fi

# 2. 等待服务就绪
echo "⏳ 等待服务就绪..."
sleep 3

# 3. 初始化数据库
echo "🗄️ 初始化数据库..."
if [ -f "$SCRIPT_DIR/db-init.sh" ]; then
    chmod +x "$SCRIPT_DIR/db-init.sh"
    "$SCRIPT_DIR/db-init.sh"
else
    echo "⚠️ db-init.sh 不存在，跳过"
fi

# 4. 启动后端服务
echo "🔧 启动后端服务..."
if [ -d "server" ]; then
    cd server
    if [ -f "package.json" ]; then
        npm install --silent 2>/dev/null || true
        npx tsx src/index.ts &
        echo "✅ 后端服务已启动 (PID: $!)"
    fi
    cd "$PROJECT_ROOT"
fi

# 5. 启动前端服务
echo "🎨 启动前端服务..."
if [ -d "app" ] || [ -f "package.json" ]; then
    if grep -q '"next"' package.json; then
        npx next dev &
        echo "✅ 前端服务已启动 (PID: $!)"
    fi
fi

echo ""
echo "✨ 开发环境启动完成!"
echo "📝 后端 API: http://localhost:9700"
echo "🌐 前端: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待中断
wait
