# Token 消费统计

## 页面路由

```
/tokens
```

## 页面功能描述

Token 消费统计页面，展示 Token 消耗的详细数据：
- **汇总卡片**：总输入/输出 Token、总成本等 6 个指标卡片
- **日期筛选**：按日期范围筛选数据
- **趋势图表**：Token 消耗趋势折线图（近 30 天）
- **每日明细表**：每日 Token 消耗数据表格
- **任务明细表**：每个任务级别的 Token 消耗列表（支持分页）
- **CSV 导出**：导出每日明细为 CSV 文件

页面数据通过 React Query 管理，支持自动刷新。

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `TokenSummaryCards` | `@/components/tokens` | Token 汇总指标卡片 |
| `TokenTrendChart` | `@/components/tokens` | 消耗趋势折线图 |
| `TokenDailyTable` | `@/components/tokens` | 每日 Token 明细表 |
| `TokenTaskTable` | `@/components/tokens` | 任务级别 Token 明细 |
| `TokenFilterBar` | `@/components/tokens` | 日期筛选栏 |
| `Toast` | `@/components/ui/toast` | Toast 通知 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `summaryData` | 来自 `useTokenSummary()` | 汇总数据 |
| `dailyData` | 来自 `useTokenDailyList()` | 每日明细 |
| `taskData` | 来自 `useTokenTaskList()` | 任务明细 |
| `trendData` | 来自 `useTokenTrend(30)` | 30 天趋势数据 |
| `isLoading` | `useState<boolean>` | 全局加载状态 |
| `toastMsg / toastType / toastVisible` | Toast 状态 | 导出等操作反馈 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `useTokenSummary` | `@/hooks/useTokens` | 获取 Token 汇总 |
| `useTokenDailyList` | `@/hooks/useTokens` | 获取每日明细列表 |
| `useTokenTaskList` | `@/hooks/useTokens` | 获取任务明细列表 |
| `useTokenTrend` | `@/hooks/useTokens` | 获取趋势数据 |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/tokens` | URL 参数变化 | 按日期范围筛选 |

## URL 参数

页面使用 Next.js `useSearchParams` 管理筛选状态：

| 参数名 | 类型 | 含义 |
|--------|------|------|
| `startDate` | `string` | 开始日期（YYYY-MM-DD） |
| `endDate` | `string` | 结束日期（YYYY-MM-DD） |
| `taskSearch` | `string` | 任务名称搜索关键词 |
| `taskPage` | `number` | 任务表格当前页码 |

## CSV 导出

导出每日 Token 消耗数据，包含列：日期、输入 Token、输出 Token、总 Token、预估成本（元）。

## 加载策略

- 页面使用 `Suspense` + `TokensLoading` Skeleton 占位
- `TokensContent` 组件通过 `useSearchParams` 读取 URL 参数，需要 Suspense 包裹
