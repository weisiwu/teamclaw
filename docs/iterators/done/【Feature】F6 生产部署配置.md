# 【Feature】F6 生产部署配置

> 优先级：中
> 前置依赖：【P1】M5 连接优雅关闭
> 关联模块：[部署方案](../modules/部署方案.md)

---

## 1. 现状分析

### 1.1 已有代码

| 文件 | 状态 | 说明 |
|------|------|------|
| `docker-compose.yml` | 已实现 | PostgreSQL、Redis、ChromaDB、前端、后端、Nginx 容器编排 |
| `scripts/dev.sh` | 已实现 | 开发模式启动脚本（Docker + 前后端） |
| `.env.example` | 已实现 | 环境变量模板（开发环境） |
| `.env.production.example` | 已实现 | 生产环境变量模板 |
| `server/src/routes/health.ts` | 已实现 | 健康检查路由 |

### 1.2 缺失文件（对照部署方案文档）

| 文件 | 描述 | 状态 |
|------|------|------|
| `ecosystem.config.js` | PM2 进程守护配置 | ❌ 不存在 |
| `deploy/nginx.conf` | Nginx 反向代理 + 静态托管模板 | ❌ 不存在 |
| `scripts/build.sh` | 前端构建 + 后端编译脚本 | ❌ 不存在 |
| `scripts/backup.sh` | PostgreSQL + Redis + ChromaDB 一键备份 | ❌ 不存在 |
| `scripts/restore.sh` | 数据恢复脚本 | ❌ 不存在 |
| `scripts/db-init.sh` | 数据库初始化（幂等执行） | ❌ 不存在 |
| `server/src/utils/config.ts` | 启动时配置校验 | ⚠️ 需验证完整性 |
| `app/monitor/page.tsx` | 前端监控页面 | ⚠️ 已存在但需对接健康检查 API |

---

## 2. 目标

提供完整的生产部署工具链，一键构建、部署、备份、恢复。

---

## 3. 实现步骤

### Step 1：PM2 配置文件

**新建 `apps/teamclaw/ecosystem.config.js`**：

```javascript
module.exports = {
  apps: [
    {
      name: 'teamclaw-server',
      script: './server/dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 9700,
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
```

### Step 2：Nginx 配置模板

**新建 `apps/teamclaw/deploy/nginx.conf`**：

```nginx
server {
    listen 80;
    server_name teamclaw.local;

    # 前端静态文件（Next.js standalone 模式）
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API 反向代理
    location /api {
        proxy_pass http://localhost:9700;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置（构建等长任务）
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # WebSocket 代理（SSE / 实时通知）
    location /api/v1/builds {
        proxy_pass http://localhost:9700;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_cache off;
    }

    # 文件下载（大文件支持）
    location /api/v1/downloads {
        proxy_pass http://localhost:9700;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_max_temp_file_size 0;
    }

    # 安全 headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;
}
```

### Step 3：构建脚本

**新建 `apps/teamclaw/scripts/build.sh`**：

```bash
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
```

### Step 4：数据库初始化脚本

**新建 `apps/teamclaw/scripts/db-init.sh`**：

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 加载环境变量
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-teamclaw}"
DB_USER="${POSTGRES_USER:-teamclaw}"

echo "========== 数据库初始化 =========="
echo "目标：$DB_HOST:$DB_PORT/$DB_NAME"

# 1. 等待 PostgreSQL 就绪
echo "[1/3] 等待 PostgreSQL..."
for i in $(seq 1 30); do
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    echo "✅ PostgreSQL 就绪"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ PostgreSQL 连接超时"
    exit 1
  fi
  sleep 1
done

# 2. 执行迁移
echo "[2/3] 执行数据库迁移..."
cd "$PROJECT_DIR"
npx tsx server/src/db/migrations/run.ts
echo "✅ 迁移完成"

# 3. 验证
echo "[3/3] 验证表结构..."
TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
echo "✅ 当前表数量：$TABLES"

echo "========== 初始化完成 =========="
```

### Step 5：备份脚本

**新建 `apps/teamclaw/scripts/backup.sh`**：

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

# 加载环境变量
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

mkdir -p "$BACKUP_DIR"

echo "========== TeamClaw 数据备份 =========="
echo "备份目录：$BACKUP_DIR"

# 1. PostgreSQL 备份
echo "[1/3] 备份 PostgreSQL..."
pg_dump -h "${POSTGRES_HOST:-localhost}" \
        -p "${POSTGRES_PORT:-5432}" \
        -U "${POSTGRES_USER:-teamclaw}" \
        "${POSTGRES_DB:-teamclaw}" > "$BACKUP_DIR/postgres.sql"
echo "✅ PostgreSQL 备份完成 ($(du -h "$BACKUP_DIR/postgres.sql" | cut -f1))"

# 2. Redis 备份
echo "[2/3] 备份 Redis..."
redis-cli -h "${REDIS_HOST:-localhost}" \
          -p "${REDIS_PORT:-6379}" \
          --rdb "$BACKUP_DIR/redis.rdb" 2>/dev/null || echo "⚠️ Redis 备份跳过（可能未运行）"

# 3. SQLite 备份（如果存在）
echo "[3/3] 备份本地数据..."
if [ -d "$PROJECT_DIR/data" ]; then
  cp -r "$PROJECT_DIR/data" "$BACKUP_DIR/data"
  echo "✅ 本地数据备份完成"
fi

# 4. 压缩
echo "压缩备份..."
cd "$(dirname "$BACKUP_DIR")"
tar -czf "$(basename "$BACKUP_DIR").tar.gz" "$(basename "$BACKUP_DIR")"
rm -rf "$BACKUP_DIR"
echo "✅ 备份完成：$(dirname "$BACKUP_DIR")/$(basename "$BACKUP_DIR").tar.gz"

# 5. 清理旧备份（保留最近 7 个）
echo "清理旧备份..."
ls -t "$PROJECT_DIR/backups/"*.tar.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
echo "========== 备份完成 =========="
```

### Step 6：恢复脚本

**新建 `apps/teamclaw/scripts/restore.sh`**：

```bash
#!/bin/bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "用法：$0 <备份文件.tar.gz>"
  exit 1
fi

BACKUP_FILE="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEMP_DIR="$PROJECT_DIR/backups/_restore_tmp"

# 加载环境变量
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

echo "========== TeamClaw 数据恢复 =========="
echo "备份文件：$BACKUP_FILE"
echo "⚠️ 此操作将覆盖当前数据，是否继续？(y/N)"
read -r confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "已取消"
  exit 0
fi

# 解压
mkdir -p "$TEMP_DIR"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
RESTORE_DIR=$(ls "$TEMP_DIR")

# 恢复 PostgreSQL
if [ -f "$TEMP_DIR/$RESTORE_DIR/postgres.sql" ]; then
  echo "[1/3] 恢复 PostgreSQL..."
  psql -h "${POSTGRES_HOST:-localhost}" \
       -p "${POSTGRES_PORT:-5432}" \
       -U "${POSTGRES_USER:-teamclaw}" \
       "${POSTGRES_DB:-teamclaw}" < "$TEMP_DIR/$RESTORE_DIR/postgres.sql"
  echo "✅ PostgreSQL 恢复完成"
fi

# 恢复本地数据
if [ -d "$TEMP_DIR/$RESTORE_DIR/data" ]; then
  echo "[2/3] 恢复本地数据..."
  cp -r "$TEMP_DIR/$RESTORE_DIR/data" "$PROJECT_DIR/"
  echo "✅ 本地数据恢复完成"
fi

# 清理
rm -rf "$TEMP_DIR"
echo "========== 恢复完成 =========="
```

### Step 7：启动时配置校验

**修改 `server/src/utils/config.ts`**：

确保服务启动时校验所有必填配置项：

```typescript
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const required = [
    'PORT',
    'DATABASE_URL',
    'REDIS_URL',
    'CHROMADB_URL',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`缺失必填环境变量：${key}`);
    }
  }

  // 校验 DATABASE_URL 格式
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgres')) {
    errors.push('DATABASE_URL 格式不正确，应以 postgres:// 或 postgresql:// 开头');
  }

  // 校验端口范围
  const port = parseInt(process.env.PORT || '9700');
  if (port < 1 || port > 65535) {
    errors.push(`PORT 值无效：${port}`);
  }

  if (errors.length > 0) {
    console.error('❌ 配置校验失败：');
    errors.forEach(e => console.error(`  - ${e}`));
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 4. 涉及文件

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `ecosystem.config.js` | PM2 进程守护配置 |
| 新建 | `deploy/nginx.conf` | Nginx 反向代理模板 |
| 新建 | `scripts/build.sh` | 生产构建脚本 |
| 新建 | `scripts/db-init.sh` | 数据库初始化脚本 |
| 新建 | `scripts/backup.sh` | 一键备份脚本 |
| 新建 | `scripts/restore.sh` | 数据恢复脚本 |
| 修改 | `server/src/utils/config.ts` | 启动配置校验 |
| 修改 | `app/monitor/page.tsx` | 前端监控页面对接健康检查 |
| 修改 | `.gitignore` | 添加 `backups/`、`logs/` 目录 |

---

## 5. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | `scripts/build.sh` 执行后生成 `server/dist/` 和 `.next/` | 终端执行 |
| 2 | `pm2 start ecosystem.config.js --env production` 启动成功 | `pm2 status` |
| 3 | `nginx -t` 配置语法检查通过 | 终端执行 |
| 4 | `scripts/db-init.sh` 幂等执行（多次执行无报错） | 多次执行 |
| 5 | `scripts/backup.sh` 生成 `.tar.gz` 备份文件 | 文件检查 |
| 6 | `scripts/restore.sh` 从备份成功恢复数据 | 操作验证 |
| 7 | 旧备份自动清理（保留最近 7 个） | 生成多个备份后检查 |
| 8 | 缺失必填配置时服务启动报错并退出 | 删除 DATABASE_URL 后启动 |
| 9 | 前端监控页面展示各服务连接状态 | 浏览器截图 |
