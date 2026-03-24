# 技术栈汇总

> teamclaw 项目完整技术栈说明，包含前端、后端、基础设施、工具链等所有技术选型。

---

## 技术栈总览

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **前端框架** | Next.js | 14.2.35 | React 全栈框架（App Router） |
| **UI 框架** | React | 18 | UI 渲染 |
| **类型系统** | TypeScript | ^5 | 类型安全 |
| **CSS 框架** | TailwindCSS | 3.4.1 | 原子化 CSS |
| **组件库** | Base UI | ^1.3.0 | React 组件库 |
| **状态管理** | Zustand | ^5.0.12 | 轻量状态管理 |
| **数据请求** | TanStack Query | ^5.90.21 | 服务端状态管理 |
| **图表** | Recharts | ^3.8.0 | 数据可视化 |
| **Markdown** | react-markdown | ^10.1.0 | Markdown 渲染 |
| **构建工具** | Vite / Next.js | 内置 | 打包构建 |
| **后端框架** | Express | 4.18.2 | REST API |
| **数据库** | PostgreSQL | 16 | 关系型主数据库 |
| **缓存 / 消息** | Redis | 7 | 缓存、Session、消息队列 |
| **向量数据库** | ChromaDB | latest | 语义检索 / 嵌入向量存储 |
| **ORM** | pg (node-postgres) | ^8.20.0 | PostgreSQL 客户端 |
| **认证** | JWT (jsonwebtoken) | ^9.0.3 | Token 认证 |
| **密码加密** | bcryptjs | ^3.0.3 | 密码哈希 |
| **限流** | express-rate-limit | ^8.3.1 | API 限流 |
| **安全** | helmet | ^8.1.0 | HTTP 安全 Headers |
| **跨域** | cors | ^2.8.5 | 跨域资源共享 |
| **定时任务** | node-cron | ^3.0.3 | 定时任务调度 |
| **文件处理** | archiver / mammoth / pdf-lib | - | 文件打包、Word/PDF 解析 |
| **测试** | Vitest / Jest + Supertest | - | 单元 / 集成测试 |
| **代码规范** | ESLint + Prettier + Husky | - | 代码风格 / Git Hooks |
| **容器化** | Docker + Docker Compose | - | 服务容器化 |
| **进程守护** | PM2 | - | 生产进程管理 |
| **前端托管** | Vercel | - | Next.js 部署 |

---

## 前端技术栈

### 核心框架

```
Next.js 14.2.35        # React 全栈框架，App Router，SSR/SSG
React 18                # UI 库
TypeScript ^5           # 类型系统
```

### UI 与样式

```
TailwindCSS 3.4.1       # 原子化 CSS 框架
@tailwindcss/typography # Markdown 内容排版插件
Base UI 1.3.0           # 低级 React 组件库（headless）
Lucide React 0.577.0    # 图标库
```

### 状态管理与数据

```
Zustand 5.0.12          # 轻量全局状态管理
TanStack Query 5.90.21  # 服务端状态（缓存、自动重试）
```

### 工具库

```
recharts 3.8.0          # 图表库
react-markdown 10.1.0   # Markdown 渲染
remark-gfm 4.0.1        # GFM 语法支持
rehype-highlight 7.0.2  # 代码高亮
rehype-slug 6.0.0       # 自动添加 heading ID
next-themes 0.4.6       # 主题切换
xlsx 0.18.5             # Excel 文件解析
clsx 2.1.1              # 条件 className 工具
tailwind-merge 3.5.0    # Tailwind className 合并
```

### 构建与开发工具

```
Vite 6.0.1              # 底层构建工具（Next.js 内置）
ESLint 8                # 代码检查
Prettier 3.8.1           # 代码格式化
Husky 9.1.7             # Git Hooks
lint-staged 16.4.0      # 暂存文件检查
Vitest 4.1.0            # 测试框架
@vitest/coverage-v8 4.1.0  # 覆盖率
```

---

## 后端技术栈

### 核心框架

```
Express 4.18.2          # Node.js Web 框架
TypeScript 5.3.0        # 类型系统
tsx 4.21.0              # TypeScript 执行器（开发热重载）
node (ESM)              # 使用 ES Module
```

### 数据库与存储

```
pg 8.20.0               # PostgreSQL 客户端
ioredis 5.10.0          # Redis 客户端
chromadb 3.4.0          # ChromaDB Node.js 客户端
```

### 认证与安全

```
jsonwebtoken 9.0.3      # JWT 生成与验证
bcryptjs 3.0.3          # 密码哈希
helmet 8.1.0            # 安全 HTTP Headers
cors 2.8.5              # 跨域资源共享
express-rate-limit 8.3.1 # API 限流
zod 4.3.6               # Schema 验证
```

### 文件处理

```
archiver 7.0.1          # 文件/目录打包
mammoth 1.6.0           # Word (.docx) 文件解析
pdf-lib 1.17.1          # PDF 生成
pdf-parse 1.1.1         # PDF 文本提取
xlsx 0.18.5             # Excel 解析
```

### 定时任务与消息

```
node-cron 3.0.3         # Cron 定时任务
```

### 测试

```
jest 30.3.0             # 测试框架
ts-jest 29.4.6          # TypeScript Jest 转换
supertest 7.2.2         # HTTP 集成测试
@types/supertest 7.2.0  # Supertest 类型
```

### 开发工具

```
ts-node 10.9.2          # TypeScript 执行器
```

---

## 基础设施技术栈

### 容器化

```
Docker                   # 容器化引擎
Docker Compose 3.9       # 多容器编排
```

### 数据存储

```
PostgreSQL 16-alpine     # 关系型数据库（主数据库）
Redis 7-alpine           # 内存数据库（缓存/Session/队列）
ChromaDB (latest)        # 向量数据库（语义检索）
```

### 进程管理

```
PM2 5.x                  # Node.js 生产进程守护
```

### 前端托管

```
Vercel                   # Next.js 前端托管平台
Nginx (alpine)           # 反向代理 / 负载均衡
```

---

## 开发环境工具链

```
Node.js >= 18.0.0        # JavaScript 运行时
npm >= 9.0               # 包管理器
Git >= 2.30              # 版本控制
Docker >= 20.10          # 容器化（可选，生产必须）
```

---

## 端口占用总览

| 端口 | 服务 | 环境 |
|------|------|------|
| 3000 | Next.js 前端 | 开发 / 生产 |
| 9700 | Express 后端 API | 开发 / 生产 |
| 5432 | PostgreSQL | 开发（Docker）/ 生产 |
| 6379 | Redis | 开发（Docker）/ 生产 |
| 8000 | ChromaDB | 开发（Docker）/ 生产 |
| 80 | Nginx HTTP | 生产（Docker） |
| 443 | Nginx HTTPS | 生产（Docker） |

---

## 环境对照表

| 环境 | 说明 | 启动方式 |
|------|------|---------|
| `development` | 本地开发 | `./scripts/dev.sh` |
| `test` | 单元测试 | `npm run test` |
| `production` | 生产部署 | Docker Compose / PM2 |
