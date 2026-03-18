#!/bin/bash
# TeamClaw 前端构建脚本
# 使用方式: ./scripts/build.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/dist"

echo "🔨 开始构建 TeamClaw..."

cd "$PROJECT_ROOT"

# 1. 安装依赖
echo "📦 安装依赖..."
npm install --silent

# 2. 类型检查
echo "🔍 类型检查..."
npx tsc --noEmit || {
    echo "❌ TypeScript 类型检查失败"
    exit 1
}

# 3. Lint 检查
echo "🧹 Lint 检查..."
npx eslint . --max-warnings 50 || {
    echo "⚠️ Lint 检查有错误"
}

# 4. 构建前端
echo "🎨 构建前端..."
if [ -d "app" ]; then
    npx next build
    echo "✅ Next.js 构建完成"
else
    echo "⚠️ 未找到 app 目录，跳过前端构建"
fi

# 5. 复制静态文件
echo "📁 复制静态文件..."
mkdir -p "$BUILD_DIR"
if [ -d ".next/static" ]; then
    cp -r .next/static "$BUILD_DIR/"
fi

# 6. 创建构建清单
echo "📋 生成构建清单..."
BUILD_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "{\"hash\":\"$BUILD_HASH\",\"time\":\"$BUILD_TIME\"}" > "$BUILD_DIR/manifest.json"

echo ""
echo "✨ 构建完成!"
echo "   输出目录: $BUILD_DIR"
echo "   Git Hash: $BUILD_HASH"
echo ""
echo "🚀 部署命令:"
echo "   pm2 start ecosystem.config.js"
