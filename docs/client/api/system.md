# 系统级 API

> 📅 更新日期：2026-03-24
> 📁 路径：`app/api/health/` 和 `app/api/download/`

---

## 概述

系统级 API 包括健康检查和文档下载两个公共端点，无需认证即可访问。

---

## GET /api/health — 健康检查

### 功能说明

检测前端服务的运行状态。不需要认证，返回服务的基础运行指标。

### 请求

```
GET /api/health
X-Request-ID: <optional-request-id>
```

### 响应

```json
{
  "success": true,
  "code": 200,
  "data": {
    "status": "ok",
    "timestamp": "2026-03-24T18:00:00.000Z",
    "service": "teamclaw-frontend",
    "uptime": 86400,
    "memory": {
      "used": 45,
      "total": 128,
      "unit": "MB"
    }
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

### 字段说明

| 字段           | 类型   | 说明                       |
| -------------- | ------ | -------------------------- |
| `status`       | string | 服务状态，`ok` = 正常      |
| `timestamp`    | string | 服务器当前时间（ISO 8601） |
| `service`      | string | 服务标识                   |
| `uptime`       | number | 服务运行时长（秒）         |
| `memory.used`  | number | 堆内存已使用量（MB）       |
| `memory.total` | number | 堆内存总量（MB）           |
| `memory.unit`  | string | 内存单位                   |

### 状态码

| 状态码 | 说明         |
| ------ | ------------ |
| 200    | 服务正常     |
| 500    | 健康检查失败 |

---

## GET /api/download — 文档下载

### 功能说明

下载 `docs/modules/` 目录下的 Markdown 文档文件。公开接口，但有速率限制（30 req/min per IP）。

### 请求

```
GET /api/download?slug=getting-started
```

### Query 参数

| 参数   | 类型   | 必填 | 说明                       |
| ------ | ------ | ---- | -------------------------- |
| `slug` | string | 是   | 文档 slug（不含 .md 后缀） |

### 响应（成功）

```
HTTP/1.1 200 OK
Content-Type: text/markdown; charset=utf-8
Content-Disposition: attachment; filename="getting-started.md"
Cache-Control: private, max-age=3600
X-Request-ID: req_abc123

# Getting Started

Welcome to TeamClaw...
```

### 响应（错误）

**缺少 slug 参数**

```json
{
  "code": 400,
  "message": "Missing slug parameter",
  "data": null
}
```

**slug 格式非法**

```json
{
  "code": 400,
  "message": "Invalid slug format",
  "data": null
}
```

**文档不存在**

```json
{
  "code": 404,
  "message": "Document not found",
  "data": null
}
```

**服务器错误**

```json
{
  "code": 500,
  "message": "Failed to read document",
  "data": null
}
```

### 安全说明

- **slug 白名单校验**：只允许字母、数字、连字符（-）、下划线（\_），防止路径遍历攻击
- **速率限制**：30 req/min per IP，超限返回 429 并附带 `Retry-After` 头
- **文件位置**：文档统一存储在 `docs/modules/{slug}.md`
- **缓存**：响应缓存 1 小时（`Cache-Control: private, max-age=3600`）

### 速率限制响应头

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Remaining: 0
```

---

## GET /api/v1/dashboard/overview — 仪表盘概览

### 功能说明

获取仪表盘概览数据（代理到 Express 后端）。

### 请求

```
GET /api/v1/dashboard/overview
Authorization: Bearer <token>
```

### 响应

```json
{
  "success": true,
  "code": 200,
  "data": {
    "totalProjects": 12,
    "activeVersions": 8,
    "recentBuilds": [...],
    "taskSummary": {
      "pending": 5,
      "inProgress": 3,
      "completed": 20
    }
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**说明**：实际响应内容由 Express 后端决定，此为示例格式。

---

## 速率限制说明

系统级 API 使用以下速率限制策略：

| 端点                 | 限制        | 适用对象 |
| -------------------- | ----------- | -------- |
| `/api/health`        | 无限制      | -        |
| `/api/download`      | 30 req/min  | IP       |
| `/api/v1/*` (已认证) | 120 req/min | 用户     |
| `/api/v1/*` (admin)  | 200 req/min | 用户     |

速率限制使用滑动窗口算法，在内存中记录每个标识符的请求时间戳。部署在多进程环境时需使用 Redis 后端。

---

## 注意事项

1. `/api/health` 和 `/api/download` 是仅有的两个**无需认证**的端点
2. `/api/download` 使用速率限制，其他系统端点不受限制
3. 所有 API 响应都包含 `X-Request-ID` 头用于追踪
4. 错误响应格式：`{ code, message, data }`（不使用 success 字段）
