# 33【P1】Agent-Tool 绑定与权限控制

## 背景

不同 Agent 应具备不同的 Tool 使用权限。例如：
- **coder1/coder2** 可以使用文件读写、Git 操作、Shell 执行
- **pm** 只能使用文档查阅相关 Tool，不能执行 Shell 命令
- **reviewer** 可以读文件但不能写
- **main（主管）** 可以调度但自身不执行任何 Tool

同时，高风险 Tool（如 shell_exec）需要人工审批机制。

## 目标

实现 Agent 与 Tool 的绑定关系 + 执行权限控制。

## 数据模型

```typescript
// server/src/models/agentToolBinding.ts

export interface AgentToolBinding {
  id: string;
  agentName: string;           // Agent 名称
  toolId: string;              // Tool ID
  enabled: boolean;            // 该 Agent 是否可使用此 Tool
  requiresApproval: boolean;   // 是否覆盖 Tool 默认审批设置
  createdAt: string;
  updatedAt: string;
}
```

### 默认绑定策略

未显式绑定时的默认行为：

| 策略 | 说明 |
|------|------|
| `allow_all` | 所有 Agent 可用所有已启用 Tool（默认） |
| `deny_all` | 所有 Agent 默认无权，需显式绑定 |
| `by_level` | 按 Agent 等级自动分配（Lv3 全部、Lv2 中低风险、Lv1 低风险） |

策略可在系统配置中设置。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/agents/:name/tools` | 获取 Agent 可用的 Tool 列表 |
| PUT | `/api/v1/agents/:name/tools` | 批量设置 Agent 的 Tool 权限 |
| GET | `/api/v1/tools/:id/agents` | 获取 Tool 被哪些 Agent 使用 |
| GET | `/api/v1/agent-tool-matrix` | 全局绑定矩阵（Agent × Tool） |

## 执行时权限校验

Agent 执行任务调用 Tool 时，执行链路中增加权限检查：

```typescript
async function executeToolCall(agentName: string, toolName: string, params: Record<string, unknown>) {
  // 1. Tool 是否全局启用
  const tool = toolService.getByName(toolName);
  if (!tool || !tool.enabled) throw new Error(`Tool ${toolName} 未启用`);

  // 2. Agent 是否有权使用
  const canUse = await agentToolBindingService.canUse(agentName, tool.id);
  if (!canUse) throw new Error(`Agent ${agentName} 无权使用 ${toolName}`);

  // 3. 是否需要人工审批
  const needsApproval = await agentToolBindingService.needsApproval(agentName, tool.id);
  if (needsApproval) {
    return { status: 'pending_approval', toolName, params };
  }

  // 4. 执行
  return toolExecutor.execute(tool, params);
}
```

## 前端 UI

在 Agent 详情面板新增 "工具权限" Tab（与任务 24 的 "Token 配置" Tab 并列）：

- 显示该 Agent 可用的所有 Tool
- 开关控制每个 Tool 的启用/禁用
- 审批开关覆盖

## 实现文件

- `server/src/models/agentToolBinding.ts` — 绑定数据模型
- `server/src/services/agentToolBindingService.ts` — 绑定 CRUD + 权限查询
- `server/src/routes/agentToolBinding.ts` — 路由
- Agent 详情面板添加 "工具权限" Tab

## 依赖关系

- 依赖任务 29（Tool 数据模型）和任务 30（Tool API）
- 可与任务 31（前端页面重构）并行开发
