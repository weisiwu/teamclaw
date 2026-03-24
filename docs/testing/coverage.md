# 测试覆盖范围说明

## 当前覆盖范围总览

| 模块 | 文件数 | 覆盖内容 |
|------|--------|---------|
| 工具函数 | 12 | `lib/utils.ts`、`env`、`types`、`api-response`、`response`、`roles`、`permissions`、`semver` 等 |
| 中间件 | 2 | `auth.ts`、`errorHandler.ts` |
| 路由层 | 18 | 全部 API 路由（`/api/v1/*`） |
| 数据模型 | 1 | `buildRecord` 模型 |
| 数据库层 | 1 | 数据库版本查询 |
| React 组件 | 1 | `ChangelogPanel` |
| 状态管理 | 2 | `branchStore`、`taskStore` (Zustand) |

## 各模块详细覆盖

### 工具函数层 (`tests/*.test.ts`)

| 被测模块 | 测试文件 | 覆盖内容 |
|---------|---------|---------|
| `lib/utils.ts` — `cn()` | `utils.test.ts` | Tailwind 类名合并、去重、条件类名、clsx 数组支持 |
| 环境变量 | `env.test.ts` | `.env` 解析、变量验证、必要性检查 |
| API 类型 | `apiTypes.test.ts` | TypeScript 类型边界和类型推断 |
| API 响应格式 | `api-response.test.ts` | 成功/错误响应结构序列化 |
| HTTP 响应 | `response.test.ts` | 响应头、状态码、JSON 序列化 |
| 角色系统 | `roles.test.ts` | 角色定义继承链、权限级别 |
| 权限系统 | `permissions.test.ts` | 细粒度权限判断逻辑 |
| 语义化版本 | `semver.test.ts` | 版本比较、预发布版本、大小比较 |
| 优先级计算 | `priorityCalculator.test.ts` | 版本优先级评分 |
| 分支 Store | `branch-store.test.ts` | Zustand store 的 CRUD 状态操作 |
| 任务 Store | `taskStore.test.ts` | Zustand store 的任务状态管理 |
| 文档解析 | `docs.test.ts` | Markdown 解析、标题提取 |
| 文档库 | `docs-lib.test.ts` | 文档辅助函数 |

### 中间件层 (`tests/middleware/`)

| 被测模块 | 测试内容 |
|---------|---------|
| `requireAuth` | 无 Token → 401；有效 dev header → 200；无效 Token → 401/200（取决于 dev mode） |
| `requireAdmin` | 无身份 → 401；非 admin 角色 → 403；admin/vice_admin → 200 |
| `optionalAuth` | 无 Token → 200（user=null）；有 Token → 200（user 注入）；角色正确传递 |
| 全局错误处理 | 404 未找到、500 内部错误、格式错误处理 |

### 路由层 (`tests/routes/`)

| 路由 | 覆盖端点 |
|------|---------|
| `auth.test.ts` | 登录、Token 验证、登出 |
| `build.test.ts` | `GET /builds/:id`、`GET /builds/latest/:versionId`、`GET /builds?versionId=`、buildId 校验、build stats |
| `build-stats.test.ts` | 构建成功率、耗时统计 |
| `build-trigger.test.ts` | 手动触发构建、自动触发条件 |
| `changelog.test.ts` | 变更日志生成、获取 |
| `changelog-diff.test.ts` | 两个版本间的变更差异 |
| `chats.test.ts` | 聊天消息 CRUD |
| `health.test.ts` | 健康检查端点 |
| `llm.test.ts` | LLM 接口调用 |
| `message.test.ts` | 单条消息操作 |
| `messages.test.ts` | 消息列表、分页 |
| `search.test.ts` | 全文搜索 |
| `tag.test.ts` | 标签管理 |
| `task.test.ts` | 单个任务操作 |
| `tasks.test.ts` | 任务列表、批量操作 |
| `version.test.ts` | 版本详情 |
| `version-id.test.ts` | 版本 ID 相关 |
| `versions.test.ts` | 版本列表、创建、更新 |

### 组件层 (`tests/components/`)

| 组件 | 覆盖内容 |
|------|---------|
| `ChangelogPanel.tsx` | 渲染变更列表、change type 标签（feature/fix/improvement/breaking/docs/refactor/other）、生成中状态 |

### 数据库层 (`tests/db/`)

| 模块 | 覆盖内容 |
|------|---------|
| `versions.test.ts` | 数据库版本记录查询、分页 |

### Store 层

| Store | 覆盖内容 |
|-------|---------|
| `branch-store.test.ts` | 分支创建、状态更新、选择分支 |
| `taskStore.test.ts` | 任务添加、完成、删除、筛选 |

## 尚未覆盖的区域

以下模块当前**没有对应的测试文件**，建议后续补充：

| 模块 | 说明 |
|------|------|
| `server/src/routes/` 其他路由 | 部分边缘场景路由可能未覆盖 |
| `lib/api/` API 客户端 | API 请求函数的单元测试 |
| `app/` (Next.js Pages/Routes) | App Router 的 API Route Handler 测试 |
| `middleware.ts` (Next.js) | Next.js 中间件 |
| 错误边界组件 | React Error Boundary 行为测试 |
| 表单组件 | 用户输入验证的组件测试 |
| 端到端测试 | Playwright/Cypress 层面的用户流程测试 |

## 覆盖率查看方式

```bash
# 生成 HTML 覆盖率报告
npm run test:coverage

# 打开报告
open coverage/index.html
```

覆盖率指标说明：

| 指标 | 含义 |
|------|------|
| `% Stmts` | 语句覆盖率 — 执行到的语句比例 |
| `% Branch` | 分支覆盖率 — if/else 等分支覆盖比例 |
| `% Funcs` | 函数覆盖率 — 被调用函数的覆盖比例 |
| `% Lines` | 行覆盖率 — 代码行覆盖比例 |

> **建议目标**：关键业务逻辑（auth、permissions、build trigger）保持 80%+ 语句覆盖率。

## 覆盖率配置

覆盖率配置在 `vitest.config.ts` 中：

```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  exclude: [
    "node_modules",
    "tests",           // 测试代码本身
    "**/*.d.ts",       // 类型声明
    "**/*.config.*",   // 配置文件
    "**/setup.ts",     // setup 文件
  ],
},
```

如需调整覆盖范围，修改 `coverage.include` / `coverage.exclude` 数组。
