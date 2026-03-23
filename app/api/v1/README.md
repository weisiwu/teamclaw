# Next.js API Routes 规范

本目录下的所有 route handler **仅作为 proxy 层**，将请求转发到 Express 后端。

## 背景

项目存在两套 API 层：
- **Next.js API Routes** (`app/api/v1/`) — 前端 API 代理层
- **Express Server** (`server/src/routes/`) — 完整后端 API，连接数据库

所有前端请求通过 Next.js API Routes 代理到 Express 后端，确保单一数据源。

## 规则

| 状态 | 规则 |
|------|------|
| ❌ | 禁止直接处理业务逻辑 |
| ❌ | 禁止使用内存 store（如 `new Map()`、`new Set()`） |
| ❌ | 禁止直接操作数据库 |
| ❌ | 禁止 `import { versionStore }` 或 `import { branchStore }` |
| ✅ | 使用 `proxyNextToBackend()` 转发请求 |
| ✅ | 可以做请求/响应格式转换 |
| ✅ | 可以做 SSR 所需的数据聚合（但数据来源必须是后端 API） |

## 使用方法

```typescript
import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";

// GET /api/v1/foo → proxy to backend GET /api/v1/foo
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/foo");
}

// POST /api/v1/foo → proxy to backend POST /api/v1/foo
export async function POST(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/foo", { method: "POST" });
}
```

## 代理工具

位于 `lib/api-proxy.ts`：

- `proxyNextToBackend(request, backendPath)` — 代理 NextRequest 到后端，返回 NextResponse
- `proxyToBackend(request, backendPath, options?)` — 底层代理函数

## 后端 URL

默认：`http://localhost:9700`（可通过 `SERVER_URL` 或 `SERVER_PORT` 环境变量配置）

## 受影响的端点

以下端点已从直接业务逻辑改为 proxy：

| 前端路由 | 后端路由 | 说明 |
|---------|---------|------|
| `GET/POST /api/v1/versions` | `/api/v1/versions` | 版本列表/创建 |
| `GET/PUT/PATCH/DELETE /api/v1/versions/:id` | `/api/v1/versions/:id` | 版本 CRUD |
| `GET /api/v1/versions/change-stats` | `/api/v1/versions/change-stats` | 版本变更统计 |
| `GET /api/v1/versions/:id/rollback-preview` | `/api/v1/versions/:id/rollback-preview` | 回滚预览 |
| `GET /api/v1/versions/:id/rollback-targets` | `/api/v1/versions/:id/rollback-targets` | 可回滚目标 |
| `GET/POST /api/v1/branches` | `/api/v1/branches` | 分支列表/创建 |
| `GET/PUT/DELETE /api/v1/branches/:id` | `/api/v1/branches/:id` | 分支 CRUD |
| `GET /api/v1/branches/stats` | `/api/v1/branches/stats` | 分支统计 |
| `GET /api/v1/branches/main` | `/api/v1/branches/main` | 主分支 |
| `PUT /api/v1/branches/:id/main` | `/api/v1/branches/:id/main` | 设置主分支 |
| `PUT /api/v1/branches/:id/checkout` | `/api/v1/branches/:id/checkout` | 检出分支 |
| `PUT /api/v1/branches/:id/protect` | `/api/v1/branches/:id/protect` | 设置保护 |
| `PUT /api/v1/branches/:id/rename` | `/api/v1/branches/:id/rename` | 重命名分支 |
| `GET /api/v1/dashboard/overview` | `/api/v1/dashboard/overview` | 仪表盘概览 |
