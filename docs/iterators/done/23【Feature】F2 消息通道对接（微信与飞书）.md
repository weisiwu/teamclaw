# 【Feature】F2 消息通道对接（微信/飞书）

> 优先级：高
> 前置依赖：【Feature】F1 Agent 协作流程、人员与权限模块
> 关联模块：[消息机制模块](../modules/消息机制模块.md)

---

## 1. 现状分析

### 1.1 已有代码

| 文件 | 状态 | 说明 |
|------|------|------|
| `server/src/services/channelAdapter.ts` | 骨架已有 | 消息格式统一转换接口，但无真实通道对接 |
| `server/src/services/feishuService.ts` | 骨架已有 | 飞书服务，需验证是否完整 |
| `server/src/services/messageMerger.ts` | 已实现 | 5 分钟内消息合并逻辑 |
| `server/src/services/messageChannelAggregator.ts` | 已实现 | 多通道消息聚合 |
| `server/src/services/messageCircuitBreaker.ts` | 已实现 | 消息熔断器 |
| `server/src/services/messageDLQ.ts` | 已实现 | 死信队列 |
| `server/src/routes/message.ts` | 已实现 | 消息路由，接收消息 API |
| `server/src/routes/feishu.ts` | 已实现 | 飞书 Webhook 路由 |

### 1.2 缺失功能

- **微信 Webhook 接入**：无 `wechatService.ts`，微信消息接收/发送未实现
- **飞书完整集成**：飞书事件订阅回调、消息发送（群聊通知）未完成
- **消息发送能力**：当前只有接收消息，缺少 **向群聊发送消息** 的能力（Agent 回复用户需要此功能）
- **@Agent 识别**：消息中 `@main` / `@pm` 的识别和路由未实现
- **优先级抢占完整实现**：`preemptionService.ts` 不存在，抢占规则（新优先级 > 当前 × 1.5）未编码
- **文件消息处理**：`fileProcessor.ts` 不存在，群聊中发送的文档文件无法自动归档

---

## 2. 目标

```
微信群聊 ─── Webhook ──→ channelAdapter ──→ 统一消息格式
飞书群聊 ─── EventSub ──→ channelAdapter ──→ 统一消息格式
                                              │
                                              ▼
                                    消息队列（优先级排序）
                                              │
                                              ▼
                                    Agent 协作流水线（F1）
                                              │
                                              ▼
                                    channelAdapter ──→ 向群聊发送回复
```

---

## 3. 实现步骤

### Step 1：微信通道适配器

**新建 `server/src/services/wechatService.ts`**：

```typescript
// 基于 Wechaty 框架接入微信群聊
import { WechatyBuilder } from 'wechaty';

export class WechatService {
  // 初始化 Wechaty Bot
  async init(): Promise<void>;

  // 接收群聊消息 → 转换为统一 Message 格式
  async onMessage(msg: WechatyMessage): Promise<UnifiedMessage | null>;

  // 发送消息到群聊（Agent 回复）
  async sendToGroup(groupId: string, content: string): Promise<void>;

  // 识别 @Agent 提及
  parseAtMention(content: string): { agent: string; cleanContent: string } | null;

  // 处理文件消息
  async handleFileMessage(msg: WechatyMessage): Promise<FileMessage | null>;
}
```

### Step 2：飞书通道适配器完善

**修改 `server/src/services/feishuService.ts`**：

```typescript
export class FeishuService {
  // 验证飞书事件订阅签名
  verifySignature(timestamp: string, nonce: string, body: string, signature: string): boolean;

  // 接收事件回调（群聊消息）
  async handleEvent(event: FeishuEvent): Promise<UnifiedMessage | null>;

  // 发送消息到群聊
  async sendToGroup(chatId: string, content: string): Promise<void>;

  // 获取 Tenant Access Token
  async getTenantToken(): Promise<string>;

  // @Agent 识别（飞书 at 格式不同于微信）
  parseAtMention(mentions: FeishuMention[]): { agent: string } | null;
}
```

### Step 3：统一通道适配器

**修改 `server/src/services/channelAdapter.ts`**：

```typescript
export interface UnifiedMessage {
  messageId: string;
  channel: 'wechat' | 'feishu' | 'web';
  userId: string;
  userName: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'voice';
  mentionedAgent?: string; // @main / @pm
  groupId: string;
  timestamp: string;
  rawData?: unknown;
}

export class ChannelAdapter {
  // 注册通道
  registerChannel(name: string, service: WechatService | FeishuService): void;

  // 接收消息（统一入口）
  async receive(channel: string, rawMessage: unknown): Promise<UnifiedMessage>;

  // 发送消息（统一出口）
  async send(channel: string, groupId: string, content: string): Promise<void>;
}
```

### Step 4：优先级抢占引擎

**新建 `server/src/services/preemptionService.ts`**：

```typescript
export class PreemptionService {
  // 判断是否触发抢占
  shouldPreempt(newPriority: number, currentPriority: number): boolean {
    return newPriority > currentPriority * 1.5;
  }

  // 执行抢占
  async preempt(newTaskId: string, currentTaskId: string): Promise<{
    preempted: boolean;
    suspendedTask: string;
    notification: string;
  }>;

  // 恢复被抢占任务
  async resumeSuspended(taskId: string): Promise<void>;
}
```

### Step 5：文件消息处理

**新建 `server/src/services/fileProcessor.ts`**：

```typescript
export class FileProcessor {
  // 识别文件类型
  detectType(filename: string): SupportedDocType;

  // 下载并存储文件
  async download(url: string, projectName: string): Promise<string>; // 本地路径

  // 提取文本内容（调用 docParser）
  async extractText(filePath: string): Promise<string>;

  // 自动归档到文档库
  async archive(filePath: string, projectName: string): Promise<void>;
}
```

### Step 6：@Agent 路由

**修改 `server/src/routes/message.ts`**：

在消息接收 API 中添加 @Agent 识别和路由逻辑：

```typescript
router.post('/', async (req, res) => {
  const message = await channelAdapter.receive(req.body.channel, req.body);

  // 1. 消息合并检查
  const merged = messageMerger.addMessage(message);

  // 2. 优先级计算
  const priority = priorityCalculator.calculate(message);

  // 3. @Agent 路由
  if (message.mentionedAgent) {
    // 权限检查
    const permResult = checkPermission(message.userId, message.mentionedAgent);
    if (!permResult.allowed) {
      await channelAdapter.send(message.channel, message.groupId, '正在忙，抱歉');
      return;
    }

    // 抢占检查
    if (preemptionService.shouldPreempt(priority, currentPriority)) {
      await preemptionService.preempt(newTaskId, currentTaskId);
    }

    // 触发 Agent 流水线
    await agentPipeline.execute(taskId, message.content);
  }
});
```

---

## 4. 涉及文件

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `server/src/services/wechatService.ts` | 微信通道适配 |
| 修改 | `server/src/services/feishuService.ts` | 飞书完整集成 |
| 修改 | `server/src/services/channelAdapter.ts` | 统一通道管理 |
| 新建 | `server/src/services/preemptionService.ts` | 优先级抢占引擎 |
| 新建 | `server/src/services/fileProcessor.ts` | 文件消息处理 |
| 修改 | `server/src/routes/message.ts` | @Agent 路由 + 抢占逻辑 |
| 修改 | `server/src/routes/feishu.ts` | 完善飞书 Webhook 回调 |
| 修改 | `app/messages/page.tsx` | 前端展示通道来源标识 |

---

## 5. 环境配置

需要在 `.env` 中新增：

```bash
# 微信
WECHAT_PUPPET=wechaty-puppet-wechat
WECHAT_TOKEN=your_wechat_token

# 飞书
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_VERIFICATION_TOKEN=your_verification_token
FEISHU_ENCRYPT_KEY=your_encrypt_key
```

---

## 6. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 飞书群聊发送 `@main 需求描述` 后，系统正确接收并解析 | 飞书群聊测试 |
| 2 | 消息经过 channelAdapter 转换为统一格式 | 日志验证 |
| 3 | 优先级计算正确：管理员 × 紧急度 | API 验证 |
| 4 | 高优先级消息触发抢占，被抢占任务进入 suspended | API + 日志 |
| 5 | 同用户 5 分钟内连续消息被合并 | API 验证 |
| 6 | Agent 回复消息正确发送到原始群聊 | 群聊观察 |
| 7 | 文件消息自动下载并归档到文档库 | 文件系统检查 |
| 8 | 无权限用户 @main 收到「正在忙」回复 | 群聊测试 |
| 9 | 消息队列页面展示通道来源（微信/飞书/Web） | 浏览器截图 |
