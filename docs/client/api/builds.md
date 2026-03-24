# 构建与产物 API

> 📅 更新日期：2026-03-24
> 📁 路径：`app/api/v1/build/`

---

## 概述

构建与产物 API 提供构建触发、状态查询、统计以及构建产物管理功能。构建产物存储在 `public/build-artifacts/` 目录。

**基础路径**：`/api/v1/build`

**认证**：

- `/build/trigger` - 需要 admin 或 vice_admin 权限
- `/build/stats` - 需要 admin 或 vice_admin 权限
- `/build/artifacts` - 已登录用户

---

## API 端点列表

| 方法   | 路径                                 | 说明                   | 认证要求         |
| ------ | ------------------------------------ | ---------------------- | ---------------- |
| POST   | `/api/v1/build/trigger`              | 触发构建               | admin/vice_admin |
| GET    | `/api/v1/build/trigger`              | 查询构建状态           | admin/vice_admin |
| GET    | `/api/v1/build/stats`                | 获取构建统计           | admin/vice_admin |
| GET    | `/api/v1/build/artifacts`            | 列出构建产物           | 已登录用户       |
| POST   | `/api/v1/build/artifacts`            | 上传构建产物           | 已登录用户       |
| DELETE | `/api/v1/build/artifacts`            | 删除构建产物           | 已登录用户       |
| GET    | `/api/v1/build/artifacts/:versionId` | 获取指定版本的产物     | -                |
| DELETE | `/api/v1/build/artifacts/:versionId` | 删除指定版本的所有产物 | -                |

---

## 端点详情

### POST /api/v1/build/trigger

触发一个新的构建任务。

**请求**

```
POST /api/v1/build/trigger
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**

```json
{
  "versionId": "v1.3.0",
  "versionName": "v1.3.0",
  "env": "production",
  "buildId": "build-abc123"
}
```

| 字段          | 类型   | 必填 | 约束                                      | 说明                        |
| ------------- | ------ | ---- | ----------------------------------------- | --------------------------- |
| `versionId`   | string | 是   | 字母、数字、-、\_、.                      | 版本 ID                     |
| `versionName` | string | 是   | 最多 128 字符                             | 版本名称                    |
| `env`         | string | 是   | production / staging / development / test | 构建环境                    |
| `buildId`     | string | 否   | 字母、数字、-、\_、.                      | 自定义构建 ID，默认自动生成 |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "buildId": "build-abc123",
    "versionId": "v1.3.0",
    "env": "production",
    "status": "queued",
    "queuedAt": "2026-03-24T18:00:00Z"
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**环境说明**

| env           | 说明           |
| ------------- | -------------- |
| `production`  | 生产环境构建   |
| `staging`     | 预发布环境构建 |
| `development` | 开发环境构建   |
| `test`        | 测试环境构建   |

**状态码**

| 状态码 | 说明                                         |
| ------ | -------------------------------------------- |
| 200    | 触发成功                                     |
| 400    | 参数错误（versionId 格式不对、环境不合法等） |
| 401    | 未认证                                       |
| 403    | 需要 admin 或 vice_admin 权限                |
| 415    | Content-Type 必须是 application/json         |
| 500    | 服务器错误                                   |

---

### GET /api/v1/build/trigger

查询构建状态。

**请求**

```
GET /api/v1/build/trigger?buildId=build-abc123
Authorization: Bearer <token>
```

**Query 参数**

| 参数      | 类型   | 必填 | 说明    |
| --------- | ------ | ---- | ------- |
| `buildId` | string | 是   | 构建 ID |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "buildId": "build-abc123",
    "versionId": "v1.3.0",
    "env": "production",
    "status": "success",
    "startedAt": "2026-03-24T18:00:00Z",
    "finishedAt": "2026-03-24T18:05:30Z",
    "duration": 330
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**构建状态**

| status      | 说明     |
| ----------- | -------- |
| `queued`    | 排队中   |
| `running`   | 构建中   |
| `success`   | 构建成功 |
| `failed`    | 构建失败 |
| `cancelled` | 已取消   |

---

### GET /api/v1/build/stats

获取构建统计信息。

**请求**

```
GET /api/v1/build/stats
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "total": 150,
    "success": 130,
    "failed": 15,
    "successRate": 0.867,
    "avgDuration": 245
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

| 字段          | 类型   | 说明               |
| ------------- | ------ | ------------------ |
| `total`       | number | 总构建次数         |
| `success`     | number | 成功次数           |
| `failed`      | number | 失败次数           |
| `successRate` | number | 成功率（0-1）      |
| `avgDuration` | number | 平均构建时长（秒） |

---

### GET /api/v1/build/artifacts

列出构建产物。

**请求**

```
GET /api/v1/build/artifacts?versionName=v1.3.0&page=1&pageSize=20
Authorization: Bearer <token>
```

**Query 参数**

| 参数          | 类型   | 必填 | 默认值 | 说明                           |
| ------------- | ------ | ---- | ------ | ------------------------------ |
| `versionName` | string | 否   | -      | 按版本名筛选（不传则列出全部） |
| `page`        | number | 否   | 1      | 页码                           |
| `pageSize`    | number | 否   | 20     | 每页数量（最大 100）           |

**产物文件命名规范**

```
teamclaw-{versionName}-{platform}-{arch}.{ext}
# 示例：teamclaw-v1.3.0-darwin-arm64.tar.gz
# 示例：teamclaw-v1.3.0-linux-x64.zip
```

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "artifacts": [
      {
        "filename": "teamclaw-v1.3.0-darwin-arm64.tar.gz",
        "versionName": "v1.3.0",
        "env": "production",
        "platform": "darwin",
        "arch": "arm64",
        "size": "125.4 MB",
        "sizeBytes": 131547136,
        "createdAt": "2026-03-24T18:05:30Z",
        "downloadUrl": "/build-artifacts/v1.3.0/teamclaw-v1.3.0-darwin-arm64.tar.gz"
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

---

### POST /api/v1/build/artifacts

上传构建产物（multipart/form-data）。

**请求**

```
POST /api/v1/build/artifacts
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**表单字段**

| 字段          | 类型   | 必填 | 说明                                             |
| ------------- | ------ | ---- | ------------------------------------------------ |
| `file`        | File   | 是   | 产物文件（.tar.gz 或 .zip）                      |
| `versionName` | string | 是   | 版本名称                                         |
| `platform`    | string | 否   | 平台（darwin / linux / windows），默认 "unknown" |
| `arch`        | string | 否   | 架构（arm64 / x64），默认 "unknown"              |

**限制**

- 文件大小上限：500MB
- versionName 只允许字母、数字、-、\_、.

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "filename": "teamclaw-v1.3.0-darwin-arm64.tar.gz",
    "size": "125.4 MB",
    "sizeBytes": 131547136,
    "downloadUrl": "/build-artifacts/v1.3.0/teamclaw-v1.3.0-darwin-arm64.tar.gz",
    "createdAt": "2026-03-24T18:05:30Z"
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**状态码**

| 状态码 | 说明                |
| ------ | ------------------- |
| 200    | 上传成功            |
| 400    | 参数错误            |
| 401    | 未认证              |
| 413    | 文件过大（> 500MB） |
| 500    | 服务器错误          |

---

### DELETE /api/v1/build/artifacts

删除指定构建产物。

**请求**

```
DELETE /api/v1/build/artifacts?filename=teamclaw-v1.3.0-darwin-arm64.tar.gz&versionName=v1.3.0
Authorization: Bearer <token>
```

**Query 参数**

| 参数          | 类型   | 必填 | 说明     |
| ------------- | ------ | ---- | -------- |
| `filename`    | string | 是   | 文件名   |
| `versionName` | string | 是   | 版本名称 |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "filename": "teamclaw-v1.3.0-darwin-arm64.tar.gz",
    "versionName": "v1.3.0"
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**状态码**

| 状态码 | 说明       |
| ------ | ---------- |
| 200    | 删除成功   |
| 400    | 缺少参数   |
| 401    | 未认证     |
| 404    | 产物不存在 |
| 500    | 服务器错误 |

---

### GET /api/v1/build/artifacts/:versionId

从 Express 后端获取指定版本的产物信息。

**请求**

```
GET /api/v1/build/artifacts/v1.3.0
Authorization: Bearer <token>
```

**Query 参数**

| 参数          | 类型   | 必填 | 说明       |
| ------------- | ------ | ---- | ---------- |
| `buildNumber` | string | 否   | 指定构建号 |

**注意**：`versionId` 只允许字母、数字、-、\_、.，防止路径遍历攻击。

---

### DELETE /api/v1/build/artifacts/:versionId

删除 Express 后端存储的指定版本所有产物。

**请求**

```
DELETE /api/v1/build/artifacts/v1.3.0
Authorization: Bearer <token>
```

---

## 错误代码

| HTTP 状态码 | errorCode           | 说明                              |
| ----------- | ------------------- | --------------------------------- |
| 400         | BAD_REQUEST         | 参数错误或格式不合法              |
| 401         | UNAUTHORIZED        | 未认证                            |
| 403         | FORBIDDEN           | 权限不足（需要 admin/vice_admin） |
| 404         | NOT_FOUND           | 产物不存在                        |
| 413         | PAYLOAD_TOO_LARGE   | 文件超过 500MB                    |
| 429         | RATE_LIMITED        | 请求过于频繁                      |
| 500         | INTERNAL_ERROR      | 服务器错误                        |
| 503         | SERVICE_UNAVAILABLE | 后端服务不可用                    |
| 504         | GATEWAY_TIMEOUT     | 后端超时（5s）                    |

---

## 注意事项

1. **产物本地存储**：构建产物保存在 `public/build-artifacts/{versionName}/` 目录
2. **路径安全**：所有 versionName/versionId 必须符合 `/^[a-zA-Z0-9_.-]+$/` 正则，防止路径遍历
3. **代理超时**：代理到 Express 后端的请求有 5 秒超时限制
4. **速率限制**：构建触发和统计需要 admin 权限，产物管理需要已登录
5. **环境变量**：`EXPRESS_BACKEND_URL` 配置 Express 后端地址，默认 `http://localhost:3001`
