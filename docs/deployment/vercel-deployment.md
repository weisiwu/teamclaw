# Vercel 部署指南

> 本指南说明如何将 teamclaw 前端（Next.js）部署到 Vercel。

---

## 概述

teamclaw 前后端分离架构中：
- **前端**：Next.js 应用 → 部署到 Vercel
- **后端**：Express 应用 → 部署到自托管服务器（Docker / PM2）

Vercel 负责构建和托管 Next.js 前端，通过环境变量配置后端 API 地址。

---

## 前置条件

- [Vercel CLI](https://vercel.com/cli) 已安装：`npm i -g vercel`
- 已登录 Vercel 账号：`vercel login`

---

## 部署步骤

### 方式一：Vercel CLI 部署

```bash
# 进入项目目录
cd /Users/weisiwu_clawbot_mac/Desktop/致富经/apps/teamclaw

# 登录（如需要）
vercel login

# 部署到预览环境
vercel

# 部署到生产环境
vercel --prod
```

### 方式二：Git 集成（推荐）

1. 将项目推送至 GitHub / GitLab / Bitbucket
2. 访问 [vercel.com/new](https://vercel.com/new)
3. 导入项目仓库
4. 配置构建选项

### 配置构建选项

| 设置项 | 值 |
|--------|-----|
| Framework Preset | Next.js |
| Root Directory | `.`（项目根目录） |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NEXT_PUBLIC_API_URL` | `https://teamclaw-api.yourdomain.com` | 后端 API 地址 |
| `NEXT_PUBLIC_SERVER_URL` | `https://teamclaw.yourdomain.com` | 后端服务器公开 URL |
| `NODE_ENV` | `production` | 运行环境 |

> **注意**：LLM API Keys 等敏感信息**不应**放在 Vercel 前端环境变量中，应留在后端服务器的环境变量中。

---

## 前端环境变量（Next.js public）

在 `.env.production`（或 Vercel 控制台）中配置：

```bash
# 前端公开变量（可被客户端代码访问）
NEXT_PUBLIC_API_URL=https://teamclaw-api.yourdomain.com
NEXT_PUBLIC_SERVER_URL=https://teamclaw-api.yourdomain.com
```

这些变量可通过 `process.env.NEXT_PUBLIC_*` 在客户端代码中使用。

---

## 自定义域名

### 1. 添加域名

在 Vercel 项目 → Settings → Domains 中添加自定义域名：
- 生产域名：`teamclaw.yourdomain.com`
- API 子域名：`teamclaw-api.yourdomain.com`（可选，用于后端）

### 2. 配置 DNS

在域名服务商添加 DNS 记录：

| 记录类型 | 名称 | 值 |
|---------|------|-----|
| CNAME | `teamclaw` | `cname.vercel-dns.com` |

### 3. SSL 证书

Vercel 自动为所有自定义域名提供 Let's Encrypt SSL 证书，无需手动配置。

---

## next.config.js 配置

项目根目录 `next.config.js` 已有相关配置：

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基础配置（根据需要调整）
}

module.exports = nextConfig
```

如需针对 Vercel 特殊配置，可添加：

```js
const nextConfig = {
  output: 'standalone',  // 启用 standalone 输出（可选）
  images: {
    domains: ['your-cdn-domain.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}
```

---

## 后端 API 地址配置

前端部署到 Vercel 后，需要告知前端后端 API 的地址。在后端服务器上配置 Nginx/反向代理，将 `/api` 请求转发到 Express（`:9700`）。

推荐 Nginx 配置（后端服务器）：

```nginx
server {
    listen 80;
    server_name teamclaw-api.yourdomain.com;

    # API 反向代理到 Express
    location / {
        proxy_pass http://localhost:9700;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # 健康检查
    location /api/v1/health {
        proxy_pass http://localhost:9700/api/v1/health;
    }
}
```

前端 `.env.production` 中配置：

```bash
NEXT_PUBLIC_API_URL=https://teamclaw-api.yourdomain.com
```

---

## 部署后验证

```bash
# 检查前端是否可访问
curl https://your-vercel-url.vercel.app/api/health

# 检查 API 代理是否通
curl https://teamclaw-api.yourdomain.com/api/v1/health
```

---

## Vercel 团队协作

| 角色 | 权限 |
|------|------|
| Owner | 完整控制，可删除项目 |
| Developer | 可部署到所有环境，不可删除项目 |
| Viewer | 只读权限 |

---

## 常见问题

### Q: Vercel 部署的 Next.js 如何访问本地后端？

A: 通过环境变量 `NEXT_PUBLIC_API_URL` 配置后端地址，Nginx 作为反向代理。

### Q: 支持 SSR（服务端渲染）吗？

A: 支持，Vercel 完整支持 Next.js 的 SSR/SSG 模式。

### Q: 如何回滚到旧版本？

A: Vercel Dashboard → Deployments → 选择旧版本 → "..." → "Promote to Production"
