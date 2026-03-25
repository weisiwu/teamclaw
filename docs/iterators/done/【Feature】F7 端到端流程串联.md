# 【Feature】F7 端到端流程串联

> 优先级：高
> 前置依赖：F1（Agent 协作）、F2（消息通道）、F3（任务记忆）、F4（项目导入）、F5（版本构建）
> 关联模块：[后台管理平台模块](../modules/后台管理平台模块.md)、[系统架构](../系统架构.V1.md)

---

## 1. 现状分析

### 1.1 系统当前状态

各模块已独立实现（或有骨架），但缺乏模块间的流程串联。当前系统是一组 **孤立的 API 端点**，而非一个 **完整的自动化工作流**。

### 1.2 缺失的串联链路

| 链路 | 描述 | 状态 |
|------|------|------|
| **消息 → 任务** | 群聊消息自动创建任务 | ❌ 未串联 |
| **任务 → Agent** | 任务创建后自动触发 Agent 流水线 | ❌ 未串联 |
| **Agent → 代码** | Agent 执行结果应用到代码仓库 | ❌ 未串联 |
| **代码 → 版本** | 代码变更后自动触发版本 bump | ⚠️ autoBump hook 存在但未与 Agent 结果联动 |
| **版本 → 构建** | 版本创建后自动触发构建 | ❌ 未串联 |
| **构建 → 通知** | 构建完成后向群聊发送通知 | ❌ 未串联 |
| **全链路日志** | 从消息到构建的完整追踪链 | ❌ 未实现 |

---

## 2. 目标

实现从用户发送消息到代码交付的 **全自动化闭环**：

```
用户在群聊发消息 @main "给首页加个搜索框"
  │
  ▼
Layer 1: 消息接收（channelAdapter）
  │ → 识别用户身份、权限校验
  │ → 消息合并（5 分钟窗口）
  │ → 优先级计算（用户权重 × 紧急度）
  ▼
Layer 2: 任务创建（taskLifecycle）
  │ → 自动创建任务 t_20260316_001
  │ → 检索相关历史任务注入上下文
  │ → 记录上下文快照
  ▼
Layer 3: Agent 协作（agentPipeline）
  │ → main 确认需求
  │ → pm 细化需求（结构化问答）
  │ → coder 编写代码
  │ → reviewer 审查代码
  │ → 修复循环（如需要）
  ▼
Layer 4: 代码变更（codeApplicator）
  │ → 应用文件变更到项目目录
  │ → Git add + commit
  ▼
Layer 5: 版本管理（autoBump）
  │ → 自动递增 patch 版本号
  │ → 创建 Git tag
  │ → 触发构建
  ▼
Layer 6: 构建与交付（buildService）
  │ → 执行 npm run build
  │ → 收集产物
  │ → 生成 AI Changelog
  ▼
Layer 7: 通知（channelAdapter）
  │ → 向群聊发送完成通知
  │ → 包含：任务摘要、变更文件、版本号、产物下载链接
  ▼
Layer 8: 记忆化
  │ → 任务摘要向量化
  │ → 版本摘要向量化
  └── 完成
```

---

## 3. 实现步骤

### Step 1：事件总线

建立模块间通信的事件总线，替代直接函数调用，实现松耦合。

**新建 `server/src/services/eventBus.ts`**：

```typescript
import { EventEmitter } from 'events';

export type SystemEvent =
  | 'message:received'      // 消息接收
  | 'message:routed'        // 消息路由完成
  | 'task:created'          // 任务创建
  | 'task:started'          // 任务开始执行
  | 'task:completed'        // 任务完成
  | 'task:failed'           // 任务失败
  | 'agent:pipeline:start'  // Agent 流水线启动
  | 'agent:pipeline:done'   // Agent 流水线完成
  | 'agent:stage:change'    // Agent 阶段变更
  | 'code:applied'          // 代码变更已应用
  | 'code:committed'        // 代码已提交
  | 'version:bumped'        // 版本号已递增
  | 'build:started'         // 构建开始
  | 'build:completed'       // 构建完成
  | 'build:failed'          // 构建失败
  | 'notification:send';    // 发送通知

export interface EventPayload {
  eventId: string;
  type: SystemEvent;
  timestamp: string;
  traceId: string;       // 全链路追踪 ID（从消息到构建共用同一 traceId）
  data: Record<string, unknown>;
}

class SystemEventBus extends EventEmitter {
  private traceMap: Map<string, EventPayload[]> = new Map();

  emit(event: SystemEvent, payload: EventPayload): boolean {
    // 记录到追踪链
    const trace = this.traceMap.get(payload.traceId) || [];
    trace.push(payload);
    this.traceMap.set(payload.traceId, trace);

    return super.emit(event, payload);
  }

  /**
   * 获取完整追踪链（调试用）
   */
  getTrace(traceId: string): EventPayload[] {
    return this.traceMap.get(traceId) || [];
  }
}

export const eventBus = new SystemEventBus();
```

### Step 2：消息 → 任务 串联

**新建 `server/src/services/messageToTask.ts`**：

```typescript
import { eventBus } from './eventBus.js';

/**
 * 监听 message:routed 事件，自动创建任务
 */
eventBus.on('message:routed', async (payload) => {
  const { userId, content, mentionedAgent, priority, traceId } = payload.data;

  // 1. 创建任务
  const task = taskLifecycle.createTask({
    title: extractTitle(content as string),  // 从消息内容提取标题
    description: content as string,
    priority: mapPriority(priority as number),
    sessionId: traceId,
    createdBy: userId as string,
    tags: ['auto-created', `from-${mentionedAgent}`],
  });

  // 2. 注入历史上下文
  const context = await taskMemory.enrichTaskContext(task);
  if (context) {
    task.description += `\n\n---\n### 相关历史任务\n${context}`;
  }

  // 3. 发射 task:created 事件
  eventBus.emit('task:created', {
    eventId: generateId('evt'),
    type: 'task:created',
    timestamp: new Date().toISOString(),
    traceId,
    data: { taskId: task.taskId, title: task.title },
  });
});
```

### Step 3：任务 → Agent 串联

**新建 `server/src/services/taskToAgent.ts`**：

```typescript
import { eventBus } from './eventBus.js';
import { agentPipeline } from './agentPipeline.js';

/**
 * 监听 task:created 事件，自动触发 Agent 流水线
 */
eventBus.on('task:created', async (payload) => {
  const { taskId, title } = payload.data;
  const traceId = payload.traceId;

  // 更新任务状态
  taskLifecycle.updateStatus(taskId as string, 'running');

  eventBus.emit('agent:pipeline:start', {
    eventId: generateId('evt'),
    type: 'agent:pipeline:start',
    timestamp: new Date().toISOString(),
    traceId,
    data: { taskId },
  });

  try {
    // 执行 Agent 协作流水线
    const result = await agentPipeline.execute(taskId as string, title as string);

    eventBus.emit('agent:pipeline:done', {
      eventId: generateId('evt'),
      type: 'agent:pipeline:done',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId, result },
    });
  } catch (err) {
    eventBus.emit('task:failed', {
      eventId: generateId('evt'),
      type: 'task:failed',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId, error: (err as Error).message },
    });
  }
});
```

### Step 4：Agent → 代码 → 版本 串联

**新建 `server/src/services/agentToVersion.ts`**：

```typescript
import { eventBus } from './eventBus.js';

/**
 * Agent 流水线完成后，应用代码变更并触发版本管理
 */
eventBus.on('agent:pipeline:done', async (payload) => {
  const { taskId, result } = payload.data;
  const traceId = payload.traceId;

  // 1. 解析代码变更
  const changes = codeApplicator.parseChanges(result as string);

  // 2. 应用到项目目录
  const applyResult = await codeApplicator.applyChanges(projectPath, changes);

  eventBus.emit('code:applied', {
    eventId: generateId('evt'),
    type: 'code:applied',
    timestamp: new Date().toISOString(),
    traceId,
    data: { taskId, filesApplied: applyResult.applied.length },
  });

  // 3. Git commit
  const commitHash = await codeApplicator.commitChanges(
    projectPath,
    `feat: ${taskLifecycle.getTask(taskId as string)?.title}`
  );

  eventBus.emit('code:committed', {
    eventId: generateId('evt'),
    type: 'code:committed',
    timestamp: new Date().toISOString(),
    traceId,
    data: { taskId, commitHash },
  });

  // 4. 自动版本 bump
  const newVersion = await autoBump.bump(projectPath, 'patch');

  eventBus.emit('version:bumped', {
    eventId: generateId('evt'),
    type: 'version:bumped',
    timestamp: new Date().toISOString(),
    traceId,
    data: { taskId, version: newVersion },
  });
});
```

### Step 5：版本 → 构建 → 通知 串联

**新建 `server/src/services/versionToBuild.ts`**：

```typescript
import { eventBus } from './eventBus.js';

/**
 * 版本 bump 后自动触发构建
 */
eventBus.on('version:bumped', async (payload) => {
  const { taskId, version } = payload.data;
  const traceId = payload.traceId;

  eventBus.emit('build:started', {
    eventId: generateId('evt'),
    type: 'build:started',
    timestamp: new Date().toISOString(),
    traceId,
    data: { taskId, version },
  });

  try {
    const buildResult = await buildService.buildWithStream(projectPath);

    // 生成 AI Changelog
    const changelog = await changelogGenerator.generateAIChangelog(
      recentCommits, previousVersion, version as string
    );

    eventBus.emit('build:completed', {
      eventId: generateId('evt'),
      type: 'build:completed',
      timestamp: new Date().toISOString(),
      traceId,
      data: {
        taskId,
        version,
        success: buildResult.success,
        artifacts: buildResult.artifacts.length,
        changelog,
      },
    });
  } catch (err) {
    eventBus.emit('build:failed', {
      eventId: generateId('evt'),
      type: 'build:failed',
      timestamp: new Date().toISOString(),
      traceId,
      data: { taskId, version, error: (err as Error).message },
    });
  }
});

/**
 * 构建完成后发送通知到群聊
 */
eventBus.on('build:completed', async (payload) => {
  const { taskId, version, changelog } = payload.data;
  const traceId = payload.traceId;

  // 1. 获取消息来源通道（从 trace 中查找原始消息）
  const trace = eventBus.getTrace(traceId);
  const originalMessage = trace.find(t => t.type === 'message:received');
  const channel = originalMessage?.data.channel as string || 'web';
  const groupId = originalMessage?.data.groupId as string;

  // 2. 构建通知内容
  const notification = `✅ 任务完成！
📋 任务：${taskId}
🏷️ 版本：${version}
📝 变更：
${changelog}
📦 产物下载：/api/v1/versions/${version}/artifacts/download`;

  // 3. 发送到原始通道
  if (groupId) {
    await channelAdapter.send(channel, groupId, notification);
  }

  // 4. 任务记忆化
  const task = taskLifecycle.getTask(taskId as string);
  if (task) {
    taskLifecycle.updateStatus(taskId as string, 'done');
    await taskMemory.onTaskCompleted(task);
  }
});
```

### Step 6：全链路追踪 API

**新建 `server/src/routes/trace.ts`**：

```typescript
import { Router } from 'express';
import { eventBus } from '../services/eventBus.js';
import { success, error } from '../utils/response.js';

const router = Router();

// 获取全链路追踪
router.get('/:traceId', (req, res) => {
  const trace = eventBus.getTrace(req.params.traceId);
  if (trace.length === 0) {
    return res.status(404).json(error(404, 'Trace not found'));
  }
  res.json(success({
    traceId: req.params.traceId,
    events: trace,
    duration: calculateDuration(trace),
    status: getTraceStatus(trace),
  }));
});

// SSE：实时追踪事件流
router.get('/:traceId/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const traceId = req.params.traceId;

  const onEvent = (payload: EventPayload) => {
    if (payload.traceId === traceId) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  };

  // 监听所有事件类型
  const eventTypes: SystemEvent[] = [
    'task:created', 'task:started', 'task:completed', 'task:failed',
    'agent:pipeline:start', 'agent:pipeline:done', 'agent:stage:change',
    'code:applied', 'code:committed',
    'version:bumped', 'build:started', 'build:completed', 'build:failed',
  ];
  eventTypes.forEach(type => eventBus.on(type, onEvent));

  req.on('close', () => {
    eventTypes.forEach(type => eventBus.off(type, onEvent));
  });
});

export default router;
```

### Step 7：前端全链路监控面板

**修改 `app/monitor/page.tsx`**：

增加全链路追踪视图：

```
┌─────────────────────────────────────────────────────────┐
│  全链路追踪 - trace_20260316_001                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ 消息接收 ──→ ✅ 任务创建 ──→ ✅ Agent 流水线       │
│  10:00:01        10:00:02         10:00:03 ~ 10:05:00  │
│                                                         │
│  ✅ 代码应用 ──→ ✅ 版本 bump ──→ ✅ 构建完成          │
│  10:05:01        10:05:02         10:05:30              │
│                                                         │
│  ✅ 通知发送 ──→ ✅ 记忆化完成                          │
│  10:05:31        10:05:32                               │
│                                                         │
│  总耗时：5 分 31 秒                                      │
│  Token 消耗：12,500                                      │
│  变更文件：3 个                                          │
│  版本：v1.2.1 → v1.2.2                                  │
│                                                         │
│  [查看详细事件] [查看任务详情] [查看版本详情]              │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 涉及文件

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `server/src/services/eventBus.ts` | 系统事件总线 |
| 新建 | `server/src/services/messageToTask.ts` | 消息→任务串联 |
| 新建 | `server/src/services/taskToAgent.ts` | 任务→Agent串联 |
| 新建 | `server/src/services/agentToVersion.ts` | Agent→代码→版本串联 |
| 新建 | `server/src/services/versionToBuild.ts` | 版本→构建→通知串联 |
| 新建 | `server/src/routes/trace.ts` | 全链路追踪 API |
| 修改 | `server/src/index.ts` | 注册 trace 路由 + 初始化事件监听 |
| 修改 | `app/monitor/page.tsx` | 全链路追踪监控面板 |
| 修改 | `app/tasks/[id]/page.tsx` | 任务详情页增加追踪链接 |

---

## 5. API 新增

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/traces/:traceId` | 获取全链路追踪详情 |
| `GET` | `/api/v1/traces/:traceId/stream` | SSE 实时追踪事件流 |
| `GET` | `/api/v1/traces/recent?limit=20` | 获取最近的追踪列表 |

---

## 6. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 从飞书/微信发送 @main 消息后，系统自动创建任务 | API 查询任务列表 |
| 2 | 任务创建后自动触发 Agent 协作流水线 | 日志追踪 |
| 3 | Agent 执行完成后代码变更自动应用到项目目录 | 文件系统检查 |
| 4 | 代码提交后自动 bump patch 版本号 | `git tag` 检查 |
| 5 | 版本 bump 后自动触发构建 | 构建日志检查 |
| 6 | 构建完成后自动向原始群聊发送通知 | 群聊消息检查 |
| 7 | 全链路追踪 API 返回完整事件链 | curl 验证 |
| 8 | SSE 追踪流实时推送事件更新 | EventSource 测试 |
| 9 | 前端监控面板展示追踪时间线 | 浏览器截图 |
| 10 | 全流程从消息到通知的端到端耗时 < 10 分钟（简单任务） | 计时测量 |
| 11 | 任务失败时向群聊发送错误通知 | 模拟失败场景 |
| 12 | 事件总线不丢失事件，追踪链完整 | 对比事件数量 |
