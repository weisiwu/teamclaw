# Token 使用统计组件 (tokens)

## 目录

`components/tokens/` 包含 Token 使用统计相关组件：

| 组件                 | 说明                 |
| -------------------- | -------------------- |
| TokenSummaryCards    | Token 使用汇总卡片组 |
| TokenDailyTable      | 每日用量表格         |
| TokenTaskTable       | 按任务维度用量表格   |
| TokenTrendChart      | Token 趋势图表       |
| TokenTrendChartInner | 趋势图内部组件       |
| TokenFilterBar       | 筛选工具栏           |

## TokenSummaryCards

展示 Token 使用概览数据：

- 今日使用量
- 本月使用量
- 可用额度
- 预测月底用量

## TokenDailyTable

按日期展示每日 Token 消耗明细。

## TokenTaskTable

按任务维度聚合 Token 消耗。

## TokenTrendChart

Token 使用趋势折线图。

| 属性   | 类型                     | 说明     |
| ------ | ------------------------ | -------- |
| data   | `TokenUsage[]`           | 使用数据 |
| period | `"7d" \| "30d" \| "90d"` | 时间范围 |
