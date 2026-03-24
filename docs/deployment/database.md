# TeamClaw 数据库迁移说明

本文档介绍 TeamClaw 的数据库架构、迁移系统和使用方法。

---

## 数据库架构

### 技术栈

- **数据库**: PostgreSQL 14+
- **扩展**: `uuid-ossp` (UUID 生成), `pg_trgm` (全文搜索)
- **ORM**: 原生 SQL + 类型化接口
- **迁移**: 自定义 SQL 迁移系统

### 核心数据表

| 表名 | 用途 |
|------|------|
| `users` | 系统用户 |
| `projects` | 项目信息 |
| `versions` | 版本记录 |
| `builds` / `build_records` | 构建历史 |
| `tags` | 版本标签 |
| `branches` | Git 分支 |
| `screenshots` | 截图资源 |
| `messages` | 消息关联 |
| `audit_logs` | 审计日志 |
| `_migrations` | 迁移记录 |

---

## 迁移系统

### 迁移文件命名规范

```
YYYYMMDD_NNN_description.sql
```

- `YYYYMMDD`: 日期
- `NNN`: 三位序列号
- `description`: 简短描述

**示例：**
```
20260321_001_create_versions.sql
20260321_002_add_version_indexes.sql
20260322_001_create_rollback_history.sql
```

### 迁移文件结构

每个迁移文件可包含 UP 和 DOWN 部分：

```sql
-- UP: 执行升级
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_name ON users(name);

-- DOWN: 执行回滚（可选）
-- DROP INDEX idx_users_name;
-- DROP TABLE users;
```

**注意：** 当前系统只执行 UP 部分，DOWN 用于文档记录。

---

## 迁移操作

### 自动迁移（推荐）

后端服务启动时会自动检查并执行待迁移：

```bash
# 开发环境
npm run dev:backend

# 生产环境（Docker）
docker-compose up server
```

### 手动执行迁移

```bash
# 使用 Node.js 直接运行
cd server
node dist/db/migrations/run.js

# 或使用 npm 脚本（如已配置）
npm run migrate
```

### 查看迁移状态

```bash
# 进入数据库
psql $DATABASE_URL

# 查看已执行的迁移
SELECT * FROM _migrations ORDER BY executed_at DESC;

# 查看待执行的迁移文件
\q
ls -la server/src/db/migrations/*.sql
```

---

## 创建新迁移

### 步骤 1: 创建迁移文件

```bash
# 生成带时间戳的文件名
touch "server/src/db/migrations/$(date +%Y%m%d)_001_add_new_feature.sql"
```

### 步骤 2: 编写迁移 SQL

```sql
-- server/src/db/migrations/20260324_001_add_user_preferences.sql

-- UP
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'zh-CN',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- 添加触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- DOWN
-- DROP TRIGGER update_user_preferences_updated_at ON user_preferences;
-- DROP FUNCTION update_updated_at_column();
-- DROP INDEX idx_user_preferences_user_id;
-- DROP TABLE user_preferences;
```

### 步骤 3: 测试迁移

```bash
# 在开发环境测试
npm run dev:backend

# 检查日志输出
# [migrations] Running 1 pending migration(s)...
#   ✅ 20260324_001_add_user_preferences (45ms)
```

### 步骤 4: 验证结果

```bash
psql $DATABASE_URL -c "\dt user_preferences"
psql $DATABASE_URL -c "SELECT * FROM _migrations WHERE name = '20260324_001_add_user_preferences'"
```

---

## 数据库初始化

### Docker 首次启动

PostgreSQL 容器首次启动时会自动执行 `scripts/db-init.sql`：

```sql
-- scripts/db-init.sql
-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 创建基础表
CREATE TABLE IF NOT EXISTS users (...);
CREATE TABLE IF NOT EXISTS projects (...);

-- 创建索引
CREATE INDEX IF NOT EXISTS ...;

-- 授权
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO teamclaw;
```

### 手动初始化

```bash
# 连接数据库
psql -U postgres -d teamclaw

# 执行初始化脚本
\i scripts/db-init.sql
```

---

## 备份与恢复

### 备份数据库

```bash
# 完整备份
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 仅备份数据（不含结构）
pg_dump --data-only $DATABASE_URL > backup_data_$(date +%Y%m%d).sql

# 压缩备份
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 恢复数据库

```bash
# 从 SQL 文件恢复
psql $DATABASE_URL < backup_20260324.sql

# 从压缩文件恢复
gunzip -c backup_20260324.sql.gz | psql $DATABASE_URL

# 恢复前清空数据（⚠️ 危险操作）
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $DATABASE_URL < backup_20260324.sql
```

---

## 性能优化

### 常用索引

```sql
-- 全文搜索索引
CREATE INDEX idx_projects_name_trgm ON projects USING gin(name gin_trgm_ops);

-- 复合索引
CREATE INDEX idx_builds_version_status ON builds(version_id, status);

-- 部分索引
CREATE INDEX idx_versions_active ON versions(status) WHERE status = 'active';

-- 表达式索引
CREATE INDEX idx_versions_version_semver ON versions((string_to_array(version, '.')::int[]));
```

### 查询优化示例

```sql
-- 使用 EXPLAIN ANALYZE 分析查询
EXPLAIN ANALYZE SELECT * FROM versions WHERE project_id = 'xxx' ORDER BY created_at DESC;

-- 查看表统计信息
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
WHERE tablename = 'versions';

-- 更新统计信息
ANALYZE versions;
```

---

## 故障排查

### 迁移失败

```bash
# 查看失败记录
psql $DATABASE_URL -c "SELECT * FROM _migrations WHERE status = 'failed'"

# 手动修复后标记为成功
psql $DATABASE_URL -c "UPDATE _migrations SET status = 'success' WHERE name = '20260324_001_xxx'"

# 或删除记录重新执行
psql $DATABASE_URL -c "DELETE FROM _migrations WHERE name = '20260324_001_xxx'"
```

### 连接池耗尽

```bash
# 查看当前连接
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# 查看连接详情
psql $DATABASE_URL -c "SELECT datname, usename, state, query FROM pg_stat_activity"

# 终止空闲连接
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '1 hour'"
```

### 磁盘空间不足

```bash
# 查看表大小
psql $DATABASE_URL -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC"

# 清理审计日志（如有保留策略）
psql $DATABASE_URL -c "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'"
```
