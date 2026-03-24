# Docker 部署指南

> 使用 Docker + Docker Compose 部署 teamclaw 到生产环境。

---

## 前提条件

- **Docker**：>= 20.10
- **Docker Compose**：>= 2.0（建议使用 `docker compose` V2 CLI）
- **硬件**：最低 2 核 CPU / 4GB 内存（推荐 4 核 / 8GB）

---

## 目录结构

```
teamclaw/
├── Dockerfile              # 多阶段构建镜像
├── docker-compose.yml      # 编排配置
├── deploy/
│   └── nginx.conf         # Nginx 反向代理配置
└── scripts/
    ├── deploy.sh          # 一键部署脚本
    ├── backup.sh          # 数据备份脚本
    └── restore.sh          # 数据恢复脚本
```

---

## 快速部署

### 1. 配置环境变量

```bash
# 复制生产环境配置模板
cp .env.production.example .env.production

# 编辑配置（必填项：数据库密码、JWT Secret、API Keys）
nano .env.production
```

### 2. 一键部署

```bash
# 使用部署脚本（推荐）
./scripts/deploy.sh

# 或手动执行
docker-compose build --parallel
docker-compose up -d
```

### 3. 验证服务

```bash
# 检查容器状态
docker-compose ps

# 检查健康状态
curl http://localhost:9700/api/v1/health
curl http://localhost:3000/api/health
```

---

## 启动可选服务

Docker Compose 包含以下 5 个服务，可按需启动：

```bash
# 启动全部服务
docker-compose up -d

# 仅启动基础设施（不含 frontend/server 容器）
docker-compose up -d postgres redis chroma

# 仅启动前端
docker-compose up -d frontend

# 仅启动后端
docker-compose up -d server

# 启动含 Nginx 反向代理（需要配置 nginx.conf）
docker-compose up -d nginx
```

---

## 服务说明

### frontend（Next.js）

| 配置项 | 值 |
|--------|-----|
| 镜像 | 本地构建（`Dockerfile` target: `runner`） |
| 端口 | `3000`（可映射到 `FRONTEND_PORT`） |
| 健康检查 | `curl -f http://localhost:3000/api/health` |
| 重启策略 | `unless-stopped` |

### server（Express）

| 配置项 | 值 |
|--------|-----|
| 镜像 | 本地构建（`Dockerfile` target: `runner`） |
| 端口 | `9700`（可映射到 `SERVER_PORT`） |
| 健康检查 | `curl -f http://localhost:9700/api/v1/health` |
| 重启策略 | `unless-stopped` |
| 依赖 | postgres → redis → chroma → server |

### postgres（PostgreSQL）

| 配置项 | 值 |
|--------|-----|
| 镜像 | `postgres:16-alpine` |
| 端口 | `5432` |
| 数据卷 | `postgres-data:/var/lib/postgresql/data` |
| 初始化 | 自动执行 `scripts/db-init.sql` |
| 健康检查 | `pg_isready -U <user> -d <db>` |

### redis（Redis）

| 配置项 | 值 |
|--------|-----|
| 镜像 | `redis:7-alpine` |
| 端口 | `6379` |
| 数据卷 | `redis-data:/data` |
| 持久化 | AOF 开启，内存上限 256MB，LRU 淘汰策略 |
| 健康检查 | `redis-cli ping` |

### chroma（ChromaDB）

| 配置项 | 值 |
|--------|-----|
| 镜像 | `chromadb/chroma:latest` |
| 端口 | `8000` |
| 数据卷 | `chroma-data:/chroma/chroma` |
| 健康检查 | `curl /api/v1/heartbeat` |

### nginx（反向代理）

| 配置项 | 值 |
|--------|-----|
| 镜像 | `nginx:alpine` |
| 端口 | `80` / `443` |
| 配置 | 挂载 `deploy/nginx.conf` |
| SSL | 生产环境需挂载证书到 `/etc/nginx/certs` |

---

## 数据卷

| 卷名 | 宿主机路径 | 说明 |
|------|-----------|------|
| `postgres-data` | Docker 管理 | PostgreSQL 数据文件 |
| `redis-data` | Docker 管理 | Redis AOF + RDB 持久化文件 |
| `chroma-data` | Docker 管理 | ChromaDB 向量数据 |
| `teamclaw-artifacts` | Docker 管理 | 服务间共享的构建产物 |

---

## Nginx 反向代理

生产环境建议通过 Nginx 对外提供服务（80/443），将请求分发到 frontend 和 server。

### 配置 SSL（生产）

```bash
# 挂载 SSL 证书到容器
# docker-compose.yml 中添加：
# volumes:
#   - /path/to/certs:/etc/nginx/certs:ro

# 然后编辑 deploy/nginx.conf：
# listen 443 ssl http2;
# ssl_certificate /etc/nginx/certs/server.crt;
# ssl_certificate_key /etc/nginx/certs/server.key;
```

### nginx.conf 关键路由

| 路径规则 | 代理目标 | 说明 |
|---------|---------|------|
| `/` | `localhost:3000` | Next.js 前端静态文件 |
| `/api` | `localhost:9700` | REST API（超时 300s） |
| `/api/v1/builds` | `localhost:9700` | WebSocket/SSE 构建流 |
| `/api/v1/downloads` | `localhost:9700` | 大文件下载（无缓冲） |

---

## 日志管理

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看指定服务日志
docker-compose logs -f server
docker-compose logs -f frontend

# 查看最近 100 行
docker-compose logs --tail=100

# 查看后端日志（启动时 tail）
docker-compose logs -f --tail=50 server
```

---

## 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建（自动使用构建缓存）
docker-compose build

# 滚动重启（无停机）
docker-compose up -d --no-deps server frontend

# 若有数据库迁移
docker-compose exec server npm run db:migrate
```

---

## 清理资源

```bash
# 停止所有容器（保留数据卷）
docker-compose down

# 停止并删除数据卷（⚠️ 数据丢失）
docker-compose down -v

# 停止并删除镜像（重新构建）
docker-compose down --rmi local

# 完全清理（容器 + 镜像 + 数据卷 + 网络）
docker-compose down -v --rmi local --remove-orphans
```

---

## 多节点部署

若需跨多台机器部署基础服务，可将 `postgres`、`redis`、`chroma` 拆分到独立主机：

```yaml
# docker-compose.yml 中替换连接地址
server:
  environment:
    - DATABASE_URL=postgresql://teamclaw:pass@10.0.1.10:5432/teamclaw
    - REDIS_URL=redis://10.0.1.11:6379
    - CHROMA_HOST=10.0.1.12
```
