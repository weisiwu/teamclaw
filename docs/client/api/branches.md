# 分支管理 API

> `lib/api/branches.ts`

---

## 功能说明

分支管理 API 封装了 Git 分支相关的 API 调用，包括分支列表、详情、创建、删除、合并等操作。

---

## 函数列表

### fetchBranches

获取分支列表。

```typescript
async function fetchBranches(params?: {
  page?: number;
  pageSize?: number;
  projectId?: string;
  search?: string;
}): Promise<BranchListResponse>
```

### fetchBranchById

获取分支详情。

```typescript
async function fetchBranchById(id: string): Promise<Branch>
```

### createBranch

创建分支。

```typescript
async function createBranch(data: CreateBranchData): Promise<Branch>
```

### renameBranch

重命名分支。

```typescript
async function renameBranch(id: string, newName: string): Promise<Branch>
```

### deleteBranch

删除分支。

```typescript
async function deleteBranch(id: string): Promise<void>
```

### checkoutBranch

检出分支。

```typescript
async function checkoutBranch(id: string): Promise<Branch>
```

### protectBranch

保护分支。

```typescript
async function protectBranch(id: string): Promise<Branch>
```

### unprotectBranch

取消分支保护。

```typescript
async function unprotectBranch(id: string): Promise<Branch>
```

### setDefaultBranch

设为默认分支。

```typescript
async function setDefaultBranch(id: string): Promise<Branch>
```

### fetchDefaultBranch

获取默认分支。

```typescript
async function fetchDefaultBranch(projectId: string): Promise<Branch>
```

### fetchBranchStats

获取分支统计。

```typescript
async function fetchBranchStats(projectId?: string): Promise<BranchStats>
```

### compareBranches

对比两个分支。

```typescript
async function compareBranches(
  sourceBranchId: string,
  targetBranchId: string
): Promise<BranchDiff>
```

---

## 类型定义

```typescript
interface Branch {
  id: string;
  name: string;
  projectId: string;
  isDefault: boolean;
  isProtected: boolean;
  commitHash: string;
  commitMessage?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  behind?: number;             // 落后主分支的 commit 数
  ahead?: number;               // 领先主分支的 commit 数
}

interface BranchListResponse {
  data: Branch[];
  total: number;
  page: number;
  pageSize: number;
}

interface CreateBranchData {
  projectId: string;
  name: string;
  fromBranch?: string;         // 从哪个分支创建，默认从默认分支
}

interface BranchStats {
  total: number;
  defaultBranch: string;
  protectedCount: number;
  staleCount: number;           // 长期未更新的分支
  averageAge: number;           // 天
}

interface BranchDiff {
  sourceBranch: Branch;
  targetBranch: Branch;
  filesChanged: number;
  additions: number;
  deletions: number;
  commits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
  }>;
}
```

---

## React Query 使用示例

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBranches,
  fetchBranchById,
  createBranch,
  deleteBranch,
  compareBranches,
} from '@/lib/api/branches';

// 分支列表
const { data, isLoading } = useQuery({
  queryKey: ['branches', projectId],
  queryFn: () => fetchBranches({ projectId }),
});

// 创建分支
const createMutation = useMutation({
  mutationFn: createBranch,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['branches'] });
  },
});

// 删除分支
const deleteMutation = useMutation({
  mutationFn: deleteBranch,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['branches'] });
  },
});

// 分支对比
const { data: diff } = useQuery({
  queryKey: ['branches', 'compare', sourceId, targetId],
  queryFn: () => compareBranches(sourceId, targetId),
  enabled: !!sourceId && !!targetId,
});
```

---

## 相关文件

- `lib/api/branches.ts` — 本文件
- `app/api/v1/branches/` — Next.js API Routes
- `server/src/routes/branch.ts` — 后端路由
