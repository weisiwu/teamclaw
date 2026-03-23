# 【P0】H2 JWT 认证替换 header 伪造

> 优先级：P0（高）
> 前置依赖：无 · 后续影响：所有需要认证的 API 端点

---

## 1. 问题描述

当前认证机制完全依赖客户端传入的明文 HTTP header，**任何人可以伪造任意身份**：

```
X-User-Id: user_001
X-User-Role: admin
```

`server/src/middleware/auth.ts` 中的 `extractUserFromHeaders()` 直接读取并信任这两个 header，没有任何签名验证。

### 攻击场景

```bash
# 任何人都能以管理员身份删除项目
curl -X DELETE http://localhost:9700/api/v1/projects/xxx \
  -H "X-User-Id: attacker" \
  -H "X-User-Role: admin"
```

### 矛盾点

- `docker-compose.yml` 第 68 行已配置 `JWT_SECRET=${JWT_SECRET:-change-me-in-production}`
- `.env.production.example` 第 36 行有 `JWT_SECRET=YOUR_VERY_LONG_RANDOM_SECRET`
- `.env.example` 中有 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 配置
- 但**代码中从未使用这些配置**

---

## 2. 当前代码分析

### 2.1 auth.ts 中的四个中间件

| 函数 | 用途 | 安全问题 |
|------|------|---------|
| `requirePermission(agent)` | 检查 Agent 访问权限 | 身份来自 header，可伪造 |
| `requireAuth` | 检查是否携带身份 | 只检查 header 存在，不验证真伪 |
| `requireAdmin` | 检查管理员权限 | `X-User-Role: admin` 即可通过 |
| `optionalAuth` | 可选身份 | 同上 |

### 2.2 受影响的路由

- `/api/v1/tasks` — 所有任务操作（使用 `requireAuth`）
- `/api/v1/admin/*` — 管理后台（使用 `requireAdmin`）
- `/api/v1/projects/*` — 项目操作（使用 `requireProjectAccess`）
- `/api/v1/abilities/*` — Agent 能力配置（使用 `requirePermission`）
- `/api/v1/messages/*` — 部分端点使用 `requireAuth`

---

## 3. 目标状态

- 用户通过**登录接口**获取 JWT Token
- 所有请求通过 `Authorization: Bearer <token>` 携带身份
- auth 中间件从 Token 中**解密**出用户信息，不再信任 header
- 支持飞书 OAuth 登录（利用已有的 `FEISHU_APP_ID` 配置）
- Token 支持过期和刷新

---

## 4. 实现步骤

### Step 1：安装依赖

```bash
cd server
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

### Step 2：创建 JWT 工具模块

**新建 `server/src/utils/jwt.ts`**：

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const TOKEN_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

export interface JwtPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

export function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
```

### Step 3：创建用户服务

**新建 `server/src/services/authService.ts`**：

```typescript
import bcrypt from 'bcryptjs';
import { signToken, signRefreshToken, verifyToken } from '../utils/jwt.js';

// 临时：内存用户表（后续迁移到 PostgreSQL）
const users = new Map<string, { id: string; name: string; role: string; passwordHash: string }>();

// 初始化默认管理员
async function initDefaultAdmin() {
  const hash = await bcrypt.hash('admin123', 10);
  users.set('admin', { id: 'admin', name: '管理员', role: 'admin', passwordHash: hash });
}
initDefaultAdmin();

export async function login(username: string, password: string) {
  const user = users.get(username);
  if (!user) throw new Error('用户不存在');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('密码错误');

  const token = signToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });

  return { token, refreshToken, user: { id: user.id, name: user.name, role: user.role } };
}

export function refreshAccessToken(refreshToken: string) {
  const payload = verifyToken(refreshToken);
  return signToken({ userId: payload.userId, role: payload.role });
}
```

### Step 4：创建登录路由

**新建 `server/src/routes/auth.ts`**：

```typescript
import { Router } from 'express';
import { success, error } from '../utils/response.js';
import { login, refreshAccessToken } from '../services/authService.js';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json(error(400, '用户名和密码不能为空'));
    }
    const result = await login(username, password);
    res.json(success(result));
  } catch (err) {
    res.status(401).json(error(401, err instanceof Error ? err.message : '登录失败'));
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    const token = refreshAccessToken(refreshToken);
    res.json(success({ token }));
  } catch {
    res.status(401).json(error(401, 'Token 已过期，请重新登录'));
  }
});

export default router;
```

### Step 5：重写 auth 中间件

**改写 `server/src/middleware/auth.ts`**：

核心变更：`extractUserFromHeaders` → `extractUserFromToken`

```typescript
import { verifyToken, JwtPayload } from '../utils/jwt.js';

function extractUserFromToken(req: AuthRequest): JwtPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.slice(7);
    return verifyToken(token);
  } catch {
    return null;
  }
}
```

所有中间件从 Token 中获取用户信息：

| 函数 | 改动 |
|------|------|
| `requireAuth` | `extractUserFromHeaders` → `extractUserFromToken`，无效 Token 返回 401 |
| `requireAdmin` | 同上，Token 中的 `role` 必须为 `admin` / `vice_admin` |
| `requirePermission` | 同上，从 Token 解出 role 后检查权限 |
| `optionalAuth` | 同上，Token 不存在时不报错 |

### Step 6：注册 auth 路由

在 `server/src/index.ts` 中：

```typescript
import authRouter from './routes/auth.js';
// ...
app.use('/api/v1/auth', authRouter);
// 注意：login 端点不需要经过 requireAuth
```

### Step 7：前端适配

**修改 `lib/api-shared.ts`**：

```typescript
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('teamclaw_token');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

// 所有 fetch 请求自动带上 token
export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = { ...getAuthHeaders(), ...options.headers };
  const res = await fetch(url, { ...options, headers });

  // 401 时自动跳转登录
  if (res.status === 401) {
    localStorage.removeItem('teamclaw_token');
    window.location.href = '/login';
  }

  return res;
}
```

**创建 `/app/login/page.tsx` 登录页面**。

### Step 8：向后兼容（过渡期）

在完全切换期间，可同时支持 header 和 Token 两种方式：

```typescript
function extractUser(req: AuthRequest): JwtPayload | null {
  // 优先从 Token 解析
  const fromToken = extractUserFromToken(req);
  if (fromToken) return fromToken;

  // 兼容旧方式（开发环境限定）
  if (process.env.NODE_ENV === 'development') {
    const id = req.headers['x-user-id'] as string;
    const role = req.headers['x-user-role'] as string;
    if (id && role) return { userId: id, role };
  }

  return null;
}
```

---

## 5. 涉及文件清单

### 新建

| 文件 | 说明 |
|------|------|
| `server/src/utils/jwt.ts` | JWT 签发与验证工具 |
| `server/src/services/authService.ts` | 登录、刷新 Token 逻辑 |
| `server/src/routes/auth.ts` | `/api/v1/auth/login`、`/refresh` 端点 |
| `app/login/page.tsx` | 前端登录页面 |

### 修改

| 文件 | 改动 |
|------|------|
| `server/src/middleware/auth.ts` | 从 header 认证改为 JWT Token 认证 |
| `server/src/index.ts` | 注册 auth 路由，login 端点免认证 |
| `lib/api-shared.ts` | 请求自动携带 Bearer Token |
| `middleware.ts`（Next.js） | 未登录时重定向到 /login |
| `server/package.json` | 增加 `jsonwebtoken`、`bcryptjs` 依赖 |

---

## 6. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 不携带 Token 访问受保护 API 返回 401 | `curl /api/v1/tasks` 无 header |
| 2 | 伪造 header 无法通过认证 | `curl -H "X-User-Role: admin" /api/v1/admin/config` 返回 401 |
| 3 | 正确登录后获得有效 Token | `POST /api/v1/auth/login` 返回 token |
| 4 | 携带 Token 可正常访问 API | `curl -H "Authorization: Bearer <token>" /api/v1/tasks` |
| 5 | Token 过期后返回 401 | 使用过期 Token 测试 |
| 6 | 刷新 Token 可获得新 Token | `POST /api/v1/auth/refresh` |
| 7 | 前端未登录自动跳转到 /login | 浏览器直接访问 / |
