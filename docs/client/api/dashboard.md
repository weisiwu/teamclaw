# 仪表盘 API

> `lib/api/dashboard.ts`

---

## 功能说明

仪表盘 API 提供系统概览数据，用于首页仪表盘展示。

---

## fetchOverview

获取系统概览数据。

```typescript
async function fetchOverview(): Promise<DashboardOverview>
```

---

## 类型定义

```typescript
interface DashboardOverview {
  projects: {
    total: number;
    active: number;
    inactive: number;
    archived: number;
  };
  versions: {
    total: number;
    active: number;
    archived: number;
    draft: number;
    latest: string;           // 最新版本名称
    latestId: string;         // 最新版本 ID
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    cancelled: number;
    failed: number;
  };
  tokens: {
    todayUsed: number;
    weekUsed: number;
    monthUsed: number;
    estimatedCost: number;
  };
  agents: {
    total: number;
    busy: number;
    idle: number;
    offline: number;
  };
  builds: {
    today: number;
    week: number;
    month: number;
    successRate: number;      // 百分比
    averageDuration: number;    // 秒
  };
}
```

---

## React Query 使用示例

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchOverview } from '@/lib/api/dashboard';

function DashboardPage() {
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: fetchOverview,
    staleTime: 60000,    // 60 秒
    refetchOnWindowFocus: true,
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      <StatsCards stats={overview} />
      <MenuGrid />
    </div>
  );
}
```

---

## 相关文件

- `lib/api/dashboard.ts` — 本文件
- `app/api/v1/dashboard/overview/route.ts` — Next.js API Route
- `server/src/routes/dashboard.ts` — 后端路由
