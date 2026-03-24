# PM2 部署指南

> 使用 PM2 在服务器上部署和守护 teamclaw 后端进程（Express）。

---

## 前提条件

- **Node.js**：>= 18.0.0
- **PM2**：>= 5.0

安装 PM2：

```bash
npm install -g pm2

# 验证安装
pm2 --version
```

---

## 配置文件

`ecosystem.config.js`（项目根目录）：

```js
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
}
```

---

## 构建产物

部署 PM2 前需先构建后端：

```bash
# 编译 TypeScript
cd server
npm run build

# 确认产物存在
ls server/dist/
```

---

## 启动服务

### 开发环境

```bash
# 使用 tsx 监听模式（热重载）
cd server
npx tsx watch src/index.ts
```

### 生产环境

```bash
# 创建日志目录
mkdir -p logs

# 使用 ecosystem.config.js 启动
pm2 start ecosystem.config.js --env production

# 或直接启动
pm2 start server/dist/index.js --name teamclaw-server
```

---

## PM2 常用命令

### 服务管理

```bash
# 查看所有进程
pm2 list

# 查看详细状态
pm2 list --sort=name

# 重启服务
pm2 restart teamclaw-server

# 优雅重启（发送 SIGINT，等待服务处理完毕再杀进程）
pm2 reload teamclaw-server

# 停止服务
pm2 stop teamclaw-server

# 删除进程
pm2 delete teamclaw-server

# 启动时指定环境
pm2 start ecosystem.config.js --env production
```

### 日志查看

```bash
# 查看实时日志
pm2 logs teamclaw-server

# 查看最近 100 行
pm2 logs teamclaw-server --lines 100

# 清空日志文件
pm2 flush

# 监控实时资源使用
pm2 monit
```

### 进程信息

```bash
# 查看详细进程信息
pm2 describe teamclaw-server

# 查看重启历史
pm2 restart teamclaw-server --update-env
pm2 show teamclaw-server
```

---

## 开机自启

```bash
# 生成并配置开机自启脚本
pm2 startup

# 保存当前进程列表
pm2 save

# 或保存到指定文件
pm2 save --force
```

> **注意**：执行 `pm2 startup` 后会输出具体命令（如 `sudo env PATH=...`），需复制执行。

---

## 多进程扩展（可选）

如需利用多核 CPU，可以启动多个实例并在前面加 Nginx 负载均衡：

```js
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'teamclaw-server-1',
      script: './server/dist/index.js',
      instances: 1,
      // ...
    },
    {
      name: 'teamclaw-server-2',
      script: './server/dist/index.js',
      instances: 1,
      // ...
    },
  ],
}
```

Nginx 配置负载均衡：

```nginx
upstream teamclaw_backend {
    least_conn;  # 最少连接优先
    server 127.0.0.1:9700;
    server 127.0.0.1:9701;
}

server {
    location / {
        proxy_pass http://teamclaw_backend;
    }
}
```

> **注意**：多进程模式下需要注意 Redis 连接池和 Session 存储，确保使用 Redis 统一存储而非内存。

---

## 进程异常自动重启

`ecosystem.config.js` 中的相关配置：

```js
{
  // 进程异常退出后自动重启（默认开启）
  autorestart: true,

  // 内存超过 1G 时自动重启（防止内存泄漏）
  max_memory_restart: '1G',

  // 进程异常退出后等待 1 秒再重启
  restart_delay: 1000,

  // 超过 10 次重启失败后不再尝试（防止无限重启）
  max_restarts: 10,
  min_uptime: '5s',
}
```

---

## 日志轮转

PM2 内置日志管理，但建议配合 `logrotate` 进行系统级日志轮转：

```bash
# /etc/logrotate.d/teamclaw
/home/ubuntu/teamclaw/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 与 Docker 对比

| 维度 | Docker | PM2 |
|------|--------|-----|
| 隔离性 | 进程/文件系统隔离 | 共享宿主机内核 |
| 基础设施管理 | 内置 postgres/redis/chroma | 需单独管理 |
| 滚动更新 | `docker-compose up -d` | `pm2 reload` |
| 适用场景 | 完整环境部署 | 纯 Node.js 后端服务 |
| 资源占用 | 较高 | 较低 |
