# 飞书集成 API

> 📅 更新日期：2026-03-24
> 📁 路径：`app/api/v1/feishu/`

---

## 概述

飞书集成 API 提供与飞书（Lark/Feishu）消息平台的集成能力，包括获取群聊列表和历史消息。所有接口调用飞书 Open API。

**基础路径**：`/api/v1/feishu`

**认证**：需要 Bearer Token（JWT）

**配置要求**：需要设置以下环境变量：

- `FEISHU_APP_ID` - 飞书应用 ID
- `FEISHU_APP_SECRET` - 飞书应用密钥

---

## API 端点列表

| 方法 | 路径                      | 说明                    | 认证要求   |
| ---- | ------------------------- | ----------------------- | ---------- |
| GET  | `/api/v1/feishu/chats`    | 获取 Bot 所在的群聊列表 | 已登录用户 |
| GET  | `/api/v1/feishu/messages` | 获取群聊历史消息        | 已登录用户 |

---

## 端点详情

### GET /api/v1/feishu/chats

获取当前飞书 Bot 所在的所有群聊列表。

**请求**

```
GET /api/v1/feishu/chats?page_size=20&page_token=xxx
Authorization: Bearer <token>
```

**Query 参数**

| 参数         | 类型   | 必填 | 默认值 | 说明                         |
| ------------ | ------ | ---- | ------ | ---------------------------- |
| `page_size`  | string | 否   | 20     | 每页数量（最大 100）         |
| `page_token` | string | 否   | -      | 分页 token（来自上一次响应） |

**响应（已配置飞书）**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "chats": [
      {
        "chatId": "oc_abc123456789",
        "name": "TeamClaw 开发群",
        "description": "TeamClaw 项目开发讨论群",
        "memberCount": 12
      }
    ],
    "pageToken": "xxx",
    "hasMore": true,
    "configured": true
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**响应（未配置飞书）**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "chats": [],
    "notice": "飞书 API 未配置，请设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET 环境变量",
    "configured": false
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**字段说明**

| 字段          | 类型    | 说明                |
| ------------- | ------- | ------------------- |
| `chatId`      | string  | 飞书群 ID           |
| `name`        | string  | 群名称              |
| `description` | string  | 群描述              |
| `memberCount` | number  | 群成员数量          |
| `configured`  | boolean | 飞书 API 是否已配置 |
| `hasMore`     | boolean | 是否有更多数据      |

**状态码**

| 状态码 | 说明                             |
| ------ | -------------------------------- |
| 200    | 请求成功（即使未配置也返回 200） |
| 401    | 未认证                           |
| 500    | 飞书 API 调用失败                |

---

### GET /api/v1/feishu/messages

获取指定群聊的历史消息。

**请求**

```
GET /api/v1/feishu/messages?container_id=oc_abc123456789&container_id_type=chat&page_size=20&sort_type=ByCreateTimeDesc
Authorization: Bearer <token>
```

**Query 参数**

| 参数                | 类型   | 必填 | 默认值           | 说明                                         |
| ------------------- | ------ | ---- | ---------------- | -------------------------------------------- |
| `container_id`      | string | 是   | -                | 群聊 ID（chat_id）                           |
| `container_id_type` | string | 否   | chat             | 容器类型，支持 chat / p2p                    |
| `page_size`         | string | 否   | 20               | 每页数量（最大 100）                         |
| `page_token`        | string | 否   | -                | 分页 token                                   |
| `sort_type`         | string | 否   | ByCreateTimeDesc | 排序方式：ByCreateTimeDesc / ByCreateTimeAsc |

**响应**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "messages": [
      {
        "id": "om_xyz789",
        "content": "构建成功了！",
        "senderName": "ou_da6b48690e83a478e3e3993ecc62da0e",
        "senderOpenId": "ou_da6b48690e83a478e3e3993ecc62da0e",
        "timestamp": "2026-03-24T10:30:00.000Z",
        "chatId": "oc_abc123456789",
        "chatType": "group"
      }
    ],
    "pageToken": "xxx",
    "hasMore": true,
    "configured": true
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**消息内容处理**

消息的 `content` 字段会经过解析：

- 如果是 JSON 格式（如富文本消息），提取 `text` 字段
- 如果是纯文本，直接返回

**响应（未配置飞书）**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "messages": [],
    "notice": "飞书 API 未配置，请设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET 环境变量",
    "configured": false
  },
  "message": "ok",
  "requestId": "req_abc123"
}
```

**状态码**

| 状态码 | 说明                   |
| ------ | ---------------------- |
| 200    | 请求成功               |
| 400    | 缺少 container_id 参数 |
| 401    | 未认证                 |
| 500    | 飞书 API 调用失败      |

---

## 飞书 API Token 获取

本模块使用飞书 App Access Token 进行 API 调用。Token 通过以下端点获取：

```
POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal
Content-Type: application/json

{
  "app_id": "cli_xxx",
  "app_secret": "xxx"
}
```

Token 有效期为 2 小时，会自动刷新。

---

## 内部实现

### getAppAccessToken

```typescript
// lib/api/feishu.ts
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppAccessToken(appId: string, appSecret: string): Promise<string> {
  // 缓存检查（Token 有效期 2 小时）
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  // 调用飞书 API 获取新 Token
  const resp = await fetch(`${FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = await resp.json();
  cachedToken = { token: data.tenant_access_token, expiresAt: Date.now() + 7200000 };
  return cachedToken.token;
}
```

---

## 错误处理

飞书 API 错误会返回 500 状态码，并在 message 中包含飞书返回的错误信息：

```json
{
  "success": false,
  "code": 500,
  "data": null,
  "message": "获取群聊列表失败: Feishu API error: 99991400",
  "requestId": "req_abc123"
}
```

常见飞书错误码：

- `99991400` - API 权限不足
- `99991663` - 机器人不在该群中
- `99991401` - 应用 secret 错误

---

## 注意事项

1. **优雅降级**：如果飞书 API 未配置（缺少环境变量），接口仍返回 200 状态码，但 `configured: false`，`chats/messages` 为空数组
2. **Bot 权限**：确保飞书 Bot 已经被加入到目标群聊中
3. **消息内容解析**：消息 content 可能是 JSON 格式，会自动提取 text 字段
4. **飞书 API 文档**：<https://open.feishu.cn/document/server-docs/im-v1/message/list>
5. **CORS**：支持跨域请求
