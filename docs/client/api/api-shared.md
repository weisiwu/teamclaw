# API 共享工具文档

> 📅 更新日期：2026-03-24
> 📁 路径：`lib/api-shared/index.ts`

---

## 概述

`lib/api-shared` 是所有 Next.js API 路由的共享工具库，提供认证、速率限制、错误处理、CORS 等通用能力。所有 API 路由文件都从此模块导入工具函数，遵循 DRY 原则。

---

## 导出概览

```typescript
// lib/api-shared/index.ts
export {
  // Response helpers
  jsonSuccess,
  jsonError,
  jsonAppError,
  handleApiError,
  optionsResponse,
  corsHeaders,
  generateRequestId,

  // Auth helpers
  extractAuthUser,
  requireAuth,
  requireAdmin,
  requireElevatedRole,
  getAuthHeaders,
  apiFetch,
  type AuthUser,
  type Role,

  // Rate limiting
  checkRateLimit,
  rateLimitResponse,
  getRateLimitIdentifier,
  type RateLimitTier,

  // Error system
  AppError,
  AppErrorCode,
  AppErrorHttpStatus,

  // Re-exports
  type NextRequest,
  type NextResponse,
};
```

---

## 响应工具函数

### jsonSuccess

构建标准成功响应。

```typescript
function jsonSuccess(
  data: unknown,
  requestId?: string,
  httpStatus = 200,
  extraHeaders: Record<string, string> = {}
): NextResponse;
```

**示例**

```typescript
return jsonSuccess({ userId: 'user_123' }, requestId);
// =>
// {
//   success: true,
//   code: 200,
//   data: { userId: 'user_123' },
//   message: 'ok',
//   requestId: 'req_abc123'
// }
```

### jsonError

构建标准错误响应（HTTP 状态码同时作为 App Error Code）。

```typescript
function jsonError(message: string, status: number, requestId?: string): NextResponse;
```

**示例**

```typescript
return jsonError('Task not found', 404, requestId);
// =>
// {
//   success: false,
//   code: 404,
//   errorCode: 'NOT_FOUND',
//   message: 'Task not found',
//   requestId: 'req_abc123',
//   timestamp: '2026-03-24T18:00:00.000Z'
// }
```

### jsonAppError

构建带独立 App Error Code 的错误响应（区分 App 层错误码和 HTTP 状态码）。

```typescript
function jsonAppError(
  message: string,
  appCode: number, // AppErrorCode 枚举值
  httpStatus: number, // HTTP 状态码
  requestId?: string
): NextResponse;
```

### handleApiError

自动识别错误类型并返回合适的 JSON 响应。

```typescript
function handleApiError(err: unknown, requestId?: string): NextResponse;
```

**支持的错误类型**

| 错误类型      | 处理方式              |
| ------------- | --------------------- |
| `AppError`    | 使用 `jsonAppError`   |
| `SyntaxError` | 返回 400（无效 JSON） |
| 其他 `Error`  | 返回 500              |

### optionsResponse

返回 CORS 预检响应（204 No Content + CORS 头）。

```typescript
function optionsResponse(): NextResponse;
```

### generateRequestId

生成唯一请求 ID（格式：`req_{timestamp36}_{random8}`）。

```typescript
function generateRequestId(): string;
// 示例：req_m1abc123_xyz9p2q
```

### corsHeaders

标准 CORS 响应头常量。

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};
```

---

## 认证工具函数

### requireAuth

中间件：验证用户已认证。未认证时返回 401。

```typescript
function requireAuth(request: NextRequest, requestId?: string): AuthUser | NextResponse;
```

**使用方式**

```typescript
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult; // 401 响应
  // authResult 是 AuthUser 对象，继续处理
  const { id, role } = authResult;
}
```

### requireAdmin

中间件：验证用户是 admin 角色。否则返回 403。

```typescript
function requireAdmin(request: NextRequest, requestId?: string): AuthUser | NextResponse;
```

### requireElevatedRole

中间件：验证用户是 admin 或 vice_admin 角色。否则返回 403。

```typescript
function requireElevatedRole(request: NextRequest, requestId?: string): AuthUser | NextResponse;
```

### extractAuthUser

从请求头中解码 JWT Bearer Token，提取用户信息（不验证签名）。

```typescript
function extractAuthUser(request: NextRequest): AuthUser | null;
```

**JWT 解析逻辑**

```typescript
// 1. 提取 Bearer token
const token = request.headers.get('authorization')?.slice(7);
// 2. 解析 JWT payload（base64）
const payload = JSON.parse(atob(token.split('.')[1]));
// 3. 验证 role 字段
if (role !== 'admin' && role !== 'vice_admin' && role !== 'member') return null;
```

### getAuthHeaders

获取浏览器端 API 请求的认证头（从 localStorage 读取 token）。

```typescript
function getAuthHeaders(): Record<string, string>;
// { 'Authorization': 'Bearer <token>' } 或 {}
```

### apiFetch

封装 fetch，自动附加认证头，401 时自动跳转登录页。

```typescript
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response>;
```

**示例**

```typescript
const res = await apiFetch('/api/v1/tasks', { method: 'POST', body: JSON.stringify(data) });
// 自动添加 Authorization 头
// 401 时清除 localStorage 并跳转 /login
```

---

## 速率限制工具

### RateLimitTier

```typescript
type RateLimitTier = 'authenticated' | 'elevated' | 'public';
// authenticated: 120 req/min per user
// elevated: 200 req/min per elevated user
// public: 30 req/min per IP
```

### checkRateLimit

检查是否超过速率限制。

```typescript
function checkRateLimit(
  identifier: string, // 'user:xxx' 或 'ip:xxx'
  tier?: RateLimitTier
): { allowed: boolean; remaining: number; resetMs: number };
```

### rateLimitResponse

超过限制时返回 429 响应。

```typescript
function rateLimitResponse(
  identifier: string,
  tier: RateLimitTier,
  requestId?: string
): NextResponse | null; // null = 未超限，正常放行
```

### getRateLimitIdentifier

从请求中提取速率限制标识符。

```typescript
function getRateLimitIdentifier(request: NextRequest): string;
// 优先使用 JWT 中的 userId => 'user:xxx'
// 降级使用 IP 地址 => 'ip:1.2.3.4'
```

**实现细节**

```typescript
// 优先从 Bearer token 解码 userId
if (token has valid JWT) return `user:${payload.userId}`;
// Vercel 真实 IP（支持代理）
const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
return `ip:${ip}`;
```

### 速率限制存储

内存 Map 实现，每 5 分钟清理过期记录。**注意**：多进程部署需要 Redis 后端。

---

## 错误代码系统

### AppErrorCode 枚举

```typescript
enum AppErrorCode {
  // 1xxxx: Validation / Bad Request
  ERR_VALIDATION_FAILED = 10001,
  ERR_INVALID_JSON = 10002,
  ERR_MISSING_REQUIRED_FIELD = 10003,
  ERR_INVALID_FORMAT = 10004,

  // 2xxxx: Not Found
  ERR_NOT_FOUND = 20001,

  // 3xxxx: Conflict
  ERR_CONFLICT = 30001,
  ERR_DUPLICATE_ENTRY = 30002,

  // 4xxxx: Rate Limit / Auth
  ERR_UNAUTHORIZED = 40101,
  ERR_FORBIDDEN = 40301,
  ERR_RATE_LIMITED = 42901,

  // 5xxxx: Server / Internal
  ERR_INTERNAL = 50001,
  ERR_NOT_IMPLEMENTED = 50002,
  ERR_SERVICE_UNAVAILABLE = 50301,
}
```

### AppError 类

可抛出的结构化错误。

```typescript
throw new AppError(AppErrorCode.ERR_NOT_FOUND, 'Task not found');
// httpStatus = 404
// appCode = 20001
```

---

## API 代理工具

### proxyNextToBackend

将 Next.js API 请求代理到 Express 后端。

```typescript
// lib/api-proxy.ts
export async function proxyNextToBackend(
  request: NextRequest,
  backendPath: string, // e.g. '/api/v1/branches'
  options?: { method?: string }
): Promise<NextResponse>;
```

**示例**

```typescript
// app/api/v1/branches/route.ts
import { proxyNextToBackend } from '@/lib/api-proxy';
import { optionsResponse } from '@/lib/api-shared';

export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, '/api/v1/branches');
}

export { optionsResponse as OPTIONS };
```

**环境变量**

| 变量         | 默认值                  | 说明             |
| ------------ | ----------------------- | ---------------- |
| `SERVER_URL` | `http://localhost:9700` | Express 后端地址 |

**代理规则**

- 请求路径：`/api/v1/*` → `http://localhost:9700/api/v1/*`
- Query 参数：自动转发
- 请求头：自动转发（Host 头会被覆盖）
- Body：自动转发（非 GET/HEAD 请求）

---

## 统一响应格式

### 成功响应

```json
{
  "success": true,
  "code": 200,
  "data": { ... },
  "message": "ok",
  "requestId": "req_abc123"
}
```

### 错误响应

```json
{
  "success": false,
  "code": 404,
  "errorCode": "NOT_FOUND",
  "message": "Task not found",
  "requestId": "req_abc123",
  "timestamp": "2026-03-24T18:00:00.000Z"
}
```

---

## 注意事项

1. **JWT 签名验证**：前端 API 路由只解码 JWT，不验证签名（签名由后端验证）
2. **速率限制内存存储**：仅适用于单进程部署，多进程使用 Redis
3. **Token 缓存**：feishu API 的 App Access Token 有 2 小时内存缓存
4. **向后兼容**：`jsonError` 使用 HTTP 状态码作为 App Error Code（简化场景）
5. **CORS**：所有 API 默认启用 CORS，支持跨域请求
