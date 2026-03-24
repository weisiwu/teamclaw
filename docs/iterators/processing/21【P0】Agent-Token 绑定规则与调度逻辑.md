# 21【P0】Agent-Token 绑定规则与调度逻辑

## 背景

当前 Agent 的 `defaultModel` 字段（如 `claude-sonnet-3.5`）是硬编码在 `server/src/constants/agents.ts` 的 `AGENT_TEAM` 数组中，所有 Agent 共享环境变量中唯一的 API Key。无法实现：

- 不同 Agent 使用不同的 API Token
- 同一 Agent 按优先级使用多个 Token（主/备）
- 按任务类型或模型层级选择不同 Token

## 目标

设计 Agent 与 API Token 的绑定规则，实现灵活的 Token 调度策略。

## 数据模型设计

```typescript
// server/src/models/agentTokenBinding.ts

export interface AgentTokenBinding {
  id: string;                    // 绑定 ID
  agentName: string;             // Agent 名称（如 'main', 'coder1'）
  tokenId: string;               // 关联的 ApiToken ID
  priority: number;              // 优先级（1 最高），同 Agent 多个 Token 按优先级排序
  modelFilter?: string[];        // 限定该绑定适用的模型，为空则适用该 Token 的所有模型
  tierFilter?: ('light' | 'medium' | 'strong')[]; // 限定适用的模型层级
  enabled: boolean;              // 是否启用
  createdAt: string;
  updatedAt: string;
}
```

### 绑定示例

| Agent | Token | 优先级 | 层级限定 | 说明 |
|-------|-------|--------|----------|------|
| main | 公司 Anthropic 主账号 | 1 | strong | 主管用强模型 |
| main | 公司 OpenAI 备用 | 2 | medium | 主管降级备用 |
| coder1 | 个人 DeepSeek 账号 | 1 | light | 程序员用轻量模型 |
| coder1 | 公司 OpenAI 主账号 | 2 | medium, strong | 复杂任务升级 |

## 调度逻辑

```
Agent 发起 LLM 调用(agentName, tier)
  → 查询该 Agent 的所有绑定（enabled=true），按 priority 排序
  → 筛选 tierFilter 匹配的绑定
  → 遍历匹配的绑定：
    → 检查 Token 状态（active 且未超预算）
    → 解密 API Key
    → 调用对应 provider 的 LLM 接口
    → 成功 → 记录用量，返回结果
    → 失败（429/5xx）→ 尝试下一个绑定
  → 全部失败 → 回退到全局环境变量 Key（兼容现有逻辑）
```

## API 接口设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/agents/:name/token-bindings` | 获取 Agent 的 Token 绑定列表 |
| POST | `/api/v1/admin/agents/:name/token-bindings` | 为 Agent 添加 Token 绑定 |
| PUT | `/api/v1/admin/agent-token-bindings/:id` | 更新绑定规则 |
| DELETE | `/api/v1/admin/agent-token-bindings/:id` | 删除绑定 |
| GET | `/api/v1/admin/token-bindings/overview` | 全局绑定概览（矩阵视图数据） |

### 请求示例

```json
POST /api/v1/admin/agents/main/token-bindings
{
  "tokenId": "tok_abc123",
  "priority": 1,
  "tierFilter": ["strong"],
  "modelFilter": ["claude-sonnet-4-20250514"],
  "enabled": true
}
```

## 实现文件

- `server/src/models/agentTokenBinding.ts` — 绑定数据模型
- `server/src/services/agentTokenBindingService.ts` — 绑定 CRUD + 调度查询
- `server/src/services/tokenResolver.ts` — Token 调度器（按规则解析 Agent 应使用的 Token）
- `server/src/routes/agentTokenBinding.ts` — Express 路由

## 依赖关系

- 依赖任务 20（API Token 数据模型）
- 后续任务 22（LLM 服务改造）依赖此任务
