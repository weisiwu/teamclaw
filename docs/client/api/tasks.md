# 任务管理 API

> 📅 更新日期：2026-03-24
> 📁 路径：`app/api/v1/tasks/`

---

## 概述

任务管理 API 提供任务的 CRUD 操作、评论管理和统计功能。与分支 API 不同，任务 API **包含本地业务逻辑**（`lib/api/tasks.ts`），不只是一个代理层。

**基础路径**：`/api/v1/tasks`

**认证**：需要 Bearer Token（JWT），所有端点均需要认证

---

## 数据类型

### TaskStatus

```typescript
type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
```

### TaskPriority

```typescript
type TaskPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
// 1 = 最低优先级，10 = 最高优先级
```

### Task 对象

```json
{
  "id": "task_abc123",
  "title": "实现用户登录功能",
  "description": "使用 JWT 实现用户登录，支持记住我功能",
  "status": "in_progress",
  "priority": 8,
  "creator": "user_xxx",
  "createdAt": "2026-03-20T09:00:00Z",
  "completedAt": null,
  "duration": null,
  "changes": "实现了登录表单和 JWT 验证逻辑",
  "changedFiles": ["src/auth/login.ts", "src/auth/jwt.ts"],
  "commits": ["a1b2c3d", "e4f5g6h"],
  "agents": ["claude", "gpt4"],
  "tokenCost": 45230,
  "tags": ["auth", "frontend"]
}
```

### TaskComment 对象

```json
{
  "id": "comment_xyz",
  "taskId": "task_abc123",
  "author": "user_xxx",
  "content": "已经完成了，等你review",
  "createdAt": "2026-03-24T15:00:00Z"
}
```

---

## API 端点列表

| 方法 | 路径 | 说明 | 认证要求 |
|------|------|------|----------|
| GET | `/api/v1/tasks` | 获取任务列表（支持分页/过滤） | 已登录用户 |
| POST | `/api/v1/tasks` | 创建新任务 | 已登录用户 |
| GET | `/api/v1/tasks/:id` | 获取任务详情 | 已登录用户 |
| PATCH | `/api/v1/tasks/:id` | 部分更新任务 | 已登录用户 |
| DELETE | `/api/v1/tasks/:id` | 删除任务 | 已登录用户 |
| GET | `/api/v1/tasks/:id/comments` | 获取任务评论 | 已登录用户 |
| POST | `/api/v1/tasks/:id/comments` | 添加任务评论 | 已登录用户 |
| POST | `/api/v1/tasks/:id/complete` | 完成任务 | 已登录用户 |
| GET | `/api/v1/tasks/stats` | 获取任务统计 | 已登录用户 |

---

## 端点详情

### GET /api/v1/tasks

获取任务列表，支持分页和过滤。

**请求**

```
GET /api/v1/tasks?page=1&pageSize=10&status=in_progress&priority=8
Authorization: Bearer <token>
```

**Query 参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `pageSize` | number | 10 | 每页数量（最大 100） |
| `status` | string | "all" | 过滤状态：pending / in_progress / completed / cancelled / all |
| `priority` | string | "all" | 过滤优先级：1-10 / all |
| `search` | string | - | 搜索关键词（标题/描述） |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "data": [
      {
        "id": "task_abc123",
        "title": "实现用户登录功能",
        "description": "使用 JWT 实现用户登录",
        "status": "in_progress",
        "priority": 8,
        "creator": "user_xxx",
        "createdAt": "2026-03-20T09:00:00Z",
        "completedAt": null,
        "duration": null,
        "tokenCost": 45230,
        "tags": ["auth"]
      }
    ],
    "total": 25,
    "page": 1,
    "pageSize": 10,
    "totalPages": 3
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### POST /api/v1/tasks

创建新任务。

**请求**

```
POST /api/v1/tasks
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**

```json
{
  "title": "实现用户登录功能",
  "description": "使用 JWT 实现用户登录，支持记住我功能",
  "priority": 8
}
```

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `title` | string | 是 | 1-200 字符 | 任务标题 |
| `description` | string | 否 | - | 任务描述 |
| `priority` | number | 否 | 1-10 | 优先级，默认 5 |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "task_new456",
    "title": "实现用户登录功能",
    "description": "使用 JWT 实现用户登录，支持记住我功能",
    "status": "pending",
    "priority": 8,
    "creator": "user_xxx",
    "createdAt": "2026-03-24T18:00:00Z",
    "completedAt": null,
    "duration": null,
    "tokenCost": 0,
    "tags": []
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**状态码**

| 状态码 | 说明 |
|--------|------|
| 200 | 创建成功 |
| 400 | 标题为空或超长 |
| 401 | 未认证 |
| 500 | 服务器错误 |

---

### GET /api/v1/tasks/:id

获取单个任务详情。

**请求**

```
GET /api/v1/tasks/task_abc123
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "task_abc123",
    "title": "实现用户登录功能",
    "description": "使用 JWT 实现用户登录，支持记住我功能",
    "status": "in_progress",
    "priority": 8,
    "creator": "user_xxx",
    "createdAt": "2026-03-20T09:00:00Z",
    "completedAt": null,
    "duration": null,
    "changes": "实现了登录表单和 JWT 验证逻辑",
    "changedFiles": ["src/auth/login.ts"],
    "commits": ["a1b2c3d"],
    "agents": ["claude"],
    "tokenCost": 45230,
    "tags": ["auth", "frontend"]
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### PATCH /api/v1/tasks/:id

部分更新任务（状态、优先级、标题、描述）。

**请求**

```
PATCH /api/v1/tasks/task_abc123
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**（所有字段可选）

```json
{
  "title": "更新后的任务标题",
  "description": "更新后的描述",
  "status": "completed",
  "priority": 10
}
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `title` | string | 1-200 字符 | 任务标题 |
| `description` | string | - | 任务描述 |
| `status` | string | pending / in_progress / completed / cancelled | 任务状态 |
| `priority` | number | 1-10 | 优先级 |

**状态码**

| 状态码 | 说明 |
|--------|------|
| 200 | 更新成功 |
| 400 | 标题为空或超长、非法状态值 |
| 401 | 未认证 |
| 404 | 任务不存在 |
| 500 | 服务器错误 |

---

### DELETE /api/v1/tasks/:id

删除任务。

**请求**

```
DELETE /api/v1/tasks/task_abc123
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "deleted": true
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**状态码**

| 状态码 | 说明 |
|--------|------|
| 200 | 删除成功 |
| 401 | 未认证 |
| 404 | 任务不存在 |
| 500 | 服务器错误 |

---

### GET /api/v1/tasks/:id/comments

获取任务的评论列表。

**请求**

```
GET /api/v1/tasks/task_abc123/comments
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": [
    {
      "id": "comment_xyz",
      "taskId": "task_abc123",
      "author": "user_xxx",
      "content": "已经完成了，等你review",
      "createdAt": "2026-03-24T15:00:00Z"
    }
  ],
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### POST /api/v1/tasks/:id/comments

为任务添加评论。

**请求**

```
POST /api/v1/tasks/task_abc123/comments
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**

```json
{
  "content": "已经完成了，等你review",
  "author": "user_xxx"
}
```

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `content` | string | 是 | 1-2000 字符 | 评论内容 |
| `author` | string | 否 | - | 评论作者，默认 "Anonymous" |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "comment_new789",
    "taskId": "task_abc123",
    "author": "user_xxx",
    "content": "已经完成了，等你review",
    "createdAt": "2026-03-24T18:00:00Z"
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**状态码**

| 状态码 | 说明 |
|--------|------|
| 200 | 添加成功 |
| 400 | 评论内容为空或超长 |
| 401 | 未认证 |
| 404 | 任务不存在 |
| 500 | 服务器错误 |

---

### POST /api/v1/tasks/:id/complete

标记任务为已完成（快捷端点，等价于 `PATCH /tasks/:id { status: "completed" }`）。

**请求**

```
POST /api/v1/tasks/task_abc123/complete
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "task_abc123",
    "title": "实现用户登录功能",
    "status": "completed",
    "completedAt": "2026-03-24T18:00:00Z"
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**状态码**

| 状态码 | 说明 |
|--------|------|
| 200 | 任务完成 |
| 401 | 未认证 |
| 404 | 任务不存在 |
| 500 | 服务器错误 |

---

### GET /api/v1/tasks/stats

获取任务统计信息。

**请求**

```
GET /api/v1/tasks/stats
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "total": 100,
    "byStatus": {
      "pending": 20,
      "in_progress": 35,
      "completed": 40,
      "cancelled": 5
    },
    "byPriority": {
      "high": 15,
      "medium": 50,
      "low": 35
    },
    "totalTokenCost": 1234567
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**统计说明**

- **total**：任务总数
- **byStatus**：按状态分布
- **byPriority**：高优先级（priority ≥ 9）/ 中优先级（5-8）/ 低优先级（< 5）
- **totalTokenCost**：所有任务的累计 Token 消耗

---

## 客户端调用示例

### React Query 用法

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 获取任务列表
const { data, isLoading } = useQuery({
  queryKey: ['tasks', { page, status, priority }],
  queryFn: () =>
    fetch('/api/v1/tasks?' + new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      status,
      priority,
    }), {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
});

// 创建任务
const createMutation = useMutation({
  mutationFn: (data) =>
    fetch('/api/v1/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks/stats'] });
  },
});

// 完成任务
const completeMutation = useMutation({
  mutationFn: (id) =>
    fetch(`/api/v1/tasks/${id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  },
});
```

---

## 错误代码

| HTTP 状态码 | errorCode | 说明 |
|-------------|-----------|------|
| 400 | BAD_REQUEST | 请求参数错误（标题为空、超长等） |
| 401 | UNAUTHORIZED | 未认证或 Token 无效 |
| 404 | NOT_FOUND | 任务不存在 |
| 429 | RATE_LIMITED | 请求过于频繁（120 req/min） |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

---

## 注意事项

1. **本地业务逻辑**：任务 API 在 Next.js 层有真实的业务逻辑（验证、数据库操作），不是纯代理
2. **速率限制**：已认证用户 120 req/min，会在响应头中返回剩余配额
3. **自动跳转登录**：客户端 `apiFetch` 封装了 401 自动跳转登录页逻辑
4. **优先级说明**：高优先级（9-10）、中优先级（5-8）、低优先级（1-4）
5. **评论限制**：单条评论最长 2000 字符，超出会返回 400 错误
