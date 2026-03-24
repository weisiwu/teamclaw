# 06【P2】ID 生成方式不安全（Math.random 替换）

> 优先级：🟡 P2（代码质量）
> 发现日期：2026-03-25
> 状态：待处理

---

## 问题描述

**30+ 个服务文件** 使用 `Math.random().toString(36).slice(2, N)` 生成业务 ID（任务 ID、消息 ID、执行 ID 等）。`Math.random()` 不保证唯一性，在高并发或多进程场景下可能产生碰撞。

### 受影响的 ID 生成模式

```typescript
// 典型模式（遍布 30+ 文件）
const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
```

### 受影响文件（部分列表）

| 文件 | 生成的 ID 类型 |
|------|---------------|
| `taskLifecycle.ts` | `task_xxx` |
| `messageQueue.ts` | `msg_xxx` |
| `agentExecution.ts` | `exec_xxx` |
| `importOrchestrator.ts` | `task_xxx` |
| `cronService.ts` | `cron_xxx`, `run_xxx` |
| `eventBus.ts` | `evt_xxx` |
| `taskMemory.ts` | `msg_xxx`, `cp_xxx` |
| `taskScheduler.ts` | `sched_xxx` |
| `taskNotification.ts` | `wh_xxx`, `rule_xxx`, `evt_xxx` |
| `taskCancel.ts` | `cancel_xxx` |
| `downloadManager.ts` | `dl_xxx` |
| `webhookService.ts` | 各类 ID |
| `auditService.ts` | 审计 ID |
| `branchService.ts` | `branch_xxx` |
| `tagService.ts` | `tag_xxx` |
| `autoBump.ts` | `bh_xxx`, `v_xxx` |
| `roleMemory.ts` | 通用 ID |
| `changeTracker.ts` | `evt_xxx` |
| `docFavorite.ts` | `fav_xxx` |
| `searchEnhancer.ts` | `hist_xxx` |
| `tokenStatsService.ts` | `tu_xxx` |
| `userService.ts` | `u_xxx` |
| `pmProtocol.ts` | `pm_session_xxx` |

## 风险

- **ID 碰撞**：`Math.random()` 非加密安全随机数，在高频调用时可能重复
- **可预测**：`Date.now()` + 短随机串容易被猜测
- 数据写入 DB 后若 ID 碰撞会导致主键冲突或数据覆盖

## 优化方案

### 方案 A：使用 `crypto.randomUUID()`（推荐）

Node.js 内置，无需额外依赖：

```typescript
import { randomUUID } from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}
```

### 方案 B：使用 `nanoid`

更短的 ID，自定义字母表：

```typescript
import { nanoid } from 'nanoid';
const id = `task_${nanoid(12)}`;
```

### 实施步骤

1. 在 `server/src/utils/` 下创建统一的 `generateId.ts`
2. 导出 `generateId(prefix: string): string` 函数
3. 全局替换所有 `Math.random().toString(36)` 调用为统一函数
4. 对已有 DB 数据无影响（新旧 ID 格式兼容）

## 验收标准

- [ ] 全项目无 `Math.random()` 用于 ID 生成
- [ ] 统一使用 `generateId()` 工具函数
- [ ] ID 碰撞概率降至可忽略级别
