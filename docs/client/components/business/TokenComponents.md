# Token 相关组件

Token 使用量管理和分析组件集合。

## 导入

```tsx
import {
  TokenDailyTable,
  TokenFilterBar,
  TokenSummaryCards,
  TokenTaskTable,
  TokenTrendChart,
} from "@/components/tokens";
```

## 组件列表

### TokenSummaryCards

Token 使用摘要卡片，展示总体使用量、趋势等核心指标。

```tsx
<TokenSummaryCards data={tokenData} />
```

### TokenDailyTable

每日 Token 消耗明细表。

```tsx
<TokenDailyTable records={dailyRecords} />
```

### TokenTaskTable

按任务维度的 Token 消耗表。

```tsx
<TokenTaskTable tasks={taskRecords} />
```

### TokenFilterBar

Token 数据的筛选工具栏（日期范围、模型筛选等）。

```tsx
<TokenFilterBar
  filters={filters}
  onChange={setFilters}
/>
```

### TokenTrendChart

Token 使用趋势图表（折线图/柱状图）。

```tsx
<TokenTrendChart data={trendData} />
```

## 使用示例

```tsx
import {
  TokenSummaryCards,
  TokenDailyTable,
  TokenFilterBar,
  TokenTrendChart,
} from "@/components/tokens";

function TokenPage() {
  return (
    <div className="space-y-6">
      <TokenSummaryCards data={tokenData} />
      <TokenFilterBar filters={filters} onChange={setFilters} />
      <TokenTrendChart data={trendData} />
      <TokenDailyTable records={filteredRecords} />
    </div>
  );
}
```
