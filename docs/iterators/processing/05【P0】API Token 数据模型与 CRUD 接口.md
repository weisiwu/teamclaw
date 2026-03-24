# 05【P0】API Token 数据模型与 CRUD 接口

## 背景

当前系统的 LLM API Key 全部通过环境变量（`.env`）硬编码，每个 provider 只有一个全局 key：

```
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

用户无法在平台 UI 中录入、管理多个 API Token，也无法为不同 Agent 分配不同的 Token。

## 目标

设计并实现 API Token 的数据模型和后端 CRUD 接口，支持：

1. 录入多个不同 provider 的 API Token
2. 为每个 Token 设置别名、状态、用量限额
3. Token 密钥加密存储，API 返回时脱敏

## 数据模型设计

```typescript
export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'custom';

export interface ApiToken {
  id: string;
  alias: string;
  provider: LLMProvider;
  apiKey: string;                // 加密存储，返回时脱敏
  baseUrl?: string;
  models: string[];
  status: 'active' | 'disabled' | 'expired';
  monthlyBudgetUsd?: number;
  currentMonthUsageUsd: number;
  totalUsageUsd: number;
  callCount: number;
  lastUsedAt?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  note?: string;
}
```

## API 接口设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/api-tokens` | 获取所有 Token 列表（key 脱敏） |
| GET | `/api/v1/admin/api-tokens/:id` | 获取单个 Token 详情 |
| POST | `/api/v1/admin/api-tokens` | 创建新 Token |
| PUT | `/api/v1/admin/api-tokens/:id` | 更新 Token 配置 |
| DELETE | `/api/v1/admin/api-tokens/:id` | 删除 Token |
| POST | `/api/v1/admin/api-tokens/:id/verify` | 验证 Token 有效性 |

## 安全要求

1. API Key **加密存储**（AES-256），不以明文存储在数据库
2. 加密密钥通过环境变量 `TOKEN_ENCRYPTION_KEY` 提供
3. API 返回时 Key 脱敏：只显示前 3 位和后 3 位
4. 所有接口需 `requireAdmin` 中间件保护
5. 创建/删除操作记录到审计日志

## 实现文件

- `server/src/models/apiToken.ts` — 数据模型定义
- `server/src/services/apiTokenService.ts` — CRUD 业务逻辑 + 加密/脱敏
- `server/src/routes/apiToken.ts` — Express 路由
- `server/src/utils/crypto.ts` — AES 加密/解密工具
- `server/src/index.ts` — 注册路由

## 依赖关系

- 无前置依赖，可独立开发
- 后续任务 07（Agent-Token 绑定）和 09（LLM 服务改造）依赖此任务
