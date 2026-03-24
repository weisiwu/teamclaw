# apiErrorCodes.ts — API 错误码标准定义

**文件路径**: `server/src/constants/apiErrorCodes.ts`

---

## 职责

定义系统级 API 错误码体系（`API_ERROR_CODES`），按类别分为 1xxx ~ 5xxx 五段，便于客户端做统一错误分支处理。每个错误码附带人类可读中文消息（通过 `getErrorMessage()` 获取）。

---

## 错误码结构

```
[类别][序号]
```

| 类别 | 范围       | 说明                 |
| ---- | ---------- | -------------------- |
| 1xxx | 通用错误   | 认证、授权、参数校验 |
| 2xxx | 资源操作   | CRUD 相关            |
| 3xxx | 业务逻辑   | 状态、转换、冲突     |
| 4xxx | 第三方服务 | Git、构建、LLM       |
| 5xxx | 系统错误   | 数据库、缓存等       |

---

## 错误码清单

### 1xxx — 通用错误

| 错误码常量           | 值   | 默认消息                 |
| -------------------- | ---- | ------------------------ |
| `UNAUTHORIZED`       | 1001 | 未认证，请登录后操作     |
| `FORBIDDEN`          | 1002 | 无权访问此资源           |
| `INVALID_PARAMETER`  | 1003 | 参数格式错误             |
| `MISSING_PARAMETER`  | 1004 | 缺少必填参数             |
| `RESOURCE_NOT_FOUND` | 1005 | 资源不存在               |
| `METHOD_NOT_ALLOWED` | 1006 | HTTP 方法不允许          |
| `REQUEST_TIMEOUT`    | 1007 | 请求超时                 |
| `RATE_LIMITED`       | 1008 | 请求过于频繁，请稍后再试 |

### 2xxx — 资源操作错误

| 错误码常量               | 值   | 默认消息         |
| ------------------------ | ---- | ---------------- |
| `CREATE_FAILED`          | 2001 | 创建资源失败     |
| `UPDATE_FAILED`          | 2002 | 更新资源失败     |
| `DELETE_FAILED`          | 2003 | 删除资源失败     |
| `QUERY_FAILED`           | 2004 | 查询资源失败     |
| `DUPLICATE_RESOURCE`     | 2005 | 资源已存在       |
| `BULK_OPERATION_PARTIAL` | 2006 | 批量操作部分失败 |
| `BULK_OPERATION_FAILED`  | 2007 | 批量操作全部失败 |

### 3xxx — 业务逻辑错误

| 错误码常量                | 值   | 默认消息                           |
| ------------------------- | ---- | ---------------------------------- |
| `INVALID_STATUS`          | 3001 | 资源状态不合法                     |
| `INVALID_TRANSITION`      | 3002 | 状态转换不合法                     |
| `CONCURRENT_MODIFICATION` | 3003 | 资源已被其他操作修改，请刷新后重试 |
| `PRECONDITION_FAILED`     | 3004 | 操作前置条件不满足                 |
| `DEPENDENCY_NOT_READY`    | 3005 | 依赖资源未就绪                     |
| `QUOTA_EXCEEDED`          | 3006 | 配额超限                           |
| `FEATURE_DISABLED`        | 3007 | 功能已禁用                         |

### 4xxx — 第三方服务错误

| 错误码常量           | 值   | 默认消息         |
| -------------------- | ---- | ---------------- |
| `GIT_ERROR`          | 4001 | Git 操作失败     |
| `BUILD_ERROR`        | 4002 | 构建失败         |
| `LLM_ERROR`          | 4003 | AI 服务调用失败  |
| `WEBHOOK_ERROR`      | 4004 | Webhook 调用失败 |
| `FILE_STORAGE_ERROR` | 4005 | 文件存储服务错误 |
| `EXTERNAL_API_ERROR` | 4006 | 外部服务调用失败 |

### 5xxx — 系统错误

| 错误码常量            | 值   | 默认消息               |
| --------------------- | ---- | ---------------------- |
| `DATABASE_ERROR`      | 5001 | 数据库操作失败         |
| `CACHE_ERROR`         | 5002 | 缓存服务错误           |
| `INTERNAL_ERROR`      | 5003 | 内部错误，请联系管理员 |
| `SERVICE_UNAVAILABLE` | 5004 | 服务暂时不可用         |
| `NOT_IMPLEMENTED`     | 5005 | 功能开发中，暂不支持   |

---

## 核心函数

### `getErrorMessage(code)`

根据错误码获取人类可读中文消息。

```typescript
function getErrorMessage(code: ApiErrorCode): string;
```

**示例**：

```typescript
import { API_ERROR_CODES, getErrorMessage } from '../constants/apiErrorCodes.js';

getErrorMessage(API_ERROR_CODES.UNAUTHORIZED);
// → '未认证，请登录后操作'

getErrorMessage(API_ERROR_CODES.DATABASE_ERROR);
// → '数据库操作失败'
```

---

## 变更记录

| 日期       | 变更内容                                                     |
| ---------- | ------------------------------------------------------------ |
| 2026-03-24 | 初始文档编写：1xxx~5xxx 错误码体系、getErrorMessage 辅助函数 |
