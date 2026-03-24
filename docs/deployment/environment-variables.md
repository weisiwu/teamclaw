# 环境变量配置说明

> 本文档详细说明 teamclaw 项目所有环境变量的用途、默认值与配置建议。

---

## .env.example（开发环境）

路径：项目根目录 `.env.example`

### LLM API Keys

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `OPENAI_API_KEY` | 条件 | OpenAI API Key（GPT 系列） | `sk-...` |
| `ANTHROPIC_API_KEY` | 条件 | Anthropic API Key（Claude 系列） | `sk-ant-...` |
| `DEEPSEEK_API_KEY` | 条件 | DeepSeek API Key | `sk-...` |

### 自定义模型覆盖（可选）

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LIGHT_MODEL` | `gpt-4o-mini` | 轻量任务使用模型 |
| `MEDIUM_MODEL` | `gpt-4o` | 中等任务使用模型 |
| `STRONG_MODEL` | `claude-sonnet-4-20250514` | 复杂任务使用模型 |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI API 代理/自托管地址 |

### Server

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `9700` | Express 后端服务端口 |

### Database

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/teamclaw` | PostgreSQL 连接字符串（优先使用） |
| `DB_HOST` | `localhost` | PostgreSQL 主机 |
| `DB_PORT` | `5432` | PostgreSQL 端口 |
| `DB_NAME` | `teamclaw` | 数据库名 |
| `DB_USER` | `postgres` | 数据库用户名 |
| `DB_PASSWORD` | `postgres` | 数据库密码 |

### Redis

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `REDIS_URL` | `redis://localhost:6379` | Redis 连接 URL（优先使用） |
| `REDIS_HOST` | `localhost` | Redis 主机 |
| `REDIS_PORT` | `6379` | Redis 端口 |

### ChromaDB

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `CHROMA_URL` | `http://localhost:8000` | ChromaDB 向量数据库地址 |

---

## .env.production.example（生产环境）

路径：项目根目录 `.env.production.example`

> ⚠️ **安全警告**：`.env.production` 包含敏感信息，**禁止**提交到版本控制！

### Application

| 变量名 | 默认值 | 必填 | 说明 |
|--------|--------|------|------|
| `NODE_ENV` | `production` | ✅ | 运行环境标识 |
| `PORT` | `3000` | ✅ | Next.js 前端端口 |
| `SERVER_PORT` | `9700` | ✅ | Express 后端端口 |
| `SERVER_URL` | — | ✅ | 外部可访问的服务器 URL（用于 CORS / Webhook） | `https://teamclaw.yourdomain.com` |

### Database (PostgreSQL)

| 变量名 | 默认值 | 必填 | 说明 |
|--------|--------|------|------|
| `DATABASE_URL` | — | ✅ | PostgreSQL 连接字符串 |
| `DB_HOST` | `postgres` | ✅ | Docker Compose 中服务名 |
| `DB_PORT` | `5432` | — | PostgreSQL 端口 |
| `DB_NAME` | `teamclaw` | — | 数据库名 |
| `DB_USER` | `teamclaw` | — | 数据库用户名 |
| `DB_PASSWORD` | — | ✅ | 数据库密码（强密码，建议 32+ 字符） |

### Redis

| 变量名 | 默认值 | 必填 | 说明 |
|--------|--------|------|------|
| `REDIS_URL` | `redis://redis:6379` | — | Redis 连接 URL |
| `REDIS_HOST` | `redis` | — | Docker Compose 中服务名 |
| `REDIS_PORT` | `6379` | — | Redis 端口 |

### ChromaDB (Vector Store)

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `CHROMA_HOST` | `chroma` | Docker Compose 中服务名 |
| `CHROMA_PORT` | `8000` | ChromaDB 端口 |

### LLM API Keys

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | ✅ | DeepSeek API Key |
| `OPENAI_API_KEY` | ✅ | OpenAI API Key |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API Key |

### Authentication

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `JWT_SECRET` | ✅ | JWT 签名密钥（至少 32 字符随机字符串） |

生成方式：
```bash
# macOS / Linux
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Feishu Integration

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `FEISHU_APP_ID` | 条件 | 飞书应用 App ID（启用飞书渠道时必填） |
| `FEISHU_APP_SECRET` | 条件 | 飞书应用 App Secret |

### Host & Ports（Docker Compose）

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `HOST` | `0.0.0.0` | 绑定地址 |
| `FRONTEND_PORT` | `3000` | 宿主机映射端口（前端） |
| `HTTP_PORT` | `80` | Nginx HTTP 端口 |
| `HTTPS_PORT` | `443` | Nginx HTTPS 端口 |

---

## 环境变量配置检查

项目内置配置校验脚本，启动时自动检查必填变量：

```bash
# 手动验证配置
node /app/server/dist/utils/config-validator.js
```

若缺少必填变量，服务将拒绝启动并输出错误信息。

---

## 多环境配置示例

### 开发环境（本地）

```bash
NODE_ENV=development
PORT=3000
SERVER_PORT=9700
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/teamclaw
REDIS_URL=redis://localhost:6379
CHROMA_URL=http://localhost:8000
OPENAI_API_KEY=sk-dev-test-only
```

### 生产环境（Docker Compose）

```bash
NODE_ENV=production
PORT=3000
SERVER_PORT=9700
SERVER_URL=https://teamclaw.yourdomain.com
DATABASE_URL=postgresql://teamclaw:S3cureP@ssw0rd!@postgres:5432/teamclaw
REDIS_URL=redis://redis:6379
CHROMA_HOST=chroma
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=your-very-long-random-secret-at-least-32-chars
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=your-feishu-app-secret
```

### 生产环境（PM2 独立部署）

```bash
NODE_ENV=production
PORT=3000
SERVER_PORT=9700
SERVER_URL=https://teamclaw.yourdomain.com
DATABASE_URL=postgresql://teamclaw:S3cureP@ssw0rd!@db.yourdomain.com:5432/teamclaw
REDIS_URL=redis://cache.yourdomain.com:6379
CHROMA_URL=http://chroma.yourdomain.com:8000
# LLM Keys / JWT / Feishu 同上
```
