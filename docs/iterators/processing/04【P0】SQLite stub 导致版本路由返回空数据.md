# 04【P0】SQLite stub 导致版本路由返回空数据

## 问题描述

`server/src/db/sqlite.ts` 是一个 stub 实现，所有查询方法都返回空数据：

```typescript
export function getDb(): DbStub {
  return {
    prepare: () => ({
      all: () => [],      // 永远返回空数组
      get: () => null,    // 永远返回 null
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
    }),
  };
}
```

任何依赖 `getDb()` 的服务（如版本管理、标签服务等）都会返回空数据，前端页面显示为空。

## 影响范围

- 版本列表页面无数据
- 依赖 SQLite 查询的服务全部失效
- 数据写入操作静默失败（`run` 返回 `changes: 0`）

## 根因

项目已从 SQLite 迁移到 PostgreSQL（`server/src/db/pg.ts`），但部分模块仍引用旧的 `sqlite.ts` stub。

## 修复方案

1. 排查所有 `import` 自 `sqlite.ts` 或调用 `getDb()` 的模块
2. 将它们迁移到使用 `pg.ts` 的 `query()` / `queryOne()` / `execute()` 方法
3. 确认迁移完成后，删除 `sqlite.ts` stub 文件
4. 验证版本列表等页面能正确显示数据

## 修改文件

- `server/src/db/sqlite.ts` — 最终删除
- 所有引用 `getDb()` 的服务文件 — 迁移到 pg.ts

## 依赖关系

- 无前置依赖
- 修复后版本管理等多个页面恢复正常
