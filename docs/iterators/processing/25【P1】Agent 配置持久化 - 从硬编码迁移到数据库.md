# 25【P1】Agent 配置持久化 - 从硬编码迁移到数据库

## 背景

当前 Agent 团队定义硬编码在 `server/src/constants/agents.ts` 的 `AGENT_TEAM` 常量数组中：

```typescript
export const AGENT_TEAM: AgentConfig[] = [
  { name: "main", role: "主管", level: 3, defaultModel: "claude-sonnet-3.5", ... },
  { name: "pm", role: "产品经理", level: 2, defaultModel: "claude-sonnet-3.5", ... },
  // ...
];
```

`updateAgentConfig()` 只修改内存中的数组，服务重启后配置丢失。用户无法通过 UI 动态增删 Agent 或持久化修改 Agent 配置。

## 目标

将 Agent 配置从硬编码常量迁移到数据库持久化，支持：

1. 动态增删改 Agent 配置
2. 配置变更即时生效且重启不丢失
3. 保留 `AGENT_TEAM` 作为默认初始数据（首次启动时 seed）

## 数据模型

```typescript
// 复用现有 AgentConfig，增加持久化字段
export interface AgentConfigPersisted extends AgentConfig {
  id: string;                    // 主键
  status: 'active' | 'disabled'; // 可禁用 Agent
  createdAt: string;
  updatedAt: string;
}
```

## 改造要点

### 1. 数据库表

```sql
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  level INTEGER NOT NULL CHECK(level IN (1, 2, 3)),
  description TEXT,
  in_group BOOLEAN DEFAULT false,
  default_model TEXT,
  capabilities TEXT, -- JSON array
  workspace TEXT,
  session_key TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### 2. 启动时 Seed

```typescript
// 服务启动时：如果 agents 表为空，从 AGENT_TEAM 常量 seed 初始数据
async function seedDefaultAgents() {
  const count = await db.count('agents');
  if (count === 0) {
    for (const agent of AGENT_TEAM) {
      await db.insert('agents', { ...agent, status: 'active' });
    }
  }
}
```

### 3. 改造 agentService

- `getAgent()` / `getAgentByName()` — 从数据库查询替代常量查找
- `updateAgentConfig()` — 写入数据库
- 新增 `createAgent()` / `deleteAgent()` / `listAgents()`
- `DISPATCH_MATRIX` 也需持久化或改为基于 `level` 动态计算

### 4. 缓存策略

- 内存缓存 Agent 列表，TTL 30 秒或变更时失效
- 避免每次 LLM 调用都查数据库

## API 接口扩展

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/agents` | 创建新 Agent |
| PUT | `/api/v1/agents/:name` | 更新 Agent 完整配置 |
| DELETE | `/api/v1/agents/:name` | 删除 Agent（需检查是否有进行中任务） |
| PUT | `/api/v1/agents/:name/status` | 启用/禁用 Agent |

## 修改文件

- `server/src/db/migrations/` — 新增 agents 表迁移
- `server/src/services/agentService.ts` — 改为数据库操作
- `server/src/constants/agents.ts` — 保留为 seed 数据源
- `server/src/routes/agent.ts` — 扩展 CRUD 路由

## 依赖关系

- 无前置依赖，可与任务 20-24 并行
- 任务 21（Agent-Token 绑定）中 agentName 引用需与此处一致
