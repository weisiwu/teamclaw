# 常用运维操作指南

> teamclaw 项目日常运维命令汇总，涵盖启动、停止、日志、备份、迁移等操作。

---

## 服务管理

### 开发环境

```bash
# 一键启动全部服务
./scripts/dev.sh

# 查看服务状态
./scripts/dev.sh --status

# 停止所有服务
./scripts/dev.sh --stop

# 仅启动后端
./scripts/dev.sh --backend

# 仅启动前端
./scripts/dev.sh --frontend

# 跳过 Docker（使用外部基础设施）
./scripts/dev.sh --skip-docker

# 仅安装依赖（不启动）
./scripts/dev.sh --install
```

### 生产环境（Docker）

```bash
# 启动全部服务
docker-compose up -d

# 停止全部服务（保留数据卷）
docker-compose down

# 重启指定服务
docker-compose restart server
docker-compose restart frontend

# 重建并启动
docker-compose up -d --build
```

### PM2（后端独立部署）

```bash
# 启动
pm2 start ecosystem.config.js --env production

# 重启
pm2 restart teamclaw-server

# 优雅重启（零停机）
pm2 reload teamclaw-server

# 停止
pm2 stop teamclaw-server

# 查看状态
pm2 list

# 监控资源
pm2 monit
```

---

## 日志查看

### Docker 日志

```bash
# 所有服务日志
docker-compose logs -f

# 指定服务日志
docker-compose logs -f server
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f chroma

# 最近 100 行
docker-compose logs --tail=100 server

# 指定时间范围
docker-compose logs --since 2026-03-24T00:00:00 server
```

### PM2 日志

```bash
# 实时日志
pm2 logs teamclaw-server

# 最近 50 行
pm2 logs teamclaw-server --lines 50

# 清空日志文件
pm2 flush

# 所有进程日志
pm2 logs --err --out
```

### 应用日志文件

开发模式下日志输出到 `logs/` 目录：

```bash
# 后端日志
tail -f logs/backend.log

# 前端日志
tail -f logs/frontend.log

# 搜索错误
grep -i error logs/backend.log | tail -20
```

---

## 数据库操作

### PostgreSQL

```bash
# 连接数据库
docker exec -it teamclaw-postgres psql -U teamclaw -d teamclaw

# 查看所有表
psql> \dt

# 查看表结构
psql> \d users
psql> \d projects

# 执行 SQL 文件
docker exec -i teamclaw-postgres psql -U teamclaw -d teamclaw < scripts/db-init.sql

# 导出数据
docker exec teamclaw-postgres pg_dump -U teamclaw teamclaw > backup.sql
```

### Redis

```bash
# 连接 Redis CLI
docker exec -it teamclaw-redis redis-cli

# 检查连接
redis-cli> ping

# 查看所有 key
redis-cli> keys '*'

# 查看 key 类型
redis-cli> type session:xxx

# 删除 key
redis-cli> del session:xxx

# 查看内存
redis-cli> info memory
```

### ChromaDB

```bash
# 健康检查
curl -s http://localhost:8000/api/v1/heartbeat

# 版本信息
curl -s http://localhost:8000/api/v1/version
```

---

## 数据备份

### 一键备份（推荐）

```bash
# 执行备份脚本
./scripts/backup.sh

# 备份产物位于：backups/YYYYMMDD_HHMMSS.tar.gz
```

### 分项备份

```bash
# PostgreSQL 备份
pg_dump -h localhost -p 5432 -U teamclaw teamclaw > postgres_$(date +%Y%m%d).sql

# Redis RDB 备份
docker exec teamclaw-redis redis-cli --rdb /data/redis_$(date +%Y%m%d).rdb
docker cp teamclaw-redis:/data/redis_$(date +%Y%m%d).rdb ./backups/

# ChromaDB 备份
docker exec teamclaw-chroma tar -czf /backup/chroma_$(date +%Y%m%d).tar.gz -C /chroma chroma
docker cp teamclaw-chroma:/backup/chroma_$(date +%Y%m%d).tar.gz ./backups/
```

---

## 数据恢复

```bash
# 执行恢复脚本
./scripts/restore.sh backups/YYYYMMDD_HHMMSS.tar.gz
```

恢复过程：
1. 解压备份文件
2. 恢复 PostgreSQL（覆盖当前数据）
3. 恢复本地文件（如 data/ 目录）
4. 清理临时文件

---

## 进程与端口检查

### 检查端口占用

```bash
# 检查端口是否被占用
lsof -i :9700
lsof -i :3000
lsof -i :5432

# 查看端口占用情况
netstat -tlnp | grep -E '9700|3000|5432'
```

### 检查进程状态

```bash
# Node.js 进程
ps aux | grep -E 'next|tsx|node' | grep -v grep

# Docker 容器
docker ps

# 所有容器（含已停止）
docker ps -a
```

---

## 健康检查

### 后端 API

```bash
# 健康检查（推荐）
curl -sf http://localhost:9700/api/v1/health

# 详细检查（含数据库连接状态）
curl -s http://localhost:9700/api/v1/health | jq .
```

### 前端

```bash
# 健康检查
curl -sf http://localhost:3000/api/health

# 主页检查
curl -sf http://localhost:3000 | head -5
```

### Docker 服务健康

```bash
# 检查所有容器健康状态
docker inspect --format='{{.Name}} {{.State.Health.Status}}' $(docker ps -q)

# 完整容器状态
docker-compose ps
```

---

## 系统资源

### 查看 Docker 资源占用

```bash
# 内存 / CPU 使用
docker stats

# 限制内存
docker update --memory 2g teamclaw-server
```

### 清理

```bash
# 清理未使用的 Docker 资源
docker system prune -f

# 清理悬空镜像
docker image prune -f

# 清理未使用的数据卷
docker volume prune -f

# 完全清理（慎用）
docker system prune -a -f --volumes
```

---

## 安全建议

### 生产环境必做

1. **修改默认密码**：PostgreSQL (`teamclaw` 用户密码)、Redis（设置密码认证）
2. **JWT Secret**：使用 `openssl rand -base64 32` 生成强随机密钥
3. **防火墙**：只开放必要端口（80/443/22）
4. **.env 文件**：确保 `.env.production` 不在版本控制中
5. **定期备份**：建议每日自动备份，保留 7 天以上

### Redis 密码认证

在 `docker-compose.yml` 中添加：

```yaml
redis:
  command: redis-server --appendonly yes --requirepass YOUR_REDIS_PASSWORD
  environment:
    - REDIS_PASSWORD=YOUR_REDIS_PASSWORD
```
