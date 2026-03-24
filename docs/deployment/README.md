# TeamClaw 配置与部署文档

> 本目录包含 teamclaw 项目的完整配置与部署相关文档。

## 目录索引

| 文档 | 说明 |
|------|------|
| [环境变量说明](./environment-variables.md) | `.env.example` / `.env.production.example` 完整释义 |
| [Docker 部署](./docker-deployment.md) | Docker + Docker Compose 完整部署流程 |
| [Vercel 部署](./vercel-deployment.md) | Vercel 前端部署指南 |
| [PM2 部署](./pm2-deployment.md) | PM2 生产进程守护部署 |
| [数据库迁移](./database-migration.md) | schema.sql 与迁移工具使用说明 |
| [飞书机器人配置](./feishu-bot.md) | 飞书开放平台应用创建、权限、事件订阅 |
| [运维操作指南](./operations.md) | 启动、重启、日志查看、备份恢复等常用操作 |
| [目录结构说明](./directory-structure.md) | 项目目录结构与关键文件说明 |
| [package.json 脚本](./package-scripts.md) | 前后端 package.json 所有脚本说明 |
| [技术栈汇总](./tech-stack.md) | 项目技术栈完整汇总 |

## 快速启动

### 开发环境

```bash
# 一键启动全部服务（PostgreSQL + Redis + ChromaDB + 后端 + 前端）
./scripts/dev.sh

# 跳过 Docker（使用外部已有基础设施）
./scripts/dev.sh --skip-docker

# 仅启动后端
./scripts/dev.sh --backend

# 仅启动前端
./scripts/dev.sh --frontend

# 查看服务状态
./scripts/dev.sh --status

# 停止所有服务
./scripts/dev.sh --stop
```

### 生产环境（Docker）

```bash
# 复制并编辑环境变量
cp .env.production.example .env.production
# 编辑 .env.production，填写所有必填值

# 一键部署
./scripts/deploy.sh

# 或手动构建启动
docker-compose build
docker-compose up -d
```

## 服务端口一览

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 (Next.js) | 3000 | Web 应用入口 |
| 后端 (Express) | 9700 | REST API |
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6379 | 缓存 / Session |
| ChromaDB | 8000 | 向量数据库 |
| Nginx | 80 / 443 | 反向代理（生产） |

## 健康检查

```bash
# 后端健康检查
curl http://localhost:9700/api/v1/health

# 前端健康检查
curl http://localhost:3000/api/health
```
