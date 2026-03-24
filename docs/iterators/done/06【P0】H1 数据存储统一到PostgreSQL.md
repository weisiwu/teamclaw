# 【P0】H1 数据存储统一到 PostgreSQL

> 优先级：P0（高）
> 前置依赖：无 · 后续影响：M1（迁移规范化）依赖本任务完成

---

## 1. 问题描述

项目中同时存在三套数据存储方案，定位重复、数据分散、重启丢失：

| 存储方式 | 文件位置 | 存储内容 | 问题 |
|---------|---------|---------|------|
| SQLite（better-sqlite3） | `server/src/db/sqlite.ts` | 版本、标签、分支、审计日志、搜索历史、下载任务、bump 历史、回退记录 | 与 PostgreSQL 重复，单文件锁，无法水平扩展 |
| PostgreSQL（pg） | `server/src/utils/db.ts` | 连接池已创建（max: 20），但几乎没有路由实际使用 | 配置了但空转，资源浪费 |
| 内存 Map | `taskLifecycle.ts`、`messageQueue.ts`、`importOrchestrator.ts` | 任务状态、消息队列、导入进度 | **服务重启全部丢失** |

### 风险等级：严重

- 线上重启后所有进行中的任务和消息队列丢失，无法恢复
- docker-compose 中已配置 PostgreSQL 服务但后端代码不使用它
- SQLite 的 `DATABASE_URL` 环境变量名与 PostgreSQL 的 `DATABASE_URL` 冲突

---

## 2. 当前代码分析

### 2.1 SQLite 入口

```
server/src/db/sqlite.ts
```

- `getDb()` 返回 SQLite 实例，被 `routes/version.ts`、`models/screenshot.ts` 等直接调用
- 数据文件路径：`~/.openclaw/teamclaw/versions.db`
- 启用了 WAL 模式

### 2.2 PostgreSQL 入口

```
server/src/utils/db.ts
```

- `pool` 导出了 `pg.Pool` 实例，连接 `DATABASE_URL`
- 仅被极少数新模块引用

### 2.3 内存存储

| 文件 | 存储结构 | 数据量级 |
|------|---------|---------|
| `server/src/services/taskLifecycle.ts` | `Map<string, Task>` | 数十~数百条任务 |
| `server/src/services/messageQueue.ts` | `Map<string, Message>` + `string[]` 优先级队列 | 数十~数百条消息 |
| `server/src/services/importOrchestrator.ts` | `Map<string, ImportTask>` | 少量（并发导入） |

---

## 3. 目标状态

- **唯一数据源**：所有持久化数据存储到 PostgreSQL
- **缓存层**：Redis 用于消息队列的实时优先级排序和热点数据缓存
- **零内存依赖**：服务重启后从 DB 恢复所有状态
- **移除 SQLite**：删除 `better-sqlite3` 依赖和 `sqlite.ts`

---

## 4. 实现步骤

### Step 1：设计 PostgreSQL Schema（0.5 天）

创建 `server/src/db/schema.sql`，包含以下表：

```sql
-- 版本管理（从 SQLite 迁移）
CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  project_id TEXT,
  summary TEXT,
  commit_hash TEXT,
  git_tag TEXT,
  git_tag_created_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  build_status TEXT DEFAULT 'pending',
  tag_created BOOLEAN DEFAULT FALSE,
  rollback_count INTEGER DEFAULT 0,
  last_rollback_at TIMESTAMPTZ
);

-- 标签
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  version_id TEXT REFERENCES versions(id) ON DELETE SET NULL,
  commit_hash TEXT,
  annotation TEXT,
  protected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 分支
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  is_remote BOOLEAN DEFAULT FALSE,
  is_protected BOOLEAN DEFAULT FALSE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_commit_at TIMESTAMPTZ,
  commit_message TEXT,
  author TEXT DEFAULT 'system',
  description TEXT,
  version_id TEXT REFERENCES versions(id) ON DELETE SET NULL,
  base_branch TEXT
);

-- 任务（从内存迁移）
CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  assigned_agent TEXT,
  parent_task_id TEXT,
  session_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  context_snapshot JSONB,
  tags TEXT[] DEFAULT '{}',
  max_retries INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 0
);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_session ON tasks(session_id);

-- 消息队列（从内存迁移）
CREATE TABLE IF NOT EXISTS messages (
  message_id TEXT PRIMARY KEY,
  queue_id TEXT,
  channel TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT '未知用户',
  role TEXT DEFAULT 'employee',
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  priority INTEGER DEFAULT 5,
  urgency TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'queued',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  merged_into TEXT
);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_priority ON messages(priority DESC, created_at ASC);

-- 导入任务（从内存迁移）
CREATE TABLE IF NOT EXISTS import_tasks (
  task_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  steps JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 搜索历史、下载任务、审计日志、bump_history、版本摘要、回退记录
-- （保持原 SQLite 中的表结构，改为 PostgreSQL 语法）
```

### Step 2：创建 PostgreSQL 数据访问层（1 天）

| 文件 | 说明 |
|------|------|
| `server/src/db/pg.ts` | 替代 `sqlite.ts`，封装 `pool.query()` 工具函数 |
| `server/src/db/repositories/versionRepo.ts` | 版本表 CRUD |
| `server/src/db/repositories/taskRepo.ts` | 任务表 CRUD |
| `server/src/db/repositories/messageRepo.ts` | 消息表 CRUD |
| `server/src/db/repositories/importRepo.ts` | 导入任务 CRUD |

`pg.ts` 接口示例：

```typescript
import { pool } from '../utils/db.js';

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}

export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params?: unknown[]): Promise<number> {
  const { rowCount } = await pool.query(sql, params);
  return rowCount ?? 0;
}
```

### Step 3：迁移路由层调用（1 天）

逐个替换 `getDb()` 调用为 PostgreSQL 查询：

| 原文件 | 改动点 |
|-------|-------|
| `server/src/routes/version.ts` | 所有 `db.prepare(...)` → `versionRepo.xxx()` |
| `server/src/models/screenshot.ts` | SQLite 查询 → PostgreSQL 查询 |
| `server/src/models/versionSummary.ts` | SQLite 查询 → PostgreSQL 查询 |
| `server/src/services/autoBump.ts` | 读写 bump_history 表 |
| `server/src/services/branchService.ts` | branches 和 branch_config 表 |
| `server/src/services/auditService.ts` | audit_log 表 |

### Step 4：内存存储迁移到 DB（1 天）

| 服务 | 改动 |
|------|------|
| `taskLifecycle.ts` | `Map` → `taskRepo`，保留内存缓存加速读取 |
| `messageQueue.ts` | `Map` + `string[]` → `messageRepo` + Redis sorted set |
| `importOrchestrator.ts` | `Map` → `importRepo` |

**消息队列 Redis 方案**：

```typescript
// 入队时同时写 DB 和 Redis
await messageRepo.insert(message);
await redis.zadd('mq:priority', message.priority, message.messageId);

// 出队时从 Redis 取最高优先级
const [messageId] = await redis.zrevrange('mq:priority', 0, 0);
const message = await messageRepo.findById(messageId);
```

### Step 5：数据迁移脚本（0.5 天）

创建 `scripts/migrate-sqlite-to-pg.ts`：
1. 读取 SQLite 数据库所有表
2. 逐表 INSERT 到 PostgreSQL
3. 验证行数一致
4. 输出迁移报告

### Step 6：清理（0.5 天）

1. 删除 `server/src/db/sqlite.ts`
2. 删除 `server/src/db/migrations/run.ts` 中的 SQLite 迁移逻辑
3. 从 `server/package.json` 移除 `better-sqlite3` 和 `@types/better-sqlite3`
4. 更新 `server/src/index.ts` 中的数据库初始化逻辑

---

## 5. 涉及文件清单

### 新建

| 文件 | 说明 |
|------|------|
| `server/src/db/schema.sql` | PostgreSQL 建表语句 |
| `server/src/db/pg.ts` | PostgreSQL 查询工具函数 |
| `server/src/db/repositories/versionRepo.ts` | 版本 Repository |
| `server/src/db/repositories/taskRepo.ts` | 任务 Repository |
| `server/src/db/repositories/messageRepo.ts` | 消息 Repository |
| `server/src/db/repositories/importRepo.ts` | 导入任务 Repository |
| `scripts/migrate-sqlite-to-pg.ts` | 数据迁移脚本 |

### 修改

| 文件 | 改动 |
|------|------|
| `server/src/routes/version.ts` | `getDb()` → `versionRepo` |
| `server/src/services/taskLifecycle.ts` | `Map` → DB + 缓存 |
| `server/src/services/messageQueue.ts` | `Map` → DB + Redis |
| `server/src/services/importOrchestrator.ts` | `Map` → DB |
| `server/src/services/branchService.ts` | SQLite → PostgreSQL |
| `server/src/services/auditService.ts` | SQLite → PostgreSQL |
| `server/src/services/autoBump.ts` | SQLite → PostgreSQL |
| `server/src/models/screenshot.ts` | SQLite → PostgreSQL |
| `server/src/models/versionSummary.ts` | SQLite → PostgreSQL |
| `server/src/index.ts` | 初始化逻辑更新 |
| `server/package.json` | 移除 better-sqlite3 |

### 删除

| 文件 | 原因 |
|------|------|
| `server/src/db/sqlite.ts` | 被 `pg.ts` 替代 |

---

## 6. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 服务启动无 SQLite 相关日志 | 启动日志检查 |
| 2 | `better-sqlite3` 不在 `node_modules` 中 | `npm ls better-sqlite3` 输出 empty |
| 3 | 重启服务后任务列表数据不丢失 | `curl /api/v1/tasks` 对比重启前后 |
| 4 | 重启服务后消息队列数据不丢失 | `curl /api/v1/messages/queue` 对比 |
| 5 | 版本列表与迁移前一致 | `curl /api/v1/versions` + 行数对比 |
| 6 | 迁移脚本可重复执行无报错 | 执行两次验证幂等 |
| 7 | 所有现有测试通过 | `npm test` |
