# 数据库迁移说明

> teamclaw 使用 PostgreSQL 作为主数据库，ChromaDB 作为向量数据库，Redis 作为缓存。

---

## 数据库架构

| 数据库 | 用途 | 端口 | 数据持久化 |
|--------|------|------|-----------|
| PostgreSQL | 主数据库（用户、项目、任务、版本） | 5432 | ✅ Docker 卷 |
| Redis | 缓存 / Session / 实时队列 | 6379 | ✅ AOF + RDB |
| ChromaDB | 向量嵌入存储 / 语义检索 | 8000 | ✅ Docker 卷 |

---

## PostgreSQL

### 初始化脚本

`scripts/db-init.sql` — PostgreSQL 容器首次启动时自动执行（通过 Docker Compose 的 `docker-entrypoint-initdb.d` 机制）。

```bash
# 内容概览
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS users (...);
CREATE TABLE IF NOT EXISTS projects (...);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_name_gin ON projects USING gin(name gin_trgm_ops);
```

> **幂等性**：所有 `CREATE TABLE/INDEX` 语句均使用 `IF NOT EXISTS`，可安全重复执行。

### 初始化脚本（Shell）

`scripts/db-init.sh` — 用于在 Docker 容器启动后手动执行初始化检查：

```bash
# 手动执行
./scripts/db-init.sh

# 查看执行结果
cat logs/db-init.log
```

### 执行时机

1. **自动**：PostgreSQL 容器首次创建时，Docker 自动执行 `/docker-entrypoint-initdb.d/init.sql`
2. **手动**：后续表结构变更需通过数据库迁移工具执行

---

## 迁移文件说明

### SQLite → PostgreSQL 迁移

项目提供了 SQLite 数据迁移到 PostgreSQL 的工具：

```bash
# 迁移脚本
node scripts/migrate-sqlite-to-pg.ts

# 或使用 npx
npx tsx scripts/migrate-sqlite-to-pg.ts
```

该脚本位于 `scripts/migrate-sqlite-to-pg.ts`，用于将旧版 SQLite 数据迁移到 PostgreSQL。

---

## 数据库迁移规范（项目迭代规范）

> 参考 `docs/iterators/11【P1】M1 数据库迁移规范化.md`

### 迁移原则

1. **所有迁移文件必须幂等**（可重复执行，不报错）
2. **每次变更创建新迁移文件**，不直接修改已存在的表
3. **迁移文件命名格式**：`YYYYMMDDHHMMSS_description.sql`
4. **提交前在测试环境验证**

### 迁移文件模板

```sql
-- migrations/YYYYMMDDHHMMSS_add_agent_tasks_table.sql

-- 检查字段是否存在（PostgreSQL 特有方式）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'agent_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN agent_id VARCHAR(36);
    END IF;
END $$;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
```

### 迁移执行流程

```bash
# 1. 在测试环境执行迁移
psql -h localhost -U teamclaw -d teamclaw -f migrations/xxx.sql

# 2. 验证表结构
psql -h localhost -U teamclaw -d teamclaw -c "\d users"
psql -h localhost -U teamclaw -d teamclaw -c "\d projects"

# 3. 确认无误后，在生产环境执行
```

---

## 数据库连接

### 开发环境（本地）

```bash
# 直接连接
psql -h localhost -p 5432 -U teamclaw -d teamclaw

# 或通过 Docker
docker exec -it teamclaw-postgres psql -U teamclaw -d teamclaw
```

### 生产环境

```bash
# 通过 Docker
docker exec -it teamclaw-postgres psql -U teamclaw -d teamclaw

# 远程连接（需配置 pg_hba.conf）
psql -h production-host -p 5432 -U teamclaw -d teamclaw
```

### 常用 psql 命令

```sql
-- 列出所有表
\dt

-- 查看表结构
\d users
\d projects

-- 列出所有索引
\di

-- 列出所有序列
\ds

-- 执行 SQL 文件
\i scripts/db-init.sql

-- 查看当前连接
\conninfo
```

---

## ChromaDB（向量数据库）

### 数据备份

```bash
# 通过 Docker 备份
docker exec teamclaw-chroma tar -czf /backup/chroma_$(date +%Y%m%d).tar.gz -C /chroma chroma

# 复制到宿主机
docker cp teamclaw-chroma:/backup/chroma_20260324.tar.gz ./backups/
```

### 数据恢复

```bash
# 将备份文件复制到容器
docker cp ./backups/chroma_20260324.tar.gz teamclaw-chroma:/backup/

# 恢复
docker exec teamclaw-chroma tar -xzf /backup/chroma_20260324.tar.gz -C /
docker exec teamclaw-chroma rm /backup/chroma_20260324.tar.gz
```

---

## Redis 数据管理

### 健康检查

```bash
# 连接 Redis
docker exec -it teamclaw-redis redis-cli

# 检查连接
redis-cli ping
# 应返回：PONG
```

### 常用操作

```bash
# 查看所有 key
redis-cli keys '*'

# 查看 key 类型
redis-cli type session:abc123

# 删除指定 key
redis-cli del session:abc123

# 清空所有数据（⚠️ 生产环境慎用）
redis-cli flushall

# 查看内存使用
redis-cli info memory
```

---

## 数据库备份与恢复

### 全量备份脚本

```bash
# 一键备份（PostgreSQL + Redis + 本地数据）
./scripts/backup.sh

# 备份产物：backups/YYYYMMDD_HHMMSS.tar.gz
```

### 数据恢复

```bash
# 恢复备份
./scripts/restore.sh backups/YYYYMMDD_HHMMSS.tar.gz
```

### 备份内容说明

| 文件 | 内容 |
|------|------|
| `postgres.sql` | PostgreSQL 完整 SQL 导出 |
| `redis.rdb` | Redis RDB 快照 |
| `data/` | 本地文件数据（如存在） |

---

## 健康检查

```bash
# PostgreSQL
docker exec teamclaw-postgres pg_isready -U teamclaw -d teamclaw
# 应返回：accepting connections

# Redis
docker exec teamclaw-redis redis-cli ping
# 应返回：PONG

# ChromaDB
curl -s http://localhost:8000/api/v1/heartbeat
# 应返回：{"success": true}
```
