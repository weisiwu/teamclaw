# 后端数据模型文档

> 本目录包含 TeamClaw 后端所有 TypeScript 类型定义、接口和数据库模型说明。

## 📁 文件结构

```
docs/server/models/
├── README.md                 # 本文档索引
├── 01-project.md             # 项目与导入模型
├── 02-agent.md               # Agent 编排模型
├── 03-task.md                # 任务机制模型
├── 04-version.md             # 版本管理模型
├── 05-message.md             # 消息机制模型
├── 06-branch-tag.md          # 分支与标签模型
├── 07-build.md               # 构建记录模型
├── 08-cronjob.md             # 定时任务模型
├── 09-audit-webhook.md       # 审计日志与 Webhook 模型
├── 10-ability-config.md      # 能力与配置模型
├── 11-search-screenshot.md   # 搜索与截图模型
└── 12-dashboard-download.md  # 仪表盘与下载模型
```

## 🗄️ 存储层说明

| 存储方式          | 模型文件         | 说明                                                |
| ----------------- | ---------------- | --------------------------------------------------- |
| **PostgreSQL**    | `pg.ts`          | 主要业务数据：screenshots, version_summaries        |
| **SQLite**        | `sqlite.js`      | 本地持久化：rollback_history, version_change_events |
| **内存+JSON文件** | `buildRecord.ts` | 构建记录（兼顾性能和持久化）                        |

## 📊 模型概览

| 模型                 | 文件                    | 存储       | 说明               |
| -------------------- | ----------------------- | ---------- | ------------------ |
| `Project`            | `project.ts`            | -          | 项目基本信息       |
| `ImportTask`         | `project.ts`            | -          | 导入任务状态       |
| `AgentDetail`        | `agent.ts`              | -          | Agent 配置与运行时 |
| `Task`               | `task.ts`               | -          | 任务数据模型       |
| `Version`            | `version.ts`            | -          | 版本信息           |
| `VersionSettings`    | `version.ts`            | -          | 版本配置           |
| `Message`            | `message.ts`            | -          | 消息数据模型       |
| `BranchRecord`       | `branch.ts`             | SQLite     | Git 分支记录       |
| `TagRecord`          | `tag.ts`                | SQLite     | Git 标签记录       |
| `BuildRecord`        | `buildRecord.ts`        | JSON文件   | 构建历史           |
| `CronJob`            | `cronJob.ts`            | -          | 定时任务           |
| `AuditLog`           | `auditLog.ts`           | -          | 审计日志           |
| `Webhook`            | `webhook.ts`            | -          | Webhook 配置       |
| `Ability`            | `ability.ts`            | -          | 能力/权限定义      |
| `Screenshot`         | `screenshot.ts`         | PostgreSQL | 截图数据           |
| `VersionSummary`     | `versionSummary.ts`     | PostgreSQL | 版本变更摘要       |
| `VersionChangeEvent` | `versionChangeEvent.ts` | SQLite     | 版本变更事件       |
| `RollbackRecord`     | `rollbackRecord.ts`     | SQLite     | 回退记录           |
| `TokenUsageRecord`   | `tokenStats.ts`         | -          | Token 消费统计     |
| `DownloadTask`       | `download.ts`           | -          | 下载任务           |
| `SystemConfig`       | `systemConfig.ts`       | -          | 系统配置           |
| `AgentConfig`        | `agents.ts`             | -          | Agent 团队配置     |

## 🔗 相关文档

- [服务层文档](../services/服务层文档.md)
- [路由层文档](../routes/路由层文档.md)
- [系统架构](../../系统架构.V1.md)
