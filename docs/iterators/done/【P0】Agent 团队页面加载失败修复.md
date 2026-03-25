# 03【P0】Agent 团队页面加载失败修复

## 问题描述

打开 Agent 团队页面（`/agent-team`）显示"加载失败"。

## 根因

存在 **四个缺陷**：

### 1. 跨域请求（主因）

`lib/api/agents.ts` 使用 `API_BASE = 'http://localhost:9700'` 直接向后端发跨域请求，被浏览器 CORS 策略阻止。

### 2. 缺少 Next.js 代理路由

`app/api/v1/agents/` 目录不存在，无法通过 Next.js 代理转发请求到后端。

### 3. 成功判断条件错误

```typescript
// 错误：后端返回 code: 200，不等于 0，永远报错
if (json.code !== 0) throw new Error(...)

// 正确：
if (!json.success) throw new Error(...)
```

### 4. 缺少认证 Header

`request()` 函数未携带 `Authorization: Bearer` token，middleware 拦截后重定向到 `/login`。

## 修复方案

**`lib/api/agents.ts`：**
- `API_BASE` 从 `http://localhost:9700` 改为 `/api/v1`
- 所有 API 路径从 `/api/v1/agents/...` 改为 `/agents/...`
- 新增 `getAuthHeaders()` 函数，从 localStorage 读取 token 注入请求头
- 成功判断从 `json.code !== 0` 改为 `!json.success`

**新建 Next.js 代理路由：**
- `app/api/v1/agents/route.ts` — 根路由 GET/POST
- `app/api/v1/agents/[...path]/route.ts` — Catch-all 代理，覆盖所有子路径

## 状态

✅ 已修复
