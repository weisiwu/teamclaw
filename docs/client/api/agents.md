# Agent API

> `lib/api/agents.ts` + `lib/api/agentExecution.ts`

---

## 功能说明

Agent API 封装了 Agent 管理和执行相关的 API 调用，包括 Agent 列表、详情、状态、能力配置，以及任务派发。

---

## Agent 管理 (`agents.ts`)

### fetchAgents

获取 Agent 列表。

```typescript
async function fetchAgents(params?: {
  status?: 'idle' | 'busy' | 'offline';
}): Promise<Agent[]>
```

### fetchAgentById

获取 Agent 详情。

```typescript
async function fetchAgentById(id: string): Promise<Agent>
```

### fetchAgentStatus

获取 Agent 实时状态。

```typescript
async function fetchAgentStatus(id: string): Promise<AgentStatus>
```

### updateAgentCapabilities

更新 Agent 能力配置。

```typescript
async function updateAgentCapabilities(
  id: string,
  capabilities: string[]
): Promise<Agent>
```

---

## Agent 执行 (`agentExecution.ts`)

### dispatchToAgent

派发任务到 Agent。

```typescript
async function dispatchToAgent(data: {
  targetAgent: string;
  prompt: string;
  taskId?: string;
  context?: Record<string, any>;
}): Promise<ExecutionContext>
```

### getExecutionStatus

获取执行状态。

```typescript
async function getExecutionStatus(executionId: string): Promise<ExecutionContext>
```

### abortExecution

中止执行。

```typescript
async function abortExecution(executionId: string): Promise<boolean>
```

### getAgentExecutionStats

获取 Agent 执行统计。

```typescript
async function getAgentExecutionStats(agentId?: string): Promise<ExecutionStats>
```

---

## 类型定义

```typescript
interface Agent {
  id: string;
  name: string;
  description?: string;
  status: 'idle' | 'busy' | 'offline';
  capabilities: string[];
  loadScore: number;           // 0-100
  currentTaskId?: string;
  currentTaskName?: string;
  config: {
    maxConcurrentTasks: number;
    timeout: number;
    retryAttempts: number;
  };
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentStatus {
  agentId: string;
  status: 'idle' | 'busy' | 'offline';
  loadScore: number;
  currentTask?: {
    id: string;
    name: string;
    startedAt: string;
    progress?: number;
  };
  queueLength: number;
  uptime: number;              // 秒
  memoryUsage?: number;        // MB
}

interface ExecutionContext {
  executionId: string;
  taskId: string;
  targetAgent: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: string;
  error?: string;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
}

interface ExecutionStats {
  agentId: string;
  period: {
    start: string;
    end: string;
  };
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;     // 秒
  totalCost: number;
  tokensUsed: {
    input: number;
    output: number;
  };
}
```

---

## 能力类型

| 能力标识 | 说明 |
|---|---|
| `code_review` | 代码审查 |
| `auto_build` | 自动构建 |
| `deploy` | 部署执行 |
| `doc_generate` | 文档生成 |
| `test_run` | 测试执行 |
| `security_scan` | 安全扫描 |

---

## React Query 使用示例

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAgents, fetchAgentStatus, dispatchToAgent } from '@/lib/api/agents';

// Agent 列表
const { data: agents } = useQuery({
  queryKey: ['agents'],
  queryFn: () => fetchAgents(),
  refetchInterval: 30000,  // 每 30 秒刷新
});

// Agent 实时状态
const { data: status } = useQuery({
  queryKey: ['agents', agentId, 'status'],
  queryFn: () => fetchAgentStatus(agentId),
  enabled: !!agentId,
  refetchInterval: 5000,  // 每 5 秒刷新
});

// 派发任务
const dispatchMutation = useMutation({
  mutationFn: dispatchToAgent,
  onSuccess: (execution) => {
    // 轮询执行状态
    startExecutionPolling(execution.executionId);
  },
});

dispatchMutation.mutate({
  targetAgent: 'agent-1',
  prompt: '请帮我审查这段代码',
  taskId: 'task-123',
});

// 轮询执行状态
async function startExecutionPolling(executionId: string) {
  const status = await getExecutionStatus(executionId);
  if (status.status === 'completed') {
    console.log('执行完成:', status.result);
  } else if (status.status === 'failed') {
    console.error('执行失败:', status.error);
  } else {
    setTimeout(() => startExecutionPolling(executionId), 2000);
  }
}
```

---

## 相关文件

- `lib/api/agents.ts` — Agent 管理
- `lib/api/agentExecution.ts` — Agent 执行
- `app/api/v1/agents/` — Next.js API Routes
- `server/src/routes/agent.ts` — 后端路由
- `server/src/services/agentExecution.ts` — Agent 执行服务
