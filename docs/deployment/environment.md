# TeamClaw 环境变量配置说明

本文档详细说明 TeamClaw 项目所需的所有环境变量及其用途。

## 快速开始

```bash
# 开发环境
cp .env.example .env

# 生产环境
cp .env.production.example .env.production
```

---

## 核心环境变量

### 1. 应用基础配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `NODE_ENV` | 是 | `development` | 运行环境：`development` / `production` / `test` |
| `PORT` | 否 | `3000` | Next.js 前端服务端口 |
| `SERVER_PORT` | 否 | `9700` | Express 后端服务端口 |
| `HOST` | 否 | `0.0.0.0` | 服务监听地址 |
| `SERVER_URL` | 生产必需 | - | 后端服务公网 URL，用于 CORS 和 Webhook |

### 2. 数据库配置 (PostgreSQL)

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | 是 | - | PostgreSQL 连接字符串，格式：`postgresql://user:pass@host:port/dbname` |
| `DB_HOST` | 否 | `localhost` | 数据库主机地址 |
| `DB_PORT` | 否 | `5432` | 数据库端口 |
| `DB_NAME` | 否 | `teamclaw` | 数据库名称 |
| `DB_USER` | 否 | `teamclaw` | 数据库用户名 |
| `DB_PASSWORD` | 否 | - | 数据库密码 |

**示例连接字符串：**
```bash
DATABASE_URL=postgresql://teamclaw:password123@localhost:5432/teamclaw
```

### 3. 缓存配置 (Redis)

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `REDIS_URL` | 否 | `redis://localhost:6379` | Redis 连接 URL |
| `REDIS_HOST` | 否 | `localhost` | Redis 主机地址 |
| `REDIS_PORT` | 否 | `6379` | Redis 端口 |

### 4. 向量数据库 (ChromaDB)

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `CHROMA_URL` | 否 | `http://localhost:8000` | ChromaDB 服务 URL |
| `CHROMA_HOST` | 否 | `chroma` | ChromaDB 主机名（Docker 网络） |
| `CHROMA_PORT` | 否 | `8000` | ChromaDB 端口 |

---

## LLM API 配置

### OpenAI

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `OPENAI_API_KEY` | 条件 | OpenAI API 密钥，用于 GPT 模型调用 |
| `OPENAI_BASE_URL` | 否 | 可选的自定义 API 基础 URL（代理） |

### Anthropic

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | 条件 | Claude API 密钥 |

### DeepSeek

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | 条件 | DeepSeek API 密钥 |

**注意：** 至少配置一个 LLM API 密钥，否则 AI 功能将无法使用。

### 模型选择（可选）

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LIGHT_MODEL` | `gpt-4o-mini` | 轻量级模型（简单任务） |
| `MEDIUM_MODEL` | `gpt-4o` | 中等模型（常规任务） |
| `STRONG_MODEL` | `claude-sonnet-4-20250514` | 强力模型（复杂任务） |

---

## 安全与认证

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `JWT_SECRET` | 生产必需 | JWT 签名密钥，生产环境必须设置强密码 |

**JWT_SECRET 生成建议：**
```bash
openssl rand -base64 32
```

---

## 第三方集成

### 飞书 (Feishu)

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `FEISHU_APP_ID` | 否 | 飞书应用 ID |
| `FEISHU_APP_SECRET` | 否 | 飞书应用密钥 |

配置后可在消息选择器中加载真实的飞书消息，未配置时使用 Mock 数据。

---

## Docker Compose 专用变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `FRONTEND_PORT` | `3000` | 前端外部映射端口 |
| `HTTP_PORT` | `80` | HTTP 外部端口 |
| `HTTPS_PORT` | `443` | HTTPS 外部端口 |

---

## 环境变量优先级

1. 系统环境变量
2. `.env.local`（优先级最高，不提交 Git）
3. `.env.production` / `.env.development`
4. `.env`

---

## 生产环境配置检查清单

部署到生产环境前，请确认以下配置：

- [ ] `NODE_ENV=production`
- [ ] `SERVER_URL` 设置为公网 HTTPS 地址
- [ ] `DATABASE_URL` 使用生产数据库
- [ ] `JWT_SECRET` 设置为强随机字符串（≥32字符）
- [ ] 至少配置一个 LLM API 密钥
- [ ] Redis 和 ChromaDB 可访问
- [ ] 防火墙开放所需端口

---

## 故障排查

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
pg_isready -h localhost -p 5432

# 检查连接字符串
psql "postgresql://user:pass@host:port/dbname"
```

### Redis 连接失败

```bash
# 检查 Redis
redis-cli ping
# 应返回 PONG
```

### 端口冲突

```bash
# 检查端口占用
lsof -i :3000  # 前端端口
lsof -i :9700  # 后端端口
```
