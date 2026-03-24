# 16【P2】Monitor 页面中英文混用

## 问题描述

`app/monitor/page.tsx`（系统监控页面）中大量使用英文标签和文案，与项目整体中文 UI 风格不一致。

## 具体位置

| 行号 | 当前英文 | 建议中文 |
|------|---------|---------|
| 409 | `System Monitor` | `系统监控` |
| 431 | `Overall Status` | `整体状态` |
| 434 | `Last updated: ...` | `上次更新：...` |
| 439 | `{status?.toUpperCase()}` | 映射为中文状态 |
| 444 | `Uptime:` | `运行时长：` |
| 464 | `Status:` | `状态：` |
| 470 | `Latency:` | `延迟：` |

## 样式方案

**样式类型：纯文案替换（无样式变更）**

### 状态文字映射

```tsx
const STATUS_LABELS: Record<string, string> = {
  ok: '正常',
  degraded: '降级',
  error: '异常',
  unknown: '未知',
};

// 使用：
<span>{STATUS_LABELS[health?.status || 'unknown']}</span>
```

### 服务名称映射

```tsx
const SERVICE_LABELS: Record<string, string> = {
  postgres: 'PostgreSQL 数据库',
  redis: 'Redis 缓存',
  chromadb: 'ChromaDB 向量库',
};
```

## 修改范围

- `app/monitor/page.tsx` — 替换所有英文文案为中文
