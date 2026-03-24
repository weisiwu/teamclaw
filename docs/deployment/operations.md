# TeamClaw 常用运维操作指南

本文档汇总 TeamClaw 日常运维中的常用操作命令。

---

## 服务管理

### 启动服务

#### Docker Compose 方式

```bash
# 启动所有服务
docker-compose up -d

# 仅启动特定服务
docker-compose up -d server postgres

# 前台启动（查看日志）
docker-compose up
```

#### PM2 方式

```bash
# 启动所有服务
pm2 start ecosystem.config.js

# 仅启动后端
pm2 start ecosystem.config.js --only teamclaw-server

# 指定环境
pm2 start ecosystem.config.js --env production
```

#### 开发环境

```bash
# 同时启动前后端
npm run dev:all

# 仅前端
npm run dev:frontend

# 仅后端
npm run dev:backend
```

### 停止服务

```bash
# Docker Compose
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# PM2
pm2 stop all
pm2 stop teamclaw-server

# 开发环境
npm run dev:stop
```

### 重启服务

```bash
# Docker Compose
docker-compose restart
docker-compose restart server

# PM2
pm2 restart all
pm2 reload teamclaw-server  # 零停机重启

# 强制重启（内存泄漏等）
pm2 restart teamclaw-server --update-env
```

---

## 日志查看

### Docker 日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务
docker-compose logs -f server
docker-compose logs -f frontend

# 查看最近 100 行
docker-compose logs --tail=100 server

# 查看特定时间范围
docker-compose logs --since="2026-03-24T10:00:00" server

# 查看错误日志（仅 stderr）
docker-compose logs -f server 2>&1 | grep ERROR
```

### PM2 日志

```bash
# 实时查看所有日志
pm2 logs

# 查看特定服务
pm2 logs teamclaw-server
pm2 logs teamclaw-frontend

# 查看错误日志
pm2 logs teamclaw-server --err

# 查看历史日志
pm2 logs teamclaw-server --lines 1000

# 日志文件位置
ls -la logs/
tail -f logs/server-out.log
tail -f logs/server-error.log
```

### 日志清理

```bash
# PM2 日志清理
pm2 flush

# 手动清理日志文件
> logs/server-out.log
> logs/server-error.log

# Docker 日志清理（谨慎使用）
docker system prune -f
docker volume prune -f
```

---

## 健康检查

### HTTP 端点检查

```bash
# 前端健康检查
curl -f http://localhost:3000/api/health
curl -f http://localhost:3000/api/health/detailed

# 后端健康检查
curl -f http://localhost:9700/api/v1/health
curl -f http://localhost:9700/api/v1/health/detailed | jq

# 完整系统检查（带响应时间）
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:9700/api/v1/health

# curl-format.txt 内容：
# time_namelookup: %{time_namelookup}\n
# time_connect: %{time_connect}\n
# time_total: %{time_total}\n
```

### 服务状态检查

```bash
# Docker 服务状态
docker-compose ps
docker-compose ps -a

# PM2 服务状态
pm2 status
pm2 monit  # 交互式监控

# 进程检查
ps aux | grep -E "next|node.*teamclaw"

# 端口检查
netstat -tlnp | grep -E "3000|9700"
ss -tlnp | grep -E "3000|9700"
```

### 资源监控

```bash
# Docker 资源使用
docker stats
docker stats --no-stream

# 系统资源
htop
free -h
df -h

# Node.js 进程内存
pm2 monit
ps -o pid,ppid,cmd,vsz,rss -p $(pgrep -f "next|teamclaw")
```

---

## 数据库操作

### 连接数据库

```bash
# 使用连接字符串
psql $DATABASE_URL

# 手动指定参数
psql -h localhost -p 5432 -U teamclaw -d teamclaw

# Docker 环境
docker-compose exec postgres psql -U teamclaw -d teamclaw
```

### 常用查询

```sql
-- 查看表列表
\dt

-- 查看表结构
\d versions

-- 查看索引
\di

-- 查询版本统计
SELECT status, COUNT(*) FROM versions GROUP BY status;

-- 查询最近的构建
SELECT id, version, status, created_at 
FROM builds 
ORDER BY created_at DESC 
LIMIT 10;

-- 查看慢查询
SELECT query, calls, mean_time, total_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 数据库维护

```bash
# 更新统计信息
psql $DATABASE_URL -c "ANALYZE"

# 清理表（回收空间）
psql $DATABASE_URL -c "VACUUM ANALYZE versions"

# 完整清理（会锁表，谨慎使用）
psql $DATABASE_URL -c "VACUUM FULL"
```

---

## 缓存操作

### Redis 操作

```bash
# 连接 Redis
redis-cli

# Docker 环境
docker-compose exec redis redis-cli

# 常用命令
redis-cli ping                    # 检查连接
redis-cli info                    # 查看信息
redis-cli info memory             # 内存使用
redis-cli monitor                 # 实时监控（生产慎用）

# 清理缓存
redis-cli flushdb                 # 清空当前数据库
redis-cli flushall                # 清空所有数据库

# 查看键
redis-cli keys "*"                # 列出所有键（大数据量慎用）
redis-cli scan 0                  # 渐进式扫描
redis-cli --scan --pattern "user:*"

# 删除键
redis-cli del "cache:key"
redis-cli --scan --pattern "temp:*" | xargs redis-cli del
```

---

## 备份与恢复

### 完整备份

```bash
#!/bin/bash
# backup.sh - 自动备份脚本

BACKUP_DIR="/backup/teamclaw/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# 数据库备份
pg_dump $DATABASE_URL > $BACKUP_DIR/database.sql

# Redis 备份（如果启用持久化）
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis.rdb 2>/dev/null

# 上传文件备份
tar -czf $BACKUP_DIR/uploads.tar.gz /app/uploads/

# 压缩备份
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

# 清理旧备份（保留30天）
find /backup/teamclaw -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

### 定时备份（Cron）

```bash
# 编辑 crontab
crontab -e

# 每天凌晨3点备份
0 3 * * * /path/to/teamclaw/scripts/backup.sh >> /var/log/teamclaw-backup.log 2>&1

# 每周日完整备份
0 4 * * 0 /path/to/teamclaw/scripts/backup-full.sh
```

---

## 故障排查

### 服务无法启动

```bash
# 1. 检查端口占用
sudo lsof -i :3000
sudo lsof -i :9700

# 2. 检查环境变量
cat .env | grep -v "^#" | grep -v "^$"

# 3. 检查依赖
npm ls --depth=0

# 4. 查看详细错误
npm run build 2>&1 | tee build.log
```

### 内存不足

```bash
# 查看内存使用
free -h
ps aux --sort=-%mem | head -20

# PM2 内存限制重启
pm2 reload ecosystem.config.js --update-env

# Docker 内存限制
docker-compose up -d --memory="1g" server
```

### 数据库连接问题

```bash
# 检查连接
pg_isready -h localhost -p 5432

# 查看连接数
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# 重启连接池
pm2 restart teamclaw-server
```

### 网络问题

```bash
# 测试端口连通性
telnet localhost 3000
telnet localhost 9700

# 检查防火墙
sudo iptables -L -n | grep 3000
sudo ufw status

# 测试外部访问
curl -I https://your-domain.com
curl -I http://localhost:3000
```

---

## 更新部署

### 代码更新流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm ci --legacy-peer-deps
cd server && npm ci --legacy-peer-deps && cd ..

# 3. 构建
npm run build
cd server && npm run build && cd ..

# 4. 执行迁移
npm run migrate

# 5. 重启服务
pm2 reload all
# 或
docker-compose up -d --build
```

### 零停机更新（Docker）

```bash
# 蓝绿部署示例
# 1. 启动新版本
docker-compose -f docker-compose.yml -f docker-compose.new.yml up -d --no-deps --scale frontend=2 frontend

# 2. 验证新版本
# ... 健康检查 ...

# 3. 切换流量
# ... Nginx/负载均衡器切换 ...

# 4. 关闭旧版本
docker-compose stop frontend
```

---

## 性能监控

### 安装监控工具

```bash
# PM2 Plus（云端监控）
pm2 plus

# 或本地监控
npm install -g pm2-server-monit
pm2 install pm2-server-monit
```

### 自定义监控脚本

```bash
#!/bin/bash
# monitor.sh

while true; do
    # 记录系统状态
    echo "$(date) - CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%, Memory: $(free | grep Mem | awk '{printf "%.2f%%", $3/$2 * 100.0}')" >> /var/log/teamclaw-monitor.log
    
    # 检查服务健康
    if ! curl -sf http://localhost:9700/api/v1/health > /dev/null; then
        echo "$(date) - ALERT: Backend is down!" >> /var/log/teamclaw-alerts.log
        # 发送告警（配置 webhook 或邮件）
    fi
    
    sleep 60
done
```
