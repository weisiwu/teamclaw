# 测试目录结构

## 顶层结构

```
teamclaw/
├── tests/                    # 所有测试文件集中于此
│   ├── setup.ts             # 全局 setup（jest-dom 导入）
│   ├── helpers/             # 测试辅助工具
│   ├── components/          # React 组件测试
│   ├── db/                  # 数据库相关测试
│   ├── middleware/          # Express 中间件测试
│   ├── models/              # 数据模型测试
│   ├── routes/              # API 路由集成测试
│   └── *.test.ts            # 工具函数 / 业务逻辑单元测试
├── vitest.config.ts         # Vitest 主配置
└── docs/testing/            # 测试文档目录
```

## 目录职责说明

### `tests/` — 根测试文件

纯函数工具和业务逻辑的单元测试，无需任何外部依赖模拟。

| 文件 | 覆盖内容 |
|------|---------|
| `utils.test.ts` | `lib/utils.ts` — Tailwind 类名合并工具 `cn()` |
| `env.test.ts` | 环境变量解析和验证 |
| `apiTypes.test.ts` | API 类型定义（TypeScript 类型校验） |
| `api-response.test.ts` | 统一 API 响应格式 |
| `response.test.ts` | HTTP 响应辅助函数 |
| `roles.test.ts` | 用户角色定义和权限映射 |
| `permissions.test.ts` | 权限检查逻辑 |
| `semver.test.ts` | 语义化版本比较逻辑 |
| `priorityCalculator.test.ts` | 优先级计算器 |
| `branch-store.test.ts` | 分支状态管理（Zustand store） |
| `taskStore.test.ts` | 任务状态管理（Zustand store） |
| `docs.test.ts` | 文档解析逻辑 |
| `docs-lib.test.ts` | 文档工具函数库 |

### `tests/helpers/`

测试专用的工厂函数和辅助工具，**不是被测代码**，仅供测试使用。

| 文件 | 说明 |
|------|------|
| `helpers/setup.ts` | `createTestApp()` / `createFullApp()` — 创建测试用 Express app |
| `helpers/auth.ts` | 认证测试辅助函数（生成测试 token、模拟用户 header） |

### `tests/middleware/`

Express 中间件测试，使用 `supertest` 对 HTTP 层直接发起请求。

| 文件 | 覆盖内容 |
|------|---------|
| `auth.test.ts` | `requireAuth` / `requireAdmin` / `optionalAuth` 中间件 |
| `errorHandler.test.ts` | 全局错误处理中间件 |

### `tests/routes/`

API 路由集成测试，使用 `supertest` 发送真实 HTTP 请求，验证路由行为。

| 文件 | 覆盖内容 |
|------|---------|
| `auth.test.ts` | 认证相关 API |
| `build.test.ts` | 构建记录 CRUD |
| `build-stats.test.ts` | 构建统计 |
| `build-trigger.test.ts` | 构建触发 |
| `changelog.test.ts` | 变更日志 |
| `changelog-diff.test.ts` | 变更差异对比 |
| `chats.test.ts` | 聊天消息 |
| `health.test.ts` | 健康检查端点 |
| `llm.test.ts` | LLM 集成 |
| `message.test.ts` / `messages.test.ts` | 消息接口 |
| `search.test.ts` | 搜索接口 |
| `tag.test.ts` | 标签管理 |
| `task.test.ts` / `tasks.test.ts` | 任务管理 |
| `version.test.ts` | 版本详情 |
| `version-id.test.ts` | 版本 ID 相关 |
| `versions.test.ts` | 版本列表 |

### `tests/components/`

React 组件测试，使用 `@testing-library/react` 渲染组件并验证 UI 行为。

| 文件 | 覆盖内容 |
|------|---------|
| `ChangelogPanel.test.tsx` | `components/versions/ChangelogPanel.tsx` 渲染和交互 |

### `tests/db/`

数据库层测试，验证数据库模型和 SQL 查询。

| 文件 | 覆盖内容 |
|------|---------|
| `versions.test.ts` | 数据库版本记录查询逻辑 |

### `tests/models/`

数据模型单元测试，验证业务模型的序列化和校验。

| 文件 | 覆盖内容 |
|------|---------|
| `buildRecord.test.ts` | BuildRecord 数据结构 |

## `__tests__` vs `tests/` 命名约定

本项目**统一使用 `tests/` 目录**，未使用 `__tests__` 命名法。

两种命名风格对比：

| 风格 | 说明 |
|------|------|
| `__tests__/` | Jest 默认约定，将测试目录隐藏在源文件旁 |
| `tests/` | Vitest 推荐约定，测试与源码分离，结构更清晰 |

本项目采用 `tests/` 集中管理，原因：
- 所有测试一目了然，无需在多个源码目录中寻找
- 与 `docs/`、`scripts/` 等目录结构对齐
- Vitest 对两种命名均支持

## 命名规范

测试文件命名遵循 Vitest/Jest 约定：

| 模式 | 用途 |
|------|------|
| `*.test.ts` | 标准测试文件 |
| `*.spec.ts` | 同样被识别（与 `*.test.ts` 等效） |
| `setup.ts` | 环境配置，非测试文件（`*.test.ts` 不会被误识别） |

## 辅助工具使用

```typescript
// tests/helpers/setup.ts 导出工厂函数
import { createTestApp } from '../helpers/setup';

// 创建测试用 Express app，挂载指定路由
const app = createTestApp('/api/v1/builds', buildRouter);

// 使用 supertest 发送请求
import request from 'supertest';
const res = await request(app).get('/api/v1/builds/br-test-1');
expect(res.status).toBe(200);
```
