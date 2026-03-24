# 飞书机器人配置指南

> 飞书（Lark/Feishu）机器人集成配置完整指南，涵盖飞书开放平台应用创建、权限配置、事件订阅与 API 集成。

---

## 目录

- [飞书开放平台应用创建](#飞书开放平台应用创建)
- [获取 App ID 和 App Secret](#获取-app-id-和-app-secret)
- [配置权限](#配置权限)
- [配置事件订阅](#配置事件订阅)
- [配置环境变量](#配置环境变量)
- [API 端点说明](#api-端点说明)
- [前端飞书集成](#前端飞书集成)
- [常见问题](#常见问题)

---

## 飞书开放平台应用创建

### 1. 创建应用

1. 访问 [飞书开放平台](https://open.feishu.cn/app) 并登录
2. 点击 **「创建企业自建应用」**
3. 填写应用信息：
   - **应用名称**：`TeamClaw`（或自定义）
   - **应用描述**：团队协作管理平台
   - **应用图标**：上传图标（可选）
4. 点击 **「确认创建」**

### 2. 获取版本并发布

1. 进入应用后，点击左侧 **「版本管理与发布」**
2. 点击 **「创建版本」**
3. 填写版本号（如 `1.0.0`）和更新说明
4. 点击 **「保存」**
5. 点击 **「申请发布」**（如需管理员审核）

---

## 获取 App ID 和 App Secret

1. 进入应用 → **「凭证与基础信息」**
2. 复制 **App ID**（格式：`cli_xxxxxxxx`）和 **App Secret**

```bash
# 环境变量配置
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=your-feishu-app-secret
```

---

## 配置权限

### 申请权限

进入应用 → **「权限管理」**，搜索并开通以下权限：

| 权限名称 | 权限标识 | 用途 |
|----------|----------|------|
| 获取群组信息 | `im:chat:readonly` | 获取 Bot 所在群聊列表 |
| 获取群成员信息 | `im:chat.member:readonly` | 获取群成员列表 |
| 获取用户信息 | `contact:user.id:readonly` | 获取用户基本信息 |
| 发送消息 | `im:message:send_as_bot` | 机器人发送消息 |
| 读取消息 | `im:message:read` | 读取群聊历史消息 |
| 使用云文档 | `docx:document:readonly` | 访问飞书云文档 |

> **注意**：部分权限需要管理员审批后才能使用，请在飞书管理后台确认审批状态。

---

## 配置事件订阅

### 启用事件订阅

1. 进入应用 → **「添加应用能力」** → **「机器人」**
2. 点击 **「事件订阅」**
3. 配置 **「请求地址 URL」**：

```
https://your-domain.com/api/v1/feishu/webhook
```

> ⚠️ 必须使用 HTTPS 协议，飞书不支持 HTTP。

### 订阅事件

在事件订阅页面，点击 **「添加事件」**，开通以下事件：

| 事件名称 | 事件标识 | 触发时机 |
|----------|----------|----------|
| 接收消息 | `im.message.receive_v1` | 机器人收到新消息时触发 |
| 群聊信息变更 | `im.chat.changed_v1` | 群聊信息变更时触发 |

订阅后，需在应用 **「版本管理与发布」** 中重新发布生效。

---

## 配置环境变量

### 开发环境

```bash
# .env（开发）
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=your-feishu-app-secret
```

### 生产环境（Docker）

```bash
# .env.production
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=your-feishu-app-secret
```

### Docker Compose 环境变量

在 `docker-compose.yml` 中添加：

```yaml
services:
  server:
    environment:
      - FEISHU_APP_ID=${FEISHU_APP_ID}
      - FEISHU_APP_SECRET=${FEISHU_APP_SECRET}
    # ...
```

---

## API 端点说明

TeamClaw 后端提供以下飞书相关 API 端点：

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/api/v1/feishu/chats` | 获取 Bot 所在的所有群聊列表 | 已登录用户 |
| `GET` | `/api/v1/feishu/messages` | 获取指定群聊的历史消息 | 已登录用户 |
| `GET` | `/api/v1/feishu/chats/:chatId/members` | 获取指定群聊的成员列表 | 已登录用户 |
| `POST` | `/api/v1/feishu/webhook` | 飞书事件回调（无需认证，Webhook 签名验证） | 飞书平台 |

### 获取群聊列表

```
GET /api/v1/feishu/chats?page_size=20
Authorization: Bearer <jwt_token>
```

响应示例：

```json
{
  "code": 200,
  "data": [
    {
      "chatId": "oc_xxxxxx",
      "name": "TeamClaw 通知群",
      "memberCount": 10,
      "description": "TeamClaw 项目通知"
    }
  ]
}
```

### 获取群聊消息

```
GET /api/v1/feishu/messages?chat_id=oc_xxxxxx&page_size=20
Authorization: Bearer <jwt_token>
```

### 事件回调（Webhook）

飞书服务器向配置的 Webhook URL 推送事件：

```
POST /api/v1/feishu/webhook
Content-Type: application/json
X-Lark-Signature: <signature>
```

TeamClaw 通过 `messagePipeline.ts` 处理接收到的消息事件，实现自动化响应。

---

## 前端飞书集成

### 前端 API 客户端

`lib/api/feishu.ts` 提供完整的飞书 API 封装：

```ts
import { feishuApi } from 'lib/api/feishu';

// 获取群聊列表
const { data: chats } = useQuery({
  queryKey: ['feishu', 'chats'],
  queryFn: () => feishuApi.getChats({ pageSize: 20 }),
});

// 获取群聊消息
const { data: messages } = useQuery({
  queryKey: ['feishu', 'messages', chatId],
  queryFn: () => feishuApi.getMessages({ chatId, pageSize: 50 }),
});

// 获取群成员列表
const { data: members } = useQuery({
  queryKey: ['feishu', 'members', chatId],
  queryFn: () => feishuApi.getChatMembers(chatId),
});
```

### 飞书集成页面

前端 `app/(dashboard)/settings/integrations/feishu/page.tsx` 提供飞书集成的配置 UI，支持：
- 连接测试（验证 App ID / Secret 是否有效）
- 群聊选择与绑定
- 通知渠道配置

---

## 常见问题

### Q: 事件订阅 URL 验证失败怎么办？

**检查项**：
1. 确保 Webhook URL 使用 HTTPS（飞书要求）
2. 确保服务器能响应 GET 请求（飞书会在配置时发送验证请求）
3. 检查防火墙/Nginx 是否放行了 Webhook 路径
4. 查看服务器日志确认请求是否到达：

```bash
# 查看 Webhook 请求日志
docker-compose logs server | grep webhook
```

### Q: 机器人收不到消息？

**检查项**：
1. 确认应用已发布且权限已审批
2. 确认机器人已加入目标群聊（通过群设置添加机器人）
3. 确认已订阅 `im.message.receive_v1` 事件
4. 检查事件订阅的版本是否已生效

### Q: 如何让机器人主动发送消息？

**方式一**：通过飞书 Open API 发送（后端已封装）

```ts
import { FeishuService } from '../services/feishuService.js';

const feishu = FeishuService.getInstance();
await feishu.sendMessage({
  receiveId: 'oc_xxxxxx',  // 群 ID
  msgType: 'text',
  content: JSON.stringify({ text: '任务已完成！' }),
});
```

**方式二**：使用消息队列触发

```ts
// 通过消息管道发送
import { processMessage } from '../services/messagePipeline.js';

await processMessage({
  type: 'feishu',
  chatId: 'oc_xxxxxx',
  message: '构建成功',
});
```

### Q: 如何在 Docker 环境下配置飞书 Webhook？

飞书要求 Webhook URL 必须公网可访问，本地开发建议使用内网穿透工具：

```bash
# 使用 ngrok 内网穿透
ngrok http 9700
# 将返回的 HTTPS URL 配置到飞书事件订阅
# 例如：https://xxxx.ngrok.io/api/v1/feishu/webhook
```

### Q: 飞书应用需要管理员审核吗？

- **自建应用**：通常需要管理员审批才能发布到全公司。可先在 **「版本管理与发布」** 中创建测试版本，通过链接邀请测试人员。
- **测试阶段**：在飞书开放平台应用设置中，可通过 **「添加测试人员」** 绕过审核限制。

---

## 相关文档

- [环境变量配置](./environment-variables.md) — 包含 `FEISHU_APP_ID` / `FEISHU_APP_SECRET` 详细说明
- [飞书集成 API](../client/api/feishu.md) — 前端飞书 API 完整文档
- [消息机制模块](../modules/消息机制模块.md) — 消息管道与事件处理设计
