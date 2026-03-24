# 版本管理 API

> 📅 更新日期：2026-03-24
> 📁 路径：`app/api/v1/versions/`

---

## 概述

版本管理 API 是 TeamClaw 的核心功能之一，覆盖版本的 CRUD、时间线、变更日志、截图、回滚等全生命周期管理。

**基础路径**：`/api/v1/versions`

**认证**：需要 Bearer Token（JWT）

**后端服务**：`http://localhost:9700`（可配置 `BACKEND_API_URL` / `SERVER_URL`）

---

## API 端点列表

| 方法   | 路径                                             | 说明                   | 路由文件                                            |
| ------ | ------------------------------------------------ | ---------------------- | --------------------------------------------------- |
| GET    | `/api/v1/versions`                               | 获取版本列表           | `versions/route.ts`                                 |
| POST   | `/api/v1/versions`                               | 创建新版本             | `versions/route.ts`                                 |
| GET    | `/api/v1/versions/:id`                           | 获取版本详情           | `versions/[id]/route.ts`                            |
| PUT    | `/api/v1/versions/:id`                           | 全量替换版本           | `versions/[id]/route.ts`                            |
| PATCH  | `/api/v1/versions/:id`                           | 部分更新版本           | `versions/[id]/route.ts`                            |
| DELETE | `/api/v1/versions/:id`                           | 删除版本               | `versions/[id]/route.ts`                            |
| GET    | `/api/v1/versions/:id/timeline`                  | 获取版本时间线         | `versions/[id]/timeline/route.ts`                   |
| POST   | `/api/v1/versions/:id/timeline`                  | 添加时间线事件         | `versions/[id]/timeline/route.ts`                   |
| GET    | `/api/v1/versions/:id/changelog`                 | 获取变更日志           | `versions/[id]/changelog/route.ts`                  |
| PUT    | `/api/v1/versions/:id/changelog`                 | 更新变更日志           | `versions/[id]/changelog/route.ts`                  |
| POST   | `/api/v1/versions/:id/changelog/generate`        | AI 生成变更日志        | `versions/[id]/changelog/generate/route.ts`         |
| GET    | `/api/v1/versions/:id/screenshots`               | 获取截图列表           | `versions/[id]/screenshots/route.ts`                |
| POST   | `/api/v1/versions/:id/screenshots`               | 上传截图               | `versions/[id]/screenshots/route.ts`                |
| GET    | `/api/v1/versions/:id/screenshots/:screenshotId` | 获取单个截图           | `versions/[id]/screenshots/[screenshotId]/route.ts` |
| DELETE | `/api/v1/versions/:id/screenshots/:screenshotId` | 删除截图               | `versions/[id]/screenshots/[screenshotId]/route.ts` |
| GET    | `/api/v1/versions/:id/rollback-preview`          | 回退预览               | `versions/[id]/rollback-preview/route.ts`           |
| GET    | `/api/v1/versions/:id/rollback-targets`          | 可回退版本列表         | `versions/[id]/rollback-targets/route.ts`           |
| GET    | `/api/v1/versions/changelog/diff`                | 对比两个版本的变更日志 | `versions/changelog/diff/route.ts`                  |
| GET    | `/api/v1/versions/change-stats`                  | 变更统计               | `versions/change-stats/route.ts`                    |

---

## 端点详情

### GET /api/v1/versions

获取版本列表。

**请求**

```
GET /api/v1/versions?page=1&pageSize=20
Authorization: Bearer <token>
```

**Query 参数**

| 参数       | 类型   | 必填 | 默认值 | 说明       |
| ---------- | ------ | ---- | ------ | ---------- |
| `page`     | number | 否   | 1      | 页码       |
| `pageSize` | number | 否   | 20     | 每页数量   |
| `tag`      | string | 否   | -      | 按标签筛选 |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "versions": [
      {
        "id": "v_abc123",
        "name": "v1.2.0",
        "tag": "stable",
        "createdAt": "2026-03-20T10:00:00Z",
        "status": "active"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### POST /api/v1/versions

创建新版本。

**请求**

```
POST /api/v1/versions
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**

```json
{
  "name": "v1.3.0",
  "tag": "beta",
  "description": "新增 AI 助手功能"
}
```

| 字段          | 类型   | 必填 | 说明                               |
| ------------- | ------ | ---- | ---------------------------------- |
| `name`        | string | 是   | 版本名称（如 v1.3.0）              |
| `tag`         | string | 否   | 标签（stable / beta / alpha / rc） |
| `description` | string | 否   | 版本描述                           |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "v_new456",
    "name": "v1.3.0",
    "tag": "beta",
    "createdAt": "2026-03-24T18:00:00Z",
    "status": "draft"
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### GET /api/v1/versions/:id

获取单个版本详情。

**请求**

```
GET /api/v1/versions/v_abc123
Authorization: Bearer <token>
```

---

### PUT /api/v1/versions/:id

全量替换版本信息（所有字段必须提供）。

**请求**

```
PUT /api/v1/versions/v_abc123
Authorization: Bearer <token>
Content-Type: application/json
```

---

### PATCH /api/v1/versions/:id

部分更新版本（只更新提供的字段）。

**请求**

```
PATCH /api/v1/versions/v_abc123
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**

```json
{
  "tag": "stable",
  "description": "正式发布版本"
}
```

---

### DELETE /api/v1/versions/:id

删除版本。

**请求**

```
DELETE /api/v1/versions/v_abc123
Authorization: Bearer <token>
```

**注意**：删除版本可能影响依赖该版本的历史记录和截图。

---

### GET /api/v1/versions/:id/timeline

获取版本时间线（版本相关的所有事件历史）。

**请求**

```
GET /api/v1/versions/v_abc123/timeline
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "events": [
      {
        "id": "event_001",
        "type": "created",
        "description": "版本创建",
        "timestamp": "2026-03-20T10:00:00Z",
        "user": "user_xxx"
      },
      {
        "id": "event_002",
        "type": "build",
        "description": "构建完成",
        "timestamp": "2026-03-20T11:00:00Z",
        "user": "system"
      },
      {
        "id": "event_003",
        "type": "manual_note",
        "description": "发布前检查",
        "timestamp": "2026-03-24T09:00:00Z",
        "user": "user_yyy"
      }
    ],
    "versionId": "v_abc123"
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**事件类型**

| type                | 说明           |
| ------------------- | -------------- |
| `created`           | 版本创建       |
| `build`             | 构建事件       |
| `deploy`            | 部署事件       |
| `rollback`          | 回退事件       |
| `manual_note`       | 手动添加的备注 |
| `changelog_updated` | 变更日志更新   |

---

### POST /api/v1/versions/:id/timeline

向版本时间线添加手动备注。

**请求**

```
POST /api/v1/versions/v_abc123/timeline
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**

```json
{
  "description": "发布前检查完成，可以上线"
}
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "event_new999",
    "type": "manual_note",
    "description": "发布前检查完成，可以上线",
    "timestamp": "2026-03-24T18:00:00Z",
    "user": "user_xxx"
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### GET /api/v1/versions/:id/changelog

获取版本变更日志。

**请求**

```
GET /api/v1/versions/v_abc123/changelog
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "summary_abc",
    "versionId": "v_abc123",
    "title": "v1.2.0 变更日志",
    "content": "## 新功能\n- AI 助手集成\n\n## 修复\n- 登录页面样式问题",
    "changes": [
      { "type": "feature", "description": "AI 助手集成" },
      { "type": "fix", "description": "登录页面样式问题" },
      { "type": "improvement", "description": "性能优化" }
    ],
    "generatedAt": "2026-03-24T10:00:00Z",
    "generatedBy": "AI"
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**变更类型**

| type          | 说明       |
| ------------- | ---------- |
| `feature`     | 新功能     |
| `fix`         | Bug 修复   |
| `improvement` | 改进/优化  |
| `breaking`    | 破坏性变更 |
| `docs`        | 文档更新   |
| `refactor`    | 重构       |

---

### PUT /api/v1/versions/:id/changelog

手动更新版本变更日志（覆盖）。

**请求**

```
PUT /api/v1/versions/v_abc123/changelog
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**

```json
{
  "title": "v1.2.0 正式版变更日志",
  "content": "## 新功能\n- AI 助手集成",
  "changes": [
    { "type": "feature", "description": "AI 助手集成" },
    { "type": "improvement", "description": "性能提升 30%" }
  ]
}
```

---

### POST /api/v1/versions/:id/changelog/generate

触发 AI 自动生成变更日志。

**请求**

```
POST /api/v1/versions/v_abc123/changelog/generate
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**

```json
{
  "diffOnly": false,
  "includeCommits": true
}
```

| 字段             | 类型    | 必填 | 说明                              |
| ---------------- | ------- | ---- | --------------------------------- |
| `diffOnly`       | boolean | 否   | 仅基于代码 diff 生成（不调用 AI） |
| `includeCommits` | boolean | 否   | 是否包含 commit 信息              |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "summary_abc",
    "versionId": "v_abc123",
    "title": "v1.2.0 AI 生成变更日志",
    "content": "## 新功能\n- AI 助手集成...",
    "changes": [{ "type": "feature", "description": "AI 助手集成" }],
    "generatedAt": "2026-03-24T18:00:00Z",
    "generatedBy": "AI"
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### GET /api/v1/versions/changelog/diff

对比两个版本的变更日志。

**请求**

```
GET /api/v1/versions/changelog/diff?from=v_abc123&to=v_xyz789
Authorization: Bearer <token>
```

**Query 参数**

| 参数   | 类型   | 必填 | 说明        |
| ------ | ------ | ---- | ----------- |
| `from` | string | 是   | 源版本 ID   |
| `to`   | string | 是   | 目标版本 ID |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "from": {
      "versionId": "v_abc123",
      "changelog": { "changes": [...] }
    },
    "to": {
      "versionId": "v_xyz789",
      "changelog": { "changes": [...] }
    },
    "diff": {
      "feature": { "added": ["新功能A"], "removed": [] },
      "fix": { "added": [], "removed": ["旧问题修复"] },
      "improvement": { "added": ["性能优化"], "removed": [] },
      "breaking": { "added": [], "removed": [] }
    },
    "summary": {
      "totalFrom": 5,
      "totalTo": 6,
      "addedCount": 2,
      "removedCount": 1
    }
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### GET /api/v1/versions/:id/rollback-preview

预览回退到指定版本的影响。

**请求**

```
GET /api/v1/versions/v_abc123/rollback-preview?ref=v_old456
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "currentVersion": "v_abc123",
    "targetVersion": "v_old456",
    "affectedFiles": ["src/app/main.ts", "src/lib/auth.ts"],
    "breakingChanges": ["删除了一些 API 端点"],
    "warnings": ["该版本较旧，可能存在兼容性问题"]
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### GET /api/v1/versions/:id/rollback-targets

获取可回退的目标版本列表。

**请求**

```
GET /api/v1/versions/v_abc123/rollback-targets
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "currentVersion": "v_abc123",
    "targets": [
      {
        "versionId": "v_old456",
        "name": "v1.1.0",
        "tag": "stable",
        "createdAt": "2026-02-01T00:00:00Z",
        "status": "stable"
      }
    ]
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### GET /api/v1/versions/:id/screenshots

获取版本的截图列表。

**请求**

```
GET /api/v1/versions/v_abc123/screenshots
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "screenshots": [
      {
        "id": "screenshot_001",
        "versionId": "v_abc123",
        "filename": "homepage.png",
        "url": "/screenshots/v_abc123/homepage.png",
        "createdAt": "2026-03-24T10:00:00Z"
      }
    ],
    "total": 5
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### POST /api/v1/versions/:id/screenshots

上传截图。

**请求**

```
POST /api/v1/versions/v_abc123/screenshots
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**

```json
{
  "filename": "homepage.png",
  "data": "data:image/png;base64,..."
}
```

---

### DELETE /api/v1/versions/:id/screenshots/:screenshotId

删除指定截图。

**请求**

```
DELETE /api/v1/versions/v_abc123/screenshots/screenshot_001
Authorization: Bearer <token>
```

---

### GET /api/v1/versions/change-stats

获取版本变更统计。

**请求**

```
GET /api/v1/versions/change-stats?tag=v1.2.0
Authorization: Bearer <token>
```

**Query 参数**

| 参数  | 类型   | 必填 | 说明          |
| ----- | ------ | ---- | ------------- |
| `tag` | string | 否   | 版本标签/名称 |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "totalVersions": 50,
    "byTag": {
      "stable": 10,
      "beta": 20,
      "alpha": 15,
      "rc": 5
    },
    "recentActivity": {
      "versionsCreatedThisWeek": 3,
      "versionsUpdatedThisWeek": 5
    }
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

## 错误代码

| HTTP 状态码 | errorCode           | 说明                |
| ----------- | ------------------- | ------------------- |
| 400         | BAD_REQUEST         | 请求参数错误        |
| 401         | UNAUTHORIZED        | 未认证或 Token 无效 |
| 403         | FORBIDDEN           | 权限不足            |
| 404         | NOT_FOUND           | 版本不存在          |
| 409         | CONFLICT            | 版本名已存在        |
| 429         | RATE_LIMITED        | 请求过于频繁        |
| 500         | INTERNAL_ERROR      | 服务器内部错误      |
| 503         | SERVICE_UNAVAILABLE | 后端服务不可用      |

---

## 注意事项

1. **数据转换**：部分路由（changelog、changelog/generate、changelog/diff）有前后端数据格式转换逻辑
   - 后端格式：`{ features[], fixes[], changes[], breaking[] }`
   - 前端格式：`{ changes: [{ type, description }] }`
2. **代理 vs 本地逻辑**：`timeline`、`changelog`、`changelog/diff` 等路由在 Next.js 层有自己的请求处理逻辑（不只是代理）
3. **后端不可用处理**：所有路由在代理失败时返回 503 状态码
4. **CORS 支持**：所有路由支持 CORS 预检（OPTIONS）
