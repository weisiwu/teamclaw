# TeamClaw 部署流程文档

本文档介绍 TeamClaw 的三种部署方式：Docker Compose（推荐）、Vercel、PM2。

---

## 方案一：Docker Compose 部署（推荐）

适用于生产环境，一键部署所有依赖服务。

### 前置要求

- Docker 20.10+ 和 Docker Compose 2.0+
- 4GB+ 可用内存
- 20GB+ 磁盘空间

### 部署步骤

#### 1. 准备环境文件

```bash
cd /path/to/teamclaw

# 复制生产环境配置
cp .env.production.example .env.production

# 编辑配置（填入实际值）
nano .env.production
```

#### 2. 配置 SSL 证书（生产必需）

```bash
# 创建证书目录
mkdir -p deploy/certs

# 复制证书文件
cp your-domain.crt deploy/certs/
cp your-domain.key deploy/certs/
```

编辑 `deploy/nginx.conf` 启用 HTTPS：

```nginx
server {
    listen 443 ssl;
    server_name teamclaw.yourdomain.com;
    
    ssl_certificate /etc/nginx/certs/your-domain.crt;
    ssl_certificate_key /etc/nginx/certs/your-domain.key;
    
    # ... 其他配置
}
```

#### 3. 启动服务

```bash
# 拉取镜像并启动
docker-compose -f docker-compose.yml up -d

# 查看启动日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f server
```

#### 4. 运行数据库迁移

```bash
# 进入后端容器
docker-compose exec server node dist/db/migrations/run.js

# 或自动运行（推荐）
docker-compose exec server sh -c "npm run migrate"
```

#### 5. 验证部署

```bash
# 检查所有服务状态
docker-compose ps

# 健康检查
curl http://localhost:3000/api/health
curl http://localhost:9700/api/v1/health/detailed
```

### 常用命令

```bash
# 停止服务
docker-compose down

# 停止并删除数据卷（⚠️ 谨慎使用）
docker-compose down -v

# 重启服务
docker-compose restart

# 更新镜像后重新部署
docker-compose pull
docker-compose up -d

# 查看资源使用
docker stats
```

---

## 方案二：Vercel 部署（前端）

适用于快速部署前端，后端需单独部署。

### 前置要求

- Vercel 账号
- GitHub/GitLab 仓库已关联

### 部署步骤

#### 1. 准备项目

```bash
# 确保 vercel.json 存在
cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-backend.com/api/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://your-backend.com"
  }
}
EOF
```

#### 2. 部署到 Vercel

```bash
# 使用 Vercel CLI
npm i -g vercel
vercel --prod

# 或在 GitHub 推送后自动部署
```

#### 3. 配置环境变量

在 Vercel Dashboard → Project Settings → Environment Variables 中设置：

| 变量名 | 值 |
|--------|-----|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.com` |
| `NEXT_PUBLIC_APP_NAME` | `TeamClaw` |

### 注意事项

- Vercel 部署仅包含前端，后端 API 需要单独部署
- Serverless Functions 超时限制为 10s（Hobby）/ 60s（Pro）
- 文件上传大小限制为 4.5MB

---

## 方案三：PM2 部署（传统服务器）

适用于自有服务器或 VPS 部署。

### 前置要求

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- ChromaDB（可选，用于向量搜索）

### 部署步骤

#### 1. 安装依赖

```bash
# 全局安装 PM2
npm install -g pm2

# 安装项目依赖
npm ci --legacy-peer-deps

# 安装后端依赖
cd server && npm ci --legacy-peer-deps && cd ..
```

#### 2. 构建项目

```bash
# 构建前端
npm run build

# 构建后端
cd server && npm run build && cd ..
```

#### 3. 配置 PM2

编辑 `ecosystem.config.js`：

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
    {
      name: 'teamclaw-frontend',
      script: './node_modules/.bin/next',
      args: 'start',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

#### 4. 启动服务

```bash
# 创建日志目录
mkdir -p logs

# 启动 PM2
pm2 start ecosystem.config.js --env production

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

#### 5. 配置 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/teamclaw
server {
    listen 80;
    server_name teamclaw.yourdomain.com;
    
    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 后端 API
    location /api/ {
        proxy_pass http://localhost:9700;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/teamclaw /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### PM2 常用命令

```bash
# 查看状态
pm2 status
pm2 monit

# 日志管理
pm2 logs
tail -f logs/server-out.log

# 重启/停止
pm2 restart teamclaw-server
pm2 stop teamclaw-frontend
pm2 restart all

# 更新部署
pm2 reload all
```

---

## 部署方式对比

| 特性 | Docker Compose | Vercel + 后端 | PM2 |
|------|----------------|---------------|-----|
| 复杂度 | 低 | 中 | 高 |
| 扩展性 | 高 | 中 | 中 |
| 维护成本 | 低 | 低 | 中 |
| 适合场景 | 生产环境 | 快速原型 | 自有服务器 |
| 依赖管理 | 自动 | 手动 | 手动 |
| SSL 配置 | 自动 | 自动 | 手动 |

---

## 故障排查

### Docker 容器无法启动

```bash
# 查看详细日志
docker-compose logs --tail=100 server

# 检查端口冲突
netstat -tlnp | grep 3000

# 重置容器状态
docker-compose down
docker-compose up -d
```

### PM2 进程频繁重启

```bash
# 查看错误日志
pm2 logs teamclaw-server --err

# 检查内存使用
pm2 monit

# 增加内存限制
pm2 reload ecosystem.config.js --update-env
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 验证连接
psql $DATABASE_URL -c "SELECT 1"
```
