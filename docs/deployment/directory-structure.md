# 目录结构说明

> teamclaw 项目完整目录结构与关键文件说明。

---

## 根目录结构

```
teamclaw/
├── app/                      # Next.js App Router 页面
├── components/               # React 可复用组件
├── hooks/                    # 自定义 React Hooks
├── lib/                      # 工具函数库（API 客户端等）
├── public/                   # 静态资源（favicon、logo 等）
├── server/                   # Express 后端服务
├── src/                      # 共享源码（待迁移）
├── tests/                    # 测试文件
│
├── docs/                     # 项目文档
│   ├── deployment/           # 配置与部署文档 ⭐
│   ├── modules/              # 各功能模块设计文档
│   └── iterators/            # 迭代记录文档
│
├── scripts/                  # Shell 运维脚本
│   ├── dev.sh                # 开发环境一键启动脚本 ⭐
│   ├── deploy.sh             # 生产部署脚本 ⭐
│   ├── build.sh              # 生产构建脚本 ⭐
│   ├── backup.sh             # 数据备份脚本 ⭐
│   ├── restore.sh            # 数据恢复脚本 ⭐
│   ├── db-init.sh            # 数据库初始化脚本 ⭐
│   ├── db-init.sql           # PostgreSQL 初始化 SQL ⭐
│   └── migrate-sqlite-to-pg.ts  # SQLite→PG 迁移工具
│
├── deploy/                   # 部署配置
│   └── nginx.conf            # Nginx 反向代理配置 ⭐
│
├── config/                   # 项目配置
│
├── project/                  # 团队协作任务/文档
│   ├── tasks/                # 任务文件
│   └── 技术方案设计/          # 技术方案文档
│
├── .env.example              # 环境变量模板（开发） ⭐
├── .env.production.example   # 环境变量模板（生产） ⭐
├── .eslintrc.json            # ESLint 配置
├── .prettierrc               # Prettier 配置
├── .gitignore                # Git 忽略规则
├── ecosystem.config.js       # PM2 配置 ⭐
├── Dockerfile                # 多阶段构建 Docker 镜像 ⭐
├── docker-compose.yml        # Docker Compose 编排 ⭐
├── next.config.js            # Next.js 配置
├── tailwind.config.ts        # TailwindCSS 配置
├── tsconfig.json             # 前端 TypeScript 配置
├── package.json              # 前端依赖与脚本 ⭐
├── package-lock.json
├── vitest.config.ts          # Vitest 测试配置
└── postcss.config.mjs        # PostCSS 配置
```

---

## 前端目录（Next.js）

```
app/                          # Next.js App Router
├── layout.tsx                # 根布局（字体、主题、Provider）
├── page.tsx                  # 首页
├── globals.css               # 全局样式
├── api/                      # Next.js API Routes（如健康检查）
│   └── health/
│       └── route.ts
├── (auth)/                   # 认证相关页面（如有）
└── ...                       # 其他业务页面

components/                   # 可复用 React 组件
├── ui/                       # 基础 UI 组件（Button、Input 等）
├── layout/                   # 布局组件（Header、Sidebar 等）
├── project/                  # 项目相关组件
├── task/                     # 任务相关组件
└── ...

hooks/                        # 自定义 React Hooks
├── useAuth.ts
├── useProject.ts
└── useTask.ts

lib/                          # 工具函数
├── api.ts                    # API 请求客户端
├── auth.ts                   # 认证相关工具
└── utils.ts                  # 通用工具函数
```

---

## 后端目录（Express）

```
server/
├── src/
│   ├── index.ts              # 后端入口文件 ⭐
│   ├── routes/               # 路由定义
│   │   ├── index.ts          # 路由汇总
│   │   ├── auth.ts           # 认证路由
│   │   ├── projects.ts       # 项目路由
│   │   ├── tasks.ts          # 任务路由
│   │   └── health.ts         # 健康检查路由 ⭐
│   ├── middleware/           # Express 中间件
│   │   ├── auth.ts           # JWT 认证中间件
│   │   ├── cors.ts           # CORS 中间件
│   │   ├── rateLimit.ts      # 限流中间件
│   │   └── helmet.ts          # 安全 Headers
│   ├── services/             # 业务逻辑层
│   ├── db/                   # 数据库相关
│   │   ├── index.ts          # 数据库连接
│   │   └── migrations/       # 数据库迁移文件
│   ├── utils/                # 工具函数
│   │   └── config-validator.ts  # 配置校验工具 ⭐
│   └── types/                # TypeScript 类型定义
├── dist/                     # 编译产物（git 忽略） ⭐
├── package.json              # 后端依赖与脚本 ⭐
└── tsconfig.json             # 后端 TypeScript 配置
```

---

## scripts/ 目录详解

| 文件 | 用途 |
|------|------|
| `dev.sh` | 开发环境一键启动（支持多种模式） |
| `deploy.sh` | 生产环境 Docker 部署 |
| `build.sh` | 生产构建（前端 + 后端 TypeScript 编译） |
| `backup.sh` | 数据备份（PostgreSQL + Redis + 本地数据） |
| `restore.sh` | 数据恢复 |
| `db-init.sh` | 数据库初始化检查 |
| `db-init.sql` | PostgreSQL 初始化 SQL |
| `db-seed.sh` | 种子数据填充 |
| `migrate-sqlite-to-pg.ts` | SQLite 到 PostgreSQL 数据迁移 |

---

## docs/ 目录详解

```
docs/
├── deployment/               # 配置与部署文档 ⭐（本文档目录）
│   ├── README.md            # 部署文档总览
│   ├── environment-variables.md
│   ├── docker-deployment.md
│   ├── vercel-deployment.md
│   ├── pm2-deployment.md
│   ├── database-migration.md
│   ├── operations.md
│   ├── directory-structure.md
│   ├── package-scripts.md
│   └── tech-stack.md
│
├── modules/                 # 各功能模块设计文档
│   ├── 部署方案.md           # 部署架构设计（早期版本）
│   ├── 技术选型.md
│   ├── Agent编排模块.md
│   ├── 任务机制模块.md
│   ├── 版本管理模块.md
│   ├── 消息机制模块.md
│   ├── 人员与权限模块.md
│   ├── 项目导入模块.md
│   └── 辅助能力模块.md
│
└── iterators/               # 迭代工作记录
    ├── 01【P0】...md
    ├── 02【P0】...md
    └── ...
```

---

## 关键文件说明

| 文件/目录 | 说明 | 提交前检查 |
|-----------|------|-----------|
| `.env` | 环境变量（包含敏感信息） | ⚠️ 禁止提交 |
| `.env.production` | 生产环境变量 | ⚠️ 禁止提交 |
| `node_modules/` | 依赖包 | ⚠️ 禁止提交 |
| `.next/` | Next.js 构建产物 | ⚠️ 禁止提交 |
| `server/dist/` | 后端编译产物 | ⚠️ 禁止提交 |
| `logs/` | 日志文件 | ⚠️ 禁止提交 |
| `backups/` | 备份文件 | ⚠️ 禁止提交 |
| `*.log` | 日志文件 | ⚠️ 禁止提交 |
| `.DS_Store` | macOS 系统文件 | ⚠️ 禁止提交 |
