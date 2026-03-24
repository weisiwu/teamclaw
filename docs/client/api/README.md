# 前端 API 层文档

> 📅 更新日期：2026-03-24
> 📁 路径：`lib/api/` + `app/api/` 目录

---

## 目录结构

```
docs/client/api/
├── README.md                    # 本索引文件
├── projects.md                  # 项目管理 API
├── versions.md                 # 版本管理 API
├── version-crud.md            # 版本 CRUD API（iter-20 拆分）
├── version-build.md            # 版本构建 API
├── version-compare.md         # 版本对比 API
├── version-rollback.md        # 版本回退 API
├── version-screenshot.md       # 版本截图 API
├── version-summary.md         # 版本摘要 API
├── version-tag.md             # 版本标签 API
├── version-settings.md        # 版本设置 API
├── agents.md                  # Agent API
├── agent-execution.md         # Agent 执行 API
├── tasks.md                  # 任务管理 API
├── branches.md               # 分支管理 API
├── tags.md                  # 标签管理 API
├── tokens.md                # Token 管理 API
├── members.md               # 成员管理 API
├── messages.md              # 消息 API
├── capabilities.md          # 能力配置 API
├── search.md               # 搜索 API
├── docs.md                # 文档 API
├── cron.md                # 定时任务 API
├── builds.md              # 构建 API
├── artifacts.md            # 构建产物 API
├── dashboard.md            # 仪表盘 API
├── download.md            # 下载 API
├── audit-logs.md          # 审计日志 API
├── webhooks.md            # Webhook API
├── team.md                # 团队 API
├── feishu.md             # 飞书集成 API
├── admin-config.md        # 管理配置 API
└── api-shared.md         # API 共享工具
```

---

## API 调用规范

### 基础 URL

| 环境 | 基础 URL |
|---|---|
| 本地开发 | `http://localhost:9700/api/v1` |
| 生产环境 | `https://api.teamclaw.com/api/v1` |

### 认证

所有 API 请求需要携带 JWT Token：

```typescript
// 在请求头中附加 Token
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
}
```

### 封装函数

前端通过 `lib/api/` 下的封装函数调用 API，避免直接使用 `fetch`：

```typescript
import { fetchVersions, fetchVersionById } from '@/lib/api/versions';

// 获取列表
const versions = await fetchVersions({ page: 1, pageSize: 20 });

// 获取详情
const version = await fetchVersionById('v123');
```

### fetchWithAuth 封装

所有 API 调用通过 `fetchWithAuth` 统一封装：

```typescript
// lib/api-shared.ts
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}
```

### 错误响应格式

统一错误响应格式：

```typescript
interface ApiError {
  error: string;      // 错误消息
  code: string;       // 错误码
  message: string;    // 用户可见消息
  requestId: string;  // 请求追踪 ID
}
```

### 成功响应格式

```typescript
interface ApiSuccess<T> {
  data: T;
  code: string;       // 'SUCCESS' 或其他成功码
  message?: string;    // 可选的消息
}
```

---

## Next.js API Routes (`app/api/`)

Next.js API Routes 主要作为 BFF（Backend for Frontend）层，将请求代理到后端 Express 服务。

### 路由列表

#### 健康检查

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/health` | GET | 健康检查，无需认证 |

#### 分支管理 (`/api/v1/branches`)

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/v1/branches` | GET | 获取分支列表 |
| `/api/v1/branches` | POST | 创建分支 |
| `/api/v1/branches/:id` | GET | 获取分支详情 |
| `/api/v1/branches/:id/rename` | POST | 重命名分支 |
| `/api/v1/branches/:id/checkout` | POST | 检出分支 |
| `/api/v1/branches/:id/protect` | POST | 保护分支 |
| `/api/v1/branches/:id/main` | POST | 设为默认分支 |
| `/api/v1/branches/main` | GET | 获取默认分支 |
| `/api/v1/branches/stats` | GET | 获取分支统计 |

#### 版本管理 (`/api/v1/versions`)

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/v1/versions` | GET | 获取版本列表 |
| `/api/v1/versions` | POST | 创建版本 |
| `/api/v1/versions/:id` | GET | 获取版本详情 |
| `/api/v1/versions/:id/changelog` | GET | 获取变更日志 |
| `/api/v1/versions/:id/changelog/generate` | POST | 生成变更日志 |
| `/api/v1/versions/:id/timeline` | GET | 获取版本时间线 |
| `/api/v1/versions/:id/screenshots` | GET/POST | 截图管理 |
| `/api/v1/versions/:id/rollback-preview` | GET | 回退预览 |
| `/api/v1/versions/:id/rollback-targets` | GET | 可回退版本列表 |
| `/api/v1/versions/changelog/diff` | GET | 版本对比 |
| `/api/v1/versions/change-stats` | GET | 变更统计 |

#### 构建 (`/api/v1/build`)

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/v1/build/trigger` | POST | 触发构建 |
| `/api/v1/build/stats` | GET | 构建统计 |
| `/api/v1/build/artifacts` | GET/POST | 构建产物 |
| `/api/v1/build/artifacts/:versionId` | GET | 特定版本的产物 |

#### 任务 (`/api/v1/tasks`)

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/v1/tasks` | GET | 获取任务列表 |
| `/api/v1/tasks` | POST | 创建任务 |
| `/api/v1/tasks/:id` | GET | 获取任务详情 |
| `/api/v1/tasks/:id/comments` | GET | 获取任务评论 |
| `/api/v1/tasks/:id/complete` | POST | 完成任务 |
| `/api/v1/tasks/stats` | GET | 任务统计 |

#### 仪表盘 (`/api/v1/dashboard`)

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/v1/dashboard/overview` | GET | 获取概览数据 |

#### 飞书集成 (`/api/v1/feishu`)

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/v1/feishu/messages` | POST | 发送飞书消息 |
| `/api/v1/feishu/chats` | GET | 获取群聊列表 |

---

## lib/api/ 模块说明

| 模块 | 文件 | 说明 |
|---|---|---|
| versions | `versions.ts` | 版本管理（主模块，包含 CRUD + 其他功能） |
| versionCrud | `versionCrud.ts` | 版本 CRUD（iter-20 从 versions 拆分） |
| versionBuild | `versionBuild.ts` | 版本构建（iter-20 新增） |
| versionCompare | `versionCompare.ts` | 版本对比 |
| versionRollback | `versionRollback.ts` | 版本回退 |
| versionScreenshot | `versionScreenshot.ts` | 版本截图 |
| versionSummary | `versionSummary.ts` | 版本摘要 |
| versionTag | `versionTag.ts` | 版本标签 |
| versionSettings | `versionSettings.ts` | 版本设置 |
| versionShared | `versionShared.ts` | 版本共享类型/常量 |
| projects | `projects.ts` | 项目管理 |
| agents | `agents.ts` | Agent 管理 |
| agentExecution | `agentExecution.ts` | Agent 执行 |
| tasks | `tasks.ts` | 任务管理 |
| branches | `branches.ts` | 分支管理 |
| tags | `tags.ts` | 标签管理 |
| tokens | `tokens.ts` | Token 管理 |
| members | `members.ts` | 成员管理 |
| messages | `messages.ts` | 消息管理 |
| capabilities | `capabilities.ts` | 能力配置 |
| search | `search.ts` | 搜索 |
| docs | `docs.ts` | 文档 |
| cron | `cron.ts` | 定时任务 |
| builds | `builds.ts` | 构建 |
| artifacts | `artifacts.ts` | 构建产物 |
| dashboard | `dashboard.ts` | 仪表盘 |
| download | `download.ts` | 下载 |
| auditLogs | `auditLogs.ts` | 审计日志 |
| webhooks | `webhooks.ts` | Webhook |
| team | `team.ts` | 团队 |
| feishu | `feishu.ts` | 飞书集成 |
| adminConfig | `adminConfig.ts` | 管理配置 |

---

## React Query 集成

所有数据获取使用 React Query：

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchVersions } from '@/lib/api/versions';

// 查询
const { data, isLoading } = useQuery({
  queryKey: ['versions', { page, pageSize }],
  queryFn: () => fetchVersions({ page, pageSize }),
});

// 变更
const mutation = useMutation({
  mutationFn: (data) => createVersion(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['versions'] });
  },
});
```
