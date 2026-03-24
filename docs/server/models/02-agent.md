# Agent 编排模型

> 来源文件：`server/src/models/agent.ts`, `server/src/constants/agents.ts`

## Agent 运行时状态

```typescript
export type AgentStatus = 'idle' | 'busy' | 'error' | 'offline';

export interface AgentRuntime {
  name: string; // Agent 名称
  status: AgentStatus; // 当前状态
  currentTask: string | null; // 当前执行的任务 ID
  currentTaskStartedAt: string | null; // 任务开始时间
  lastHeartbeat: string | null; // 最后心跳时间
  loadScore: number; // 负载评分 0-100
}
```

### AgentStatus 说明

| 状态      | 说明               |
| --------- | ------------------ |
| `idle`    | 空闲，可接受新任务 |
| `busy`    | 忙碌，正在执行任务 |
| `error`   | 异常，需要人工介入 |
| `offline` | 离线，不可用       |

## AgentDetail 模型

Agent 完整信息（配置 + 运行时）。

```typescript
import { AgentLevel, AgentRole } from '../constants/agents.js';

export interface AgentDetail extends Record<string, unknown> {
  // 静态配置
  name: string;
  role: AgentRole;
  level: AgentLevel;
  description: string;
  inGroup: boolean; // 是否暴露在群聊中
  defaultModel: string; // 默认模型
  capabilities: string[]; // 能力列表
  workspace: string; // 工作空间路径

  // 运行时状态
  status: AgentStatus;
  currentTask: string | null;
  currentTaskStartedAt: string | null;
  lastHeartbeat: string | null;
  loadScore: number;
}
```

## Agent 团队配置

```typescript
export type AgentLevel = 1 | 2 | 3;

export type AgentRole = '主管' | '产品经理' | '代码审查' | '程序员1号' | '程序员2号';

export interface AgentConfig {
  name: string;
  role: AgentRole;
  level: AgentLevel;
  description: string;
  inGroup: boolean;
  defaultModel: string;
  capabilities: string[];
  workspace: string;
  sessionKey: string;
}
```

### 等级体系

| 等级 | 标签         | 角色                 |
| ---- | ------------ | -------------------- |
| 1    | Lv1 - 执行层 | 程序员1号, 程序员2号 |
| 2    | Lv2 - 策划层 | 产品经理, 代码审查   |
| 3    | Lv3 - 决策层 | 主管                 |

### AGENT_TEAM 团队成员

| 名称       | 角色      | 等级 | 群聊可见 | 主要能力                           |
| ---------- | --------- | ---- | -------- | ---------------------------------- |
| `main`     | 主管      | Lv3  | ✅       | 任务分配、质量把控、需求确认       |
| `pm`       | 产品经理  | Lv2  | ✅       | 需求细化、结构化问答、需求文档生成 |
| `reviewer` | 代码审查  | Lv2  | ❌       | 代码审查、问题发现、修复建议       |
| `coder1`   | 程序员1号 | Lv1  | ❌       | 代码编写、文件操作、Git操作        |
| `coder2`   | 程序员2号 | Lv1  | ❌       | 代码编写、文件操作、Git操作        |

## 任务指派模型

```typescript
// 任务指派请求
export interface DispatchRequest {
  fromAgent: string; // 指派人
  toAgent: string; // 被指派人
  taskId: string; // 任务 ID
  taskTitle: string; // 任务标题
  priority: 'low' | 'normal' | 'high' | 'urgent';
  deadline?: string; // 截止时间（ISO 8601）
  dependencies?: string[]; // 依赖的任务 ID 列表
  description?: string; // 任务描述
}

// 任务指派响应
export interface DispatchResponse {
  success: boolean;
  message: string;
  taskId?: string;
  rejected?: boolean;
  reason?: string;
}
```

## 指派矩阵

```typescript
// DISPATCH_MATRIX 定义了指派权限
export const DISPATCH_MATRIX: Record<string, string[]> = {
  main: ['pm', 'reviewer', 'coder1', 'coder2'], // 主管可指派所有人
  pm: ['coder1', 'coder2'], // 产品经理可指派程序员
  reviewer: ['coder1', 'coder2'], // 审查可指派程序员
};
```

### 指派规则

1. **等级优先**：高级 Agent 可指派低级 Agent
2. **反向禁止**：低级 Agent 不能指派高级 Agent
3. **矩阵约束**：必须在 DISPATCH_MATRIX 中声明权限

## 团队概览

```typescript
export interface TeamOverview {
  levels: {
    level: AgentLevel;
    label: string;
    agents: AgentDetail[];
  }[];
  dispatchMatrix: Record<string, string[]>; // 指派矩阵
}
```

## 辅助函数

```typescript
// 检查是否可以指派
function canDispatch(from: string, to: string): boolean;

// 检查是否为反向指派
function isReverseDispatch(from: string, to: string): boolean;

// 根据名称获取 Agent
function getAgentByName(name: string): AgentConfig | undefined;

// 获取指定等级的所有 Agent
function getAgentsByLevel(level: AgentLevel): AgentConfig[];

// 获取下级 Agent
function getSubordinates(name: string): AgentConfig[];

// 获取团队概览
function getTeamOverview(): { level: AgentLevel; agents: AgentConfig[] }[];

// 获取可用 Agent
function getAvailableAgents(level?: AgentLevel): AgentConfig[];
```
