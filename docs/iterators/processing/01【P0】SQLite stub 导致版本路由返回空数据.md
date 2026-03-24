# 01【P0】SQLite stub 导致版本路由返回空数据

> 优先级：🔴 P0（核心功能不可用）
> 发现日期：2026-03-25
> 状态：待处理

---

## 问题描述

`server/src/db/sqlite.ts` 已被改为 **no-op stub**（空操作桩），`getDb()` 返回的 `prepare()` 永远返回空数组/null。但仍有 **20+ 个路由和服务文件** 通过 `import { getDb } from '../db/sqlite.js'` 依赖它，导致所有查询结果为空。

### 受影响文件清单

| 类型 | 文件 | 影响 |
|------|------|------|
| 路由 | `routes/version.ts` | 版本 CRUD 全部返回空 |
| 路由 | `routes/versionBuild.ts` | 构建记录查询为空 |
| 路由 | `routes/versionBump.ts` | Bump 历史为空 |
| 路由 | `routes/versionRollback.ts` | 回退历史为空 |
| 路由 | `routes/versionSummary.ts` | 摘要查询为空 |
| 路由 | `routes/versionTag.ts` | Tag 列表为空 |
| 路由 | `routes/versionDiff.ts` | 版本对比失败 |
| 路由 | `routes/versionChangeStats.ts` | 变更统计为空 |
| 路由 | `routes/tag.ts` | Tag 管理功能失效 |
| 路由 | `routes/health.ts` | 健康检查 SQLite 状态异常 |
| 服务 | `services/tagService.ts` | Tag 创建/查询失效 |
| 服务 | `services/downloadService.ts` | 下载记录丢失 |
| 服务 | `services/searchEnhancer.ts` | 搜索历史无法写入 |
| 服务 | `services/changeTracker.ts` | 变更事件无法记录 |
| 服务 | `services/versionToBuild.ts` | 版本→构建联动断裂 |
| 服务 | `services/agentToVersion.ts` | Agent→版本联动断裂 |
| 模型 | `models/rollbackRecord.ts` | 回退记录模型失效 |
| 模型 | `models/versionChangeEvent.ts` | 变更事件模型失效 |
| 中间件 | `middleware/projectAccess.ts` | 项目访问权限检查失败 |
| Hook | `hooks/autoBumpOnTaskDone.ts` | 自动 bump 钩子失效 |

### 当前 sqlite.ts 内容

```typescript
// Returns a no-op DB stub for testing
export function getDb(): DbStub {
  return {
    prepare: () => ({
      all: () => [],
      get: () => null,
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
    }),
  };
}
```

## 风险

- **所有版本管理功能不可用**：创建、列表、详情、构建、回退、Tag 全部返回空
- 前端页面显示空白列表，用户以为系统无数据
- 健康检查可能误报 SQLite 正常
- 项目访问权限检查永远通过（`get()` 返回 null）

## 优化方案

### 方案 A：将 SQLite 依赖全部迁移到 PostgreSQL（推荐）

1. 为每个受影响的路由/服务创建对应的 PostgreSQL repository（类似已有的 `userRepo.ts`、`cronRepo.ts`）
2. 在 `db/pg.ts` 中创建所需的表（versions、tags、rollback_records、build_records 等）
3. 逐个替换 `getDb()` 调用为对应的 repo 方法
4. 删除 `sqlite.ts` stub

### 方案 B：恢复真实 SQLite 连接（临时方案）

1. 恢复 `sqlite.ts` 中的 `better-sqlite3` 连接
2. 确保 SQLite 文件路径和迁移正常运行
3. 后续再做统一迁移

### 建议

优先方案 A，按路由分批迁移：
1. 第一批：`version.ts` + `versionBuild.ts` + `versionTag.ts`（核心版本管理）
2. 第二批：`versionRollback.ts` + `versionBump.ts` + `versionSummary.ts`
3. 第三批：`tag.ts` + `downloadService.ts` + `searchEnhancer.ts`
4. 第四批：其余文件

## 验收标准

- [ ] 所有 20+ 文件不再依赖 `sqlite.ts`
- [ ] 版本 CRUD API 返回真实数据
- [ ] Tag、构建、回退等子功能正常工作
- [ ] `sqlite.ts` 文件删除或仅保留测试用途
- [ ] 健康检查反映真实数据库状态
