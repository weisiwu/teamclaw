# 【P1】M2 API 层去重（Next.js vs Express）

> 优先级：P1（中）
> 前置依赖：H1（数据存储统一）完成后改动更安全 · 后续影响：前端所有 API 调用路径

---

## 1. 问题描述

项目中存在两套 API 实现层，路径前缀相同（`/api/v1/`），职责模糊：

| 层 | 位置 | 文件数 | 实际角色 |
|----|------|--------|---------|
| Next.js API Routes | `app/api/v1/` | 32 个子目录 | **混合**：部分直接处理业务逻辑（如 dashboard/overview 用内存 store），部分 proxy 到 Express |
| Express Server | `server/src/routes/` | 23 个文件 | 完整的后端 API，连接数据库 |

### 问题示例

**dashboard/overview** — 直接在 Next.js 中处理业务：

```typescript
// app/api/v1/dashboard/overview/route.ts
const versions = Array.from(versionStore.values()); // 内存 store！
const tasks = await taskApi.getList(...);            // 又去调后端！
```

这导致：
- 同一个请求中混用内存数据和后端数据，数据源不一致
- 前端 `versionStore`（内存 Map）和后端 SQLite 中的版本数据可能不同步
- 一个 API 同时有两套实现，改一个容易忘改另一个

### 受影响的前端 API 目录

```
app/api/v1/
├── branches/     (8 items)  — 有独立业务逻辑
├── build/        (4 items)  — proxy + 部分直接处理
├── dashboard/    (1 item)   — 直接处理业务（versionStore）
├── feishu/       (2 items)  — proxy
├── tasks/        (5 items)  — proxy
└── versions/     (12 items) — 混合（version-store 内存 + proxy）
```

---

## 2. 方案选择

### 方案 A：Next.js API Routes 纯 proxy 化（推荐）

- 所有 `app/api/v1/` route handler 仅做 `fetch('http://server:9700/api/v1/...')`
- 删除 Next.js 中的内存 store（`version-store.ts`、`branch-store.ts`）
- 优点：单一数据源，逻辑不分散
- 缺点：多一跳网络请求（同机几乎无感）

### 方案 B：移除 Next.js API Routes，用 rewrites 代理

在 `next.config.js` 中配置：

```javascript
async rewrites() {
  return [
    {
      source: '/api/v1/:path*',
      destination: `http://localhost:${process.env.SERVER_PORT || 9700}/api/v1/:path*`,
    },
  ];
}
```

- 优点：零代码量，彻底消除重复
- 缺点：失去在 Next.js 层做数据聚合的灵活性

### 推荐：方案 A

保留 Next.js API Routes 作为 proxy 层，但**严禁**在其中放业务逻辑。

---

## 3. 实现步骤

### Step 1：创建统一 proxy 工具函数（0.5h）

**新建 `lib/api-proxy.ts`**：

```typescript
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.SERVER_PORT || 9700}`;

export async function proxyToBackend(
  request: Request,
  backendPath: string,
  options?: { method?: string; body?: unknown }
): Promise<Response> {
  const url = `${SERVER_URL}${backendPath}`;
  const headers = new Headers(request.headers);
  headers.set('Host', new URL(SERVER_URL).host);

  const res = await fetch(url, {
    method: options?.method || request.method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : request.body,
    // @ts-ignore duplex for streaming
    duplex: 'half',
  });

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
```

### Step 2：改写有业务逻辑的 route handlers（4h）

逐个检查 `app/api/v1/` 下的文件，将直接处理业务的改为 proxy：

#### 2a. `app/api/v1/dashboard/overview/route.ts`

**Before**（直接处理，混用 store）：
```typescript
const versions = Array.from(versionStore.values());
const tasks = await taskApi.getList(...);
```

**After**（proxy 到 Express）：
```typescript
import { proxyToBackend } from '@/lib/api-proxy';

export async function GET(request: Request) {
  return proxyToBackend(request, '/api/v1/dashboard/overview');
}
```

> 需要在 Express 后端 `server/src/routes/` 中创建对应的 dashboard/overview 路由。

#### 2b. `app/api/v1/versions/` 下的 12 个子目录

检查每个文件：
- 如果使用了 `version-store`（内存 Map）→ 改为 proxy
- 如果已经是 proxy → 保持不变，改用统一 `proxyToBackend`

#### 2c. `app/api/v1/branches/` 下的文件

检查是否使用了 `branch-store`（内存）→ 改为 proxy

### Step 3：迁移缺失的后端路由（2h）

某些端点目前只在 Next.js 中实现，需要在 Express 后端补充：

| 端点 | 当前实现 | 需要的后端路由 |
|------|---------|--------------|
| `GET /api/v1/dashboard/overview` | Next.js（聚合多数据源） | `server/src/routes/dashboard.ts` |
| 分支管理部分端点 | Next.js（`branch-store`） | 已有 `branchService.ts`，需补路由 |

### Step 4：删除内存 store（1h）

确认所有引用已改为 proxy 后，删除：

| 文件 | 说明 |
|------|------|
| `app/api/v1/versions/version-store.ts` | 版本内存 Map |
| `lib/branch-store.ts` | 分支内存 Map |

### Step 5：添加 proxy 层规范注释（0.5h）

在 `app/api/v1/` 根目录添加 `README.md`：

```markdown
# Next.js API Routes 规范

本目录下的所有 route handler **仅作为 proxy 层**，将请求转发到 Express 后端。

## 规则
1. ❌ 禁止直接处理业务逻辑
2. ❌ 禁止使用内存 store
3. ❌ 禁止直接操作数据库
4. ✅ 使用 `proxyToBackend()` 转发请求
5. ✅ 可以做请求/响应格式转换
6. ✅ 可以做 SSR 所需的数据聚合（但数据来源必须是后端 API）
```

---

## 4. 涉及文件清单

### 新建

| 文件 | 说明 |
|------|------|
| `lib/api-proxy.ts` | 统一 proxy 工具函数 |
| `server/src/routes/dashboard.ts` | Dashboard 后端路由 |
| `app/api/v1/README.md` | proxy 层规范说明 |

### 修改

| 文件 | 改动 |
|------|------|
| `app/api/v1/dashboard/overview/route.ts` | 从业务逻辑改为 proxy |
| `app/api/v1/versions/` 下约 12 个文件 | 去除 `version-store` 引用，改为 proxy |
| `app/api/v1/branches/` 下约 8 个文件 | 去除 `branch-store` 引用，改为 proxy |

### 删除

| 文件 | 原因 |
|------|------|
| `app/api/v1/versions/version-store.ts` | 内存 store 被 proxy 替代 |
| `lib/branch-store.ts` | 内存 store 被 proxy 替代 |

---

## 5. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | `app/api/v1/` 中无 `new Map()` 或内存 store | `grep -r "new Map\|Store\|store" app/api/v1/` |
| 2 | 所有 API 端点功能正常 | 前端页面全流程测试 |
| 3 | Express 后端停止时，所有 API 返回连接错误 | 停止 server 后测试 |
| 4 | Dashboard 概览数据正确 | 对比改造前后数据 |
| 5 | `npm run build` 无错误 | 构建输出 |
