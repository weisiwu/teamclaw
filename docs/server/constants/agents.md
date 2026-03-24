# agents.ts — Agent 团队编排常量

**文件路径**: `server/src/constants/agents.ts`

---

## 职责

定义系统中所有 Agent 的角色、能力、层级关系和派发权限矩阵。是 Agent 执行引擎（`agentExecution.ts`）和任务派发的核心依据。

---

## Agent 等级定义

| 等级 | 标签           | 说明                    |
| ---- | -------------- | ----------------------- |
| Lv1  | `Lv1 - 执行层` | 程序员，接受任务执行    |
| Lv2  | `Lv2 - 策划层` | PM / 审查者，策划与评审 |
| Lv3  | `Lv3 - 决策层` | 主管，全局协调          |

---

## Agent 团队成员

| Agent      | 角色      | 等级 | 群聊可见 | 默认模型            | 工作空间                      |
| ---------- | --------- | ---- | -------- | ------------------- | ----------------------------- |
| `main`     | 主管      | Lv3  | ✅       | `claude-sonnet-3.5` | `~/.openclaw/agents/main`     |
| `pm`       | 产品经理  | Lv2  | ✅       | `claude-sonnet-3.5` | `~/.openclaw/agents/pm`       |
| `reviewer` | 代码审查  | Lv2  | ❌       | `claude-sonnet-3.5` | `~/.openclaw/agents/reviewer` |
| `coder1`   | 程序员1号 | Lv1  | ❌       | `claude-sonnet-3.5` | `~/.openclaw/agents/coder1`   |
| `coder2`   | 程序员2号 | Lv1  | ❌       | `claude-sonnet-3.5` | `~/.openclaw/agents/coder2`   |

---

## 派发权限矩阵（DISPATCH_MATRIX）

定义谁可以指派谁（Agent → Agent 层面）：

```
main     → pm, reviewer, coder1, coder2
pm       → coder1, coder2
reviewer → coder1, coder2
coder1/2 → （无）
```

---

## 核心函数

### `canDispatch(from, to)`

判断 `from` Agent 是否有权指派任务给 `to` Agent。

```typescript
function canDispatch(from: string, to: string): boolean;
```

---

### `isReverseDispatch(from, to)`

判断是否为反向指派（低级 Agent 试图指派高级 Agent）。

```typescript
function isReverseDispatch(from: string, to: string): boolean;
```

---

### `getAgentByName(name)`

按名称获取 Agent 配置。

```typescript
function getAgentByName(name: string): AgentConfig | undefined;
```

---

### `getAgentsByLevel(level)`

获取指定等级的所有 Agent。

```typescript
function getAgentsByLevel(level: AgentLevel): AgentConfig[];
```

---

### `getSubordinates(name)`

获取指定 Agent 的所有下级。

```typescript
function getSubordinates(name: string): AgentConfig[];
```

---

### `getTeamOverview()`

获取团队全貌（按等级分组）。

```typescript
function getTeamOverview(): { level: AgentLevel; agents: AgentConfig[] }[];
```

---

### `getSharedResources()`

获取 Agent 间共享资源的路径（skills / workspace / memory）。

```typescript
function getSharedResources(): { skills: string; workspace: string; memory: string };
```

---

## 变更记录

| 日期       | 变更内容                                         |
| ---------- | ------------------------------------------------ |
| 2026-03-24 | 初始文档编写：Agent 团队定义、派发矩阵、辅助函数 |
