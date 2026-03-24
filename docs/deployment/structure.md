# TeamClaw 项目目录结构说明

本文档详细说明 TeamClaw 项目的目录结构和各目录用途。

---

## 根目录概览

```
teamclaw/
├── app/                    # Next.js App Router 前端页面
├── components/             # React 组件库
├── lib/                    # 工具函数和共享逻辑
├── server/                 # Express 后端服务
├── docs/                   # 项目文档
├── scripts/                # 开发和部署脚本
├── tests/                  # 测试文件
├── public/                 # 静态资源
├── deploy/                 # 部署配置
├── config/                 # 运行时配置
├── project/                # 项目相关资源
├── hooks/                  # Git hooks
└── [配置文件]
```

---

## 前端目录 (app/)

Next.js 14+ App Router 结构：

```
app/
├── api/                    # API Routes (Next.js)
│   └── health/            # 健康检查端点
├── login/                 # 登录页面
├── settings/              # 系统设置
├── projects/              # 项目管理
│   └── [id]/             # 项目详情动态路由
├── versions/              # 版本管理
│   ├── new/              # 创建版本
│   ├── panel/            # 版本面板
│   ├── tags/             # 标签管理
│   └── [id]/             # 版本详情
├── branches/              # 分支管理
├── tags/                  # 标签列表
├── tasks/                 # 任务管理
├── members/               # 成员管理
├── messages/              # 消息管理
├── capabilities/          # 能力管理
├── cron/                  # 定时任务
├── monitor/               # 监控面板
├── docs/                  # 文档库
│   └── components/       # 文档相关组件
├── admin/                 # 后台管理
├── agent-team/            # Agent 团队
├── import/                # 项目导入
├── tokens/                # Token 统计
├── error.tsx              # 错误页面
├── layout.tsx             # 根布局
├── page.tsx               # 首页
└── globals.css            # 全局样式
```

---

## 组件目录 (components/)

按功能模块组织的 React 组件：

```
components/
├── ui/                     # 基础 UI 组件 (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── ...
├── versions/              # 版本管理组件
│   ├── VersionList.tsx
│   ├── VersionDetails.tsx
│   ├── BranchManager.tsx
│   ├── MessageSelector.tsx
│   └── ChangelogPanel.tsx
├── projects/              # 项目管理组件
├── tasks/                 # 任务组件
├── members/               # 成员组件
├── auth/                  # 认证相关组件
│   └── RequireAuth.tsx
└── ...
```

---

## 工具库目录 (lib/)

共享的工具函数和配置：

```
lib/
├── api/                    # API 客户端
│   ├── types.ts           # TypeScript 类型定义
│   ├── versions.ts        # 版本 API
│   ├── projects.ts        # 项目 API
│   ├── builds.ts          # 构建 API
│   ├── branches.ts        # 分支 API
│   └── ...
├── auth/                  # 认证逻辑
│   ├── roles.ts           # 角色定义
│   └── permissions.ts     # 权限检查
├── hooks/                 # 自定义 React Hooks
│   ├── useAuth.ts
│   ├── useCron.ts
│   └── ...
├── utils/                 # 工具函数
│   ├── api-response.ts    # API 响应封装
│   └── ...
└── ...
```

---

## 后端目录 (server/)

Express.js 服务端代码：

```
server/
├── src/
│   ├── index.ts           # 服务入口
│   ├── routes/            # API 路由
│   │   ├── version.ts     # 版本路由
│   │   ├── build.ts       # 构建路由
│   │   ├── project.ts     # 项目路由
│   │   ├── health.ts      # 健康检查
│   │   ├── feishu.ts      # 飞书集成
│   │   └── ...
│   ├── models/            # 数据模型
│   │   ├── version.ts
│   │   ├── buildRecord.ts
│   │   └── ...
│   ├── middleware/        # Express 中间件
│   │   ├── auth.ts        # 认证中间件
│   │   ├── errorHandler.ts # 错误处理
│   │   ├── validation.ts  # 参数校验
│   │   └── projectAccess.ts # 项目权限
│   ├── services/          # 业务逻辑服务
│   │   ├── buildService.ts
│   │   ├── rollbackService.ts
│   │   └── ...
│   ├── db/                # 数据库相关
│   │   ├── migrations/    # SQL 迁移文件
│   │   └── sqlite.ts      # SQLite 连接
│   └── utils/             # 服务端工具
│       ├── response.ts    # 响应封装
│       └── db.ts          # PostgreSQL 连接
├── dist/                  # 编译输出
├── package.json           # 服务端依赖
└── tsconfig.json          # TypeScript 配置
```

---

## 文档目录 (docs/)

项目文档组织：

```
docs/
├── deployment/            # 部署文档
│   ├── environment.md    # 环境变量
│   ├── deployment.md     # 部署流程
│   ├── database.md       # 数据库
│   └── operations.md     # 运维操作
├── client/               # 客户端文档
├── server/               # 服务端文档
├── testing/              # 测试文档
├── iterators/            # 迭代记录
├── modules/              # 模块说明
└── [系统架构文档]
```

---

## 脚本目录 (scripts/)

开发和部署脚本：

```
scripts/
├── dev.sh                 # 开发环境启动脚本
├── build.sh               # 生产构建脚本
├── db-init.sql            # 数据库初始化
├── backup.sh              # 备份脚本
└── deploy/
    └── nginx.conf         # Nginx 配置模板
```

---

## 测试目录 (tests/)

测试文件组织：

```
tests/
├── routes/                # API 路由测试
│   ├── versions.test.ts
│   ├── build.test.ts
│   ├── health.test.ts
│   └── ...
├── models/                # 模型测试
│   └── buildRecord.test.ts
├── middleware/            # 中间件测试
│   └── errorHandler.test.ts
├── components/            # 组件测试
│   └── ChangelogPanel.test.tsx
├── db/                    # 数据库测试
│   └── versions.test.ts
├── api-response.test.ts   # API 响应测试
├── permissions.test.ts    # 权限测试
├── roles.test.ts          # 角色测试
└── ...
```

---

## 配置文件说明

### 核心配置

| 文件 | 用途 |
|------|------|
| `package.json` | npm 脚本和依赖 |
| `next.config.js` | Next.js 配置 |
| `tsconfig.json` | TypeScript 配置 |
| `tailwind.config.ts` | Tailwind CSS 配置 |
| `vitest.config.ts` | 测试配置 |
| `middleware.ts` | Next.js 中间件 |

### 环境配置

| 文件 | 用途 |
|------|------|
| `.env.example` | 开发环境变量模板 |
| `.env.production.example` | 生产环境变量模板 |
| `ecosystem.config.js` | PM2 配置 |
| `docker-compose.yml` | Docker 编排配置 |
| `Dockerfile` | 容器镜像构建 |

### 代码规范

| 文件 | 用途 |
|------|------|
| `.eslintrc.json` | ESLint 规则 |
| `.prettierrc` | Prettier 格式 |
| `.gitignore` | Git 忽略规则 |
| `.husky/` | Git hooks |

---

## 数据目录（运行时）

```
data/                      # 运行时数据（自动生成）
├── build_records.json    # 构建记录缓存
├── auditLogs.json        # 审计日志
└── uploads/              # 上传文件存储

logs/                      # 日志文件（PM2）
├── server-out.log
├── server-error.log
└── frontend-out.log
```

---

## 开发工作流

### 添加新页面

```
1. 在 app/ 下创建目录（如 app/new-feature/）
2. 创建 page.tsx 和 layout.tsx
3. 在 components/ 下创建相关组件
4. 在 lib/api/ 下添加 API 调用
5. 添加路由测试
```

### 添加新 API

```
1. 在 server/src/routes/ 下创建路由文件
2. 在 server/src/models/ 下定义数据模型
3. 在 server/src/services/ 下实现业务逻辑
4. 在 lib/api/types.ts 添加类型定义
5. 在 lib/api/ 下添加客户端封装
6. 添加 API 测试
```

### 添加数据库迁移

```
1. 在 server/src/db/migrations/ 创建 SQL 文件
2. 命名格式：YYYYMMDD_NNN_description.sql
3. 运行 npm run migrate 测试
```
