# LOC.md — 项目定位索引

> 生成时间: 2026-03-24
> 用途: 快速定位 teamclaw 项目中的代码位置

---

## 一、页面路由 → 组件文件映射

| 路由路径          | 文件路径                      |
| ----------------- | ----------------------------- |
| `/`               | `app/page.tsx`                |
| `/login`          | `app/login/page.tsx`          |
| `/tasks`          | `app/tasks/page.tsx`          |
| `/tasks/[id]`     | `app/tasks/[id]/page.tsx`     |
| `/projects`       | `app/projects/page.tsx`       |
| `/projects/[id]`  | `app/projects/[id]/page.tsx`  |
| `/versions`       | `app/versions/page.tsx`       |
| `/versions/new`   | `app/versions/new/page.tsx`   |
| `/versions/[id]`  | `app/versions/[id]/page.tsx`  |
| `/versions/panel` | `app/versions/panel/page.tsx` |
| `/versions/tags`  | `app/versions/tags/page.tsx`  |
| `/branches`       | `app/branches/page.tsx`       |
| `/messages`       | `app/messages/page.tsx`       |
| `/members`        | `app/members/page.tsx`        |
| `/monitor`        | `app/monitor/page.tsx`        |
| `/tags`           | `app/tags/page.tsx`           |
| `/tags/new`       | `app/tags/new/page.tsx`       |
| `/tags/[name]`    | `app/tags/[name]/page.tsx`    |
| `/tokens`         | `app/tokens/page.tsx`         |
| `/settings`       | `app/settings/page.tsx`       |
| `/docs`           | `app/docs/page.tsx`           |
| `/docs/[slug]`    | `app/docs/[slug]/page.tsx`    |
| `/admin/agents`   | `app/admin/agents/page.tsx`   |
| `/admin/audit`    | `app/admin/audit/page.tsx`    |
| `/admin/config`   | `app/admin/config/page.tsx`   |
| `/admin/webhooks` | `app/admin/webhooks/page.tsx` |
| `/agent-team`     | `app/agent-team/page.tsx`     |
| `/capabilities`   | `app/capabilities/page.tsx`   |
| `/cron`           | `app/cron/page.tsx`           |
| `/import`         | `app/import/page.tsx`         |
| 404               | `app/not-found.tsx`           |
| 全局错误          | `app/error.tsx`               |
| 全局布局          | `app/layout.tsx`              |

---

## 二、API 路由 → 服务文件映射

### 2.1 /api/v1/versions

| API 路由                                                  | 对应 Server 路由                          | 服务文件                                 |
| --------------------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| `GET/POST /api/v1/versions`                               | `server/src/routes/version.ts`            | `server/src/services/`                   |
| `GET/PATCH/DELETE /api/v1/versions/[id]`                  | `server/src/routes/version.ts`            | `server/src/services/versionBump.ts`     |
| `GET /api/v1/versions/[id]/timeline`                      | `server/src/routes/versionSummary.ts`     | `server/src/services/`                   |
| `GET /api/v1/versions/[id]/rollback-targets`              | `server/src/routes/versionRollback.ts`    | `server/src/services/rollbackService.ts` |
| `POST /api/v1/versions/[id]/rollback-preview`             | `server/src/routes/versionRollback.ts`    | `server/src/services/rollbackService.ts` |
| `GET /api/v1/versions/[id]/screenshots`                   | `server/src/routes/versionScreenshot.ts`  | `server/src/services/`                   |
| `POST /api/v1/versions/[id]/screenshots`                  | `server/src/routes/versionScreenshot.ts`  | `server/src/services/`                   |
| `GET /api/v1/versions/[id]/screenshots/[screenshotId]`    | `server/src/routes/versionScreenshot.ts`  | `server/src/services/`                   |
| `DELETE /api/v1/versions/[id]/screenshots/[screenshotId]` | `server/src/routes/versionScreenshot.ts`  | `server/src/services/`                   |
| `GET /api/v1/versions/[id]/diff`                          | `server/src/routes/versionDiff.ts`        | `server/src/services/versionDiff.ts`     |
| `GET /api/v1/versions/[id]/diff/commits`                  | `server/src/routes/versionDiff.ts`        | `server/src/services/versionDiff.ts`     |
| `GET /api/v1/versions/change-stats`                       | `server/src/routes/versionChangeStats.ts` | - (inline in route)                      |

### 2.2 /api/v1/tasks

| API 路由                              | 对应 Server 路由            | 服务文件                               |
| ------------------------------------- | --------------------------- | -------------------------------------- |
| `GET/POST /api/v1/tasks`              | `server/src/routes/task.ts` | `server/src/services/taskFlow.ts`      |
| `GET/PATCH/DELETE /api/v1/tasks/[id]` | `server/src/routes/task.ts` | `server/src/services/taskLifecycle.ts` |
| `POST /api/v1/tasks/[id]/complete`    | `server/src/routes/task.ts` | `server/src/services/taskLifecycle.ts` |
| `GET /api/v1/tasks/[id]/comments`     | `server/src/routes/task.ts` | `server/src/services/taskMemory.ts`    |
| `GET /api/v1/tasks/stats`             | `server/src/routes/task.ts` | `server/src/services/taskStats.ts`     |

### 2.3 /api/v1/branches

| API 路由                                 | 对应 Server 路由              | 服务文件                               |
| ---------------------------------------- | ----------------------------- | -------------------------------------- |
| `GET/POST /api/v1/branches`              | `server/src/routes/branch.ts` | `server/src/services/branchService.ts` |
| `GET /api/v1/branches/main`              | `server/src/routes/branch.ts` | `server/src/services/branchService.ts` |
| `GET/PATCH/DELETE /api/v1/branches/[id]` | `server/src/routes/branch.ts` | `server/src/services/branchService.ts` |
| `POST /api/v1/branches/[id]/checkout`    | `server/src/routes/branch.ts` | `server/src/services/gitService.ts`    |
| `POST /api/v1/branches/[id]/protect`     | `server/src/routes/branch.ts` | `server/src/services/branchService.ts` |
| `POST /api/v1/branches/[id]/rename`      | `server/src/routes/branch.ts` | `server/src/services/branchService.ts` |
| `POST /api/v1/branches/[id]/main`        | `server/src/routes/branch.ts` | `server/src/services/branchService.ts` |
| `GET /api/v1/branches/stats`             | `server/src/routes/branch.ts` | `server/src/services/branchService.ts` |

### 2.4 /api/v1/build

| API 路由                                  | 对应 Server 路由                | 服务文件                               |
| ----------------------------------------- | ------------------------------- | -------------------------------------- |
| `POST /api/v1/build/trigger`              | `server/src/routes/build.ts`    | `server/src/services/buildService.ts`  |
| `GET /api/v1/build/stats`                 | `server/src/routes/build.ts`    | `server/src/services/buildService.ts`  |
| `GET/POST /api/v1/build/artifacts`        | `server/src/routes/artifact.ts` | `server/src/services/artifactStore.ts` |
| `GET /api/v1/build/artifacts/[versionId]` | `server/src/routes/artifact.ts` | `server/src/services/artifactStore.ts` |

### 2.5 /api/v1/feishu

| API 路由                       | 对应 Server 路由              | 服务文件                               |
| ------------------------------ | ----------------------------- | -------------------------------------- |
| `POST /api/v1/feishu/messages` | `server/src/routes/feishu.ts` | `server/src/services/feishuService.ts` |
| `GET /api/v1/feishu/chats`     | `server/src/routes/feishu.ts` | `server/src/services/feishuService.ts` |

### 2.6 /api/v1/dashboard

| API 路由                         | 对应 Server 路由                 | 服务文件                                  |
| -------------------------------- | -------------------------------- | ----------------------------------------- |
| `GET /api/v1/dashboard/overview` | `server/src/routes/dashboard.ts` | `server/src/services/dashboardService.ts` |

### 2.7 其他 API 路由

| API 路由                                       | 对应 Server 路由                       | 服务文件                                      |
| ---------------------------------------------- | -------------------------------------- | --------------------------------------------- |
| `GET /api/health`                              | `server/src/routes/health.ts`          | -                                             |
| `GET/POST /api/download`                       | `server/src/routes/download.ts`        | `server/src/services/downloadManager.ts`      |
| `POST /api/v1/auth/login`                      | `server/src/routes/auth.ts`            | `server/src/services/authService.ts`          |
| `GET /api/v1/users/me`                         | `server/src/routes/user.ts`            | `server/src/services/userService.ts`          |
| `GET/POST /api/v1/messages`                    | `server/src/routes/message.ts`         | `server/src/services/messageQueue.ts`         |
| `GET/POST /api/v1/projects`                    | `server/src/routes/project.ts`         | `server/src/services/`                        |
| `GET /api/v1/projects/[id]`                    | `server/src/routes/project.ts`         | `server/src/services/`                        |
| `GET /api/v1/search`                           | `server/src/routes/search.ts`          | `server/src/services/searchService.ts`        |
| `GET/POST /api/v1/tags`                        | `server/src/routes/tag.ts`             | `server/src/services/tagService.ts`           |
| `POST /api/v1/webhooks`                        | `server/src/routes/webhook.ts`         | `server/src/services/webhookService.ts`       |
| `GET /api/v1/wechat/callback`                  | `server/src/routes/wechat.ts`          | `server/src/services/wechatService.ts`        |
| `GET /api/v1/agents`                           | `server/src/routes/agent.ts`           | `server/src/services/agentService.ts`         |
| `GET /api/v1/agents/:id/execute`               | `server/src/routes/agent.ts`           | `server/src/services/agentExecution.ts`       |
| `GET /api/v1/agents/:id/trace`                 | `server/src/routes/trace.ts`           | `server/src/services/`                        |
| `POST /api/v1/llm/chat`                        | `server/src/routes/llm.ts`             | `server/src/services/llmService.ts`           |
| `POST /api/v1/cron/trigger`                    | `server/src/routes/cronJob.ts`         | `server/src/services/cronService.ts`          |
| `GET /api/v1/tokens/stats`                     | `server/src/routes/tokenStats.ts`      | `server/src/services/tokenStatsService.ts`    |
| `GET/POST /api/v1/versions/tags`               | `server/src/routes/versionTag.ts`      | `server/src/services/tagService.ts`           |
| `GET/PATCH /api/v1/versions/[id]/settings`     | `server/src/routes/versionSettings.ts` | `server/src/services/versionSettingsStore.ts` |
| `GET /api/v1/versions/[id]/summary`            | `server/src/routes/versionSummary.ts`  | `server/src/services/`                        |
| `GET /api/v1/versions/[id]/compare/[targetId]` | `server/src/routes/versionCompare.ts`  | `server/src/services/versionCompare.ts`       |

---

## 三、模块依赖关系索引

### 3.1 前端层 (`app/`, `components/`, `hooks/`, `lib/`)

```
app/ (Next.js App Router 页面)
  ├── app/page.tsx                         ← 首页
  ├── app/layout.tsx                        ← 全局布局
  ├── app/error.tsx                         ← 全局错误边界
  │
components/ (可复用 UI 组件)
  ├── ui/                                   ← 基础 UI 组件 (button, dialog, input...)
  ├── layout/                               ← 布局组件 (AppLayout, Header, Sidebar, Breadcrumb...)
  ├── auth/                                 ← 认证组件 (RequireAuth)
  ├── members/                             ← 成员管理组件
  ├── messages/                             ← 消息组件
  ├── tokens/                               ← Token 统计组件
  ├── versions/                             ← 版本管理组件 (大量子组件)
  ├── branch/                               ← 分支管理组件
  ├── team/                                 ← 团队协作组件
  ├── agent-team/                           ← Agent 团队组件
  ├── providers/                            ← React Query Provider
  └── theme/                                ← 主题 Provider
      │
hooks/ (React 自定义 Hooks)
  ├── useAuth.ts                           ← 认证状态
  ├── useAgents.ts                         ← Agent 列表
  ├── useAgentExecution.ts                 ← Agent 执行状态
  ├── useTasks.ts                          ← 任务管理
  ├── useProjects.ts                       ← 项目管理
  ├── useMembers.ts                        ← 成员管理
  ├── useMessages.ts                       ← 消息管理
  ├── useTokens.ts                         ← Token 统计
  ├── useDocs.ts                           ← 文档
  ├── useCapabilities.ts                   ← 功能能力
  ├── useCron.ts                           ← Cron 任务
  ├── useDownloadProgress.ts               ← 下载进度
  └── usePermission.ts                     ← 权限检查
          │
lib/ (前端工具库)
  ├── api/                                  ← API 客户端 (按模块分组的 fetch 封装)
  │   ├── tasks.ts / versions.ts / branches.ts / ...
  │   ├── types.ts                         ← 共享类型定义
  │   └── constants.ts                     ← API 常量
  ├── auth/                                 ← 权限 / 角色 / 团队记忆
  ├── hooks/                               ← useAuth.ts 等
  ├── store/                               ← Zustand 状态管理 (taskStore.ts)
  ├── api-response.ts                       ← API 响应封装
  ├── api-proxy.ts                          ← API 代理
  └── jwt.ts                                ← JWT 工具
```

### 3.2 后端层 (`server/`)

```
server/src/
  ├── index.ts                              ← Express 服务器入口
  │
  ├── config/                               ← 配置 (models.ts)
  ├── constants/                            ← 常量 (agents, roles, apiErrorCodes)
  │
  ├── db/
  │   ├── pg.ts                            ← PostgreSQL 连接
  │   ├── migrations/run.ts                 ← 数据库迁移
  │   └── repositories/                    ← 数据访问层
  │       ├── taskRepo.ts
  │       ├── versionRepo.ts
  │       ├── messageRepo.ts
  │       ├── userRepo.ts
  │       ├── importRepo.ts
  │       ├── cronRepo.ts
  │       └── roleMemoryRepo.ts
  │
  ├── middleware/                           ← Express 中间件
  │   ├── auth.ts                          ← 认证中间件
  │   ├── errorHandler.ts                  ← 错误处理
  │   ├── projectAccess.ts                 ← 项目访问控制
  │   └── validation.ts                    ← 请求验证
  │
  ├── models/                               ← 数据模型/类型
  │   ├── task.ts / version.ts / branch.ts / buildRecord.ts ...
  │   ├── ability.ts / agent.ts / auditLog.ts ...
  │   └── message.ts / project.ts / webhook.ts ...
  │
  ├── routes/                               ← Express 路由
  │   ├── task.ts / version.ts / branch.ts / build.ts ...
  │   ├── auth.ts / user.ts / message.ts / project.ts ...
  │   ├── feishu.ts / wechat.ts / webhook.ts ...
  │   ├── download.ts / doc.ts / search.ts ...
  │   ├── versionBump.ts / versionRollback.ts / versionDiff.ts ...
  │   ├── versionScreenshot.ts / versionTag.ts / versionSettings.ts ...
  │   ├── versionCompare.ts / versionSummary.ts / versionChangeStats.ts ...
  │   ├── agent.ts / ability.ts / tokenStats.ts / trace.ts ...
  │   ├── health.ts / cronJob.ts / llm.ts ...
  │   ├── adminConfig.ts / auditLog.ts / artifact.ts / dashboard.ts ...
  │   └── download.ts
  │
  ├── services/                             ← 业务逻辑层
  │   ├── taskLifecycle.ts / taskFlow.ts / taskInit.ts ...
  │   ├── taskScheduler.ts / taskSLA.ts / taskStats.ts ...
  │   ├── taskToAgent.ts / taskDependencyGraph.ts ...
  │   ├── versionBump.ts / versionDiff.ts / versionCompare.ts ...
  │   ├── versionRollback.ts / versionMemory.ts ...
  │   ├── branchService.ts / gitService.ts / buildService.ts ...
  │   ├── changelogGenerator.ts / changeTracker.ts ...
  │   ├── agentService.ts / agentPipeline.ts / agentExecution.ts ...
  │   ├── agentInit.ts / agentHealth.ts / agentWorkspace.ts ...
  │   ├── feishuService.ts / wechatService.ts / webhookService.ts ...
  │   ├── messageQueue.ts / messageRouter.ts / messagePipeline.ts ...
  │   ├── docService.ts / docParser.ts / docConverter.ts ...
  │   ├── downloadService.ts / downloadManager.ts ...
  │   ├── permissionService.ts / authService.ts ...
  │   ├── priorityCalculator.ts / eventBus.ts ...
  │   ├── vectorStore.ts / contextCompressor.ts ...
  │   ├── llmService.ts / llmCostTracker.ts ...
  │   ├── cronService.ts / resourceLock.ts ...
  │   └── searchService.ts / searchEnhancer.ts ...
  │
  └── utils/                                ← 工具函数
      ├── response.ts                       ← 统一响应格式
      ├── jwt.ts                            ← JWT 工具
      ├── db.ts / redis.ts / config.ts      ← 连接工具
      ├── config-validator.ts               ← 配置验证
      ├── chromadb.ts                       ← 向量数据库
      └── shutdown.ts                       ← 优雅关闭
```

### 3.3 核心服务依赖图（关键路径）

```
API Route (server/src/routes/)
  └─> Service (server/src/services/)
        ├─> Repository (server/src/db/repositories/)
        │     └─> PostgreSQL (pg.ts)
        ├─> Model (server/src/models/)
        ├─> Middleware (server/src/middleware/)
        └─> Utils (server/src/utils/)
```

---

## 四、关键文件速查

| 关键词         | 文件路径                                    |
| -------------- | ------------------------------------------- |
| 任务创建/流转  | `server/src/services/taskFlow.ts`           |
| 任务生命周期   | `server/src/services/taskLifecycle.ts`      |
| 任务初始化     | `server/src/services/taskInit.ts`           |
| 任务指派       | `server/src/services/taskToAgent.ts`        |
| 版本自动升级   | `server/src/services/autoBump.ts`           |
| 版本比对       | `server/src/services/versionCompare.ts`     |
| 版本差异       | `server/src/services/versionDiff.ts`        |
| 版本回滚       | `server/src/services/rollbackService.ts`    |
| 版本历史       | `server/src/services/versionMemory.ts`      |
| 版本变更追踪   | `server/src/services/changeTracker.ts`      |
| Changelog 生成 | `server/src/services/changelogGenerator.ts` |
| 构建触发       | `server/src/services/buildService.ts`       |
| Git 操作       | `server/src/services/gitService.ts`         |
| 分支管理       | `server/src/services/branchService.ts`      |
| 飞书消息       | `server/src/services/feishuService.ts`      |
| LLM 服务       | `server/src/services/llmService.ts`         |
| Agent Pipeline | `server/src/services/agentPipeline.ts`      |
| Agent 执行     | `server/src/services/agentExecution.ts`     |
| 消息队列       | `server/src/services/messageQueue.ts`       |
| 权限控制       | `server/src/services/permissionService.ts`  |
| 向量存储       | `server/src/services/vectorStore.ts`        |
| 文档服务       | `server/src/services/docService.ts`         |
| 下载管理       | `server/src/services/downloadManager.ts`    |
| Cron 调度      | `server/src/services/cronService.ts`        |
| 标签管理       | `server/src/services/tagService.ts`         |
| 前端任务状态   | `lib/store/taskStore.ts`                    |
| API 类型定义   | `lib/api/types.ts`                          |
| 共享 API 工具  | `lib/api-response.ts`                       |

---

## 五、目录结构概览

```
teamclaw/
├── app/                    # Next.js App Router（前端页面 + API 路由）
│   ├── api/                # Next.js API Routes（代理层）
│   │   └── v1/            #  /api/v1/* → server/src/routes/
│   ├── (page).tsx         # 页面组件
│   └── layout.tsx         # 全局布局
├── components/             # React 可复用组件
│   ├── ui/                # shadcn/ui 基础组件
│   ├── versions/          # 版本页专用组件（~40个）
│   ├── layout/            # 布局组件
│   └── ...
├── hooks/                  # 自定义 React Hooks
├── lib/                    # 前端工具库
│   ├── api/               # API 客户端封装
│   ├── auth/             # 认证/权限
│   └── store/            # Zustand 状态
├── server/                 # Express 后端（monorepo 内嵌）
│   └── src/
│       ├── routes/        # 路由定义
│       ├── services/      # 业务逻辑
│       ├── models/        # 数据模型
│       ├── db/            # 数据库层
│       └── middleware/    # 中间件
├── scripts/               # 构建/部署脚本
├── tests/                 # Vitest 测试
├── config/                # 配置文件
└── docs/                  # 项目文档
```
