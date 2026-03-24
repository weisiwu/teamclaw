# Token 管理 API

> `lib/api/tokens.ts`

---

## 功能说明

Token 管理 API 封装了 API Token 相关的 API 调用，包括 Token 的创建、列表、禁用、删除，以及使用统计。

---

## 函数列表

### fetchTokens

获取 Token 列表。

```typescript
async function fetchTokens(params?: {
  page?: number;
  pageSize?: number;
  projectId?: string;
  status?: 'active' | 'disabled';
}): Promise<TokenListResponse>
```

### createToken

创建新 Token。

```typescript
async function createToken(data: CreateTokenData): Promise<TokenCreated>
```

### deleteToken

删除 Token。

```typescript
async function deleteToken(id: string): Promise<void>
```

### disableToken

禁用 Token。

```typescript
async function disableToken(id: string): Promise<Token>
```

### enableToken

启用 Token。

```typescript
async function enableToken(id: string): Promise<Token>
```

### fetchTokenStats

获取 Token 使用统计。

```typescript
async function fetchTokenStats(params?: {
  period?: 'today' | 'week' | 'month';
  projectId?: string;
}): Promise<TokenStats>
```

### fetchTokenDailyUsage

获取 Token 每日使用量。

```typescript
async function fetchTokenDailyUsage(params?: {
  startDate?: string;
  endDate?: string;
  projectId?: string;
}): Promise<TokenDailyUsage[]>
```

---

## 类型定义

```typescript
interface Token {
  id: string;
  name: string;
  prefix: string;              // Token 前缀，如 "tc_xxx..."
  projectId?: string;
  projectName?: string;
  status: 'active' | 'disabled';
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
}

interface TokenCreated {
  token: string;               // 完整 Token，仅在创建时返回
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt?: string;
  createdAt: string;
}

interface TokenListResponse {
  data: Token[];
  total: number;
  page: number;
  pageSize: number;
}

interface CreateTokenData {
  name: string;
  projectId?: string;
  scopes?: string[];
  expiresAt?: string;
}

interface TokenStats {
  period: 'today' | 'week' | 'month';
  totalUsed: number;
  estimatedCost: number;
  byProject: Record<string, number>;
  byAgent: Record<string, number>;
}

interface TokenDailyUsage {
  date: string;
  used: number;
  cost: number;
}
```

---

## Token 作用域

| 作用域 | 说明 |
|---|---|
| `read` | 读取权限 |
| `write` | 写入权限 |
| `admin` | 管理权限 |

---

## React Query 使用示例

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTokens,
  createToken,
  deleteToken,
  disableToken,
  fetchTokenStats,
} from '@/lib/api/tokens';

// Token 列表
const { data, isLoading } = useQuery({
  queryKey: ['tokens'],
  queryFn: () => fetchTokens(),
});

// Token 使用统计
const { data: stats } = useQuery({
  queryKey: ['tokens', 'stats', period],
  queryFn: () => fetchTokenStats({ period }),
});

// 创建 Token
const createMutation = useMutation({
  mutationFn: createToken,
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['tokens'] });
    // 重要：创建成功时显示完整 Token
    showTokenDialog(data);
  },
});

// 删除 Token
const deleteMutation = useMutation({
  mutationFn: deleteToken,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tokens'] });
  },
});

// 禁用 Token
const disableMutation = useMutation({
  mutationFn: disableToken,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tokens'] });
  },
});
```

---

## 注意事项

创建 Token 时返回的完整 Token `token` **只会返回一次**，之后无法再次获取，请提醒用户及时保存。

---

## 相关文件

- `lib/api/tokens.ts` — 本文件
- `app/api/v1/tokens/` — Next.js API Routes
- `server/src/routes/token.ts` — 后端路由
