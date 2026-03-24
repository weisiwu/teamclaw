# 消息机制模型

> 来源文件：`server/src/models/message.ts`, `server/src/constants/roles.ts`

## Message 模型

核心消息数据模型。

```typescript
export interface Message {
  // 标识
  messageId: string; // 唯一消息ID，格式: msg_{timestamp}_{random}

  // 信道与用户
  channel: 'wechat' | 'feishu' | 'slack' | 'web';
  userId: string;
  userName: string;
  role: 'admin' | 'vice_admin' | 'employee';
  roleWeight: number; // 角色权重：admin=10, vice_admin=7, employee=3

  // 内容
  content: string;
  type: 'text' | 'file' | 'image' | 'voice' | 'emoji';

  // 优先级计算
  urgency: number; // 紧急度：普通=1, 紧急=3
  priority: number; // 计算后的优先级 = roleWeight × urgency

  // 状态与时间
  status: 'pending' | 'processing' | 'completed' | 'suspended' | 'merged';
  timestamp: string; // ISO 8601

  // 合并与抢占
  mergedFrom?: string[]; // 被合并的消息ID列表
  preemptedBy?: string; // 抢占者的消息ID

  // 文件信息
  fileInfo?: FileInfo;
}

export interface FileInfo {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl?: string;
  convertedContent?: string;
}
```

### channel 信道类型

| 信道     | 说明   |
| -------- | ------ |
| `wechat` | 微信   |
| `feishu` | 飞书   |
| `slack`  | Slack  |
| `web`    | 网页端 |

### type 消息类型

| 类型    | 说明     |
| ------- | -------- |
| `text`  | 文本消息 |
| `file`  | 文件     |
| `image` | 图片     |
| `voice` | 语音     |
| `emoji` | 表情     |

### status 消息状态

| 状态         | 说明             |
| ------------ | ---------------- |
| `pending`    | 等待处理         |
| `processing` | 处理中           |
| `completed`  | 已完成           |
| `suspended`  | 已挂起           |
| `merged`     | 已合并到其他消息 |

### 角色权重

```typescript
export const ROLE_WEIGHTS: Record<Message['role'], number> = {
  admin: 10,
  vice_admin: 7,
  employee: 3,
};
```

### 紧急关键词

```typescript
export const URGENCY_KEYWORDS = [
  '紧急',
  '立刻',
  '马上',
  '急',
  '快',
  'ASAP',
  'urgent',
  'immediately',
];
```

### 优先级计算公式

```
priority = roleWeight × urgency
```

示例：

- 管理员 + 普通紧急度 = 10 × 1 = 10
- 员工 + 紧急 = 3 × 3 = 9
- 管理员 + 紧急 = 10 × 3 = 30

## MessageQueue 模型

消息队列。

```typescript
export interface MessageQueue {
  queueId: string; // 格式: q_{date}_{seq}
  messages: Message[];
  total: number;
  currentProcessing: string | null; // 当前处理的消息ID
}

export interface QueueStatus {
  list: Pick<
    Message,
    'messageId' | 'userId' | 'userName' | 'role' | 'content' | 'priority' | 'status' | 'timestamp'
  >[];
  total: number;
  currentProcessing: string | null;
}
```

## API 请求类型

```typescript
export interface ReceiveMessageRequest {
  channel: Message['channel'];
  userId: string;
  userName: string;
  role: Message['role'];
  content: string;
  type?: Message['type'];
  mentionedAgent?: string;
  timestamp?: string;
  fileInfo?: FileInfo;
}

export interface PreemptionRequest {
  newMessageId: string;
}

export interface MessageHistoryQuery {
  page?: number;
  pageSize?: number;
  userId?: string;
  startTime?: string;
  endTime?: string;
  channel?: Message['channel'];
}

export interface PaginatedMessages {
  list: Message[];
  total: number;
  page: number;
  pageSize: number;
}
```

## 消息处理流程

### 优先级排序

1. 按 `priority` 降序
2. 同优先级按 `timestamp` 升序（先到先处理）

### 合并机制

低优先级消息可被高优先级消息抢占：

- 新消息到达时比较优先级
- 如果新消息优先级更高，旧消息标记为 `preemptedBy`

### 消息合并

同一用户短时间内多条消息可合并：

- 设置 `mergedFrom` 字段
- 合并后状态标记为 `merged`
