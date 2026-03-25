# 【P0】H3 version.ts 路由拆分（后端）

> 优先级：P0（高）
> 前置依赖：H1（数据存储统一）完成后再拆分更高效 · 关联任务：H4（前端拆分）

---

## 1. 问题描述

`server/src/routes/version.ts` 是全项目最大的单文件：

- **文件大小**：80KB / 2305 行
- **import 数量**：27 个外部依赖导入
- **路由端点数**：40+ 个 route handler
- **混入内容**：类型定义、内存设置、迁移执行

### 违反的原则

| 原则 | 违反情况 |
|------|---------|
| 单一职责 | 一个文件包含版本 CRUD、构建、回退、Tag、对比、截图、摘要、设置 |
| 关注点分离 | 类型定义（`Version`、`VersionSettings`）直接写在路由文件中 |
| 启动安全 | `runMigrations()` 在模块顶层同步执行 |
| 可测试性 | 无法对单个功能域独立测试 |

---

## 2. 当前文件结构分析

`server/src/routes/version.ts` 内容分布（按行号估算）：

| 行范围 | 内容 | 预估行数 |
|--------|------|---------|
| 1-30 | import 语句（27 个） | 30 |
| 31-70 | 类型定义 + 内存 settings | 40 |
| 70-300 | 版本 CRUD（list, get, create, update, delete） | 230 |
| 300-550 | Git 操作（log, branches, tags） | 250 |
| 550-800 | 构建相关（trigger build, config, artifacts） | 250 |
| 800-1100 | Tag 管理（create, list, delete, auto-tag） | 300 |
| 1100-1400 | 回退（rollback preview, execute, history） | 300 |
| 1400-1600 | 版本对比（compare, quick compare） | 200 |
| 1600-1800 | 截图管理（upload, link, delete） | 200 |
| 1800-2000 | 摘要（generate, edit, get） | 200 |
| 2000-2150 | Bump 历史 + 自动 bump | 150 |
| 2150-2305 | 版本设置（get, update） | 155 |

---

## 3. 目标状态

拆分为 **9 个文件**，每个文件 100-300 行，职责单一：

```
server/src/routes/
├── version.ts              # 版本 CRUD（主路由）
├── versionBuild.ts         # 构建触发与产物管理
├── versionRollback.ts      # 版本回退
├── versionTag.ts           # Git Tag 管理
├── versionCompare.ts       # 版本对比
├── versionScreenshot.ts    # 截图管理
├── versionSummary.ts       # 版本摘要
├── versionSettings.ts      # 版本设置 + Bump 配置
└── versionBump.ts          # 自动 Bump + Bump 历史
```

类型定义移到：

```
server/src/models/version.ts  # Version, VersionSettings 等类型
```

---

## 4. 实现步骤

### Step 1：提取类型定义到 models（0.5h）

将 `version.ts` 中的以下类型移到 `server/src/models/version.ts`：

```typescript
// server/src/models/version.ts
export type VersionBumpType = 'patch' | 'minor' | 'major';

export interface Version {
  id: string;
  version: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  gitTag?: string;
  gitTagCreatedAt?: string;
  buildStatus: 'pending' | 'building' | 'success' | 'failed';
  artifactUrl?: string;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
  isMain: boolean;
  commitCount: number;
  changedFiles: string[];
  hasScreenshot?: boolean;
  hasSummary?: boolean;
  summary?: string;
  summaryGeneratedAt?: string;
  summaryGeneratedBy?: string;
}

export interface VersionSettings {
  autoBump: boolean;
  bumpType: VersionBumpType;
  autoTag: boolean;
  tagPrefix: 'v' | 'release' | 'version' | 'custom';
  customPrefix?: string;
  tagOnStatus: string[];
  lastBumpedAt?: string;
}
```

### Step 2：提取 settings 管理到共享模块（0.5h）

当前 `settings` 是路由文件中的模块级变量，多个子路由都需要访问。

**新建 `server/src/services/versionSettingsStore.ts`**：

```typescript
import { VersionSettings } from '../models/version.js';

let settings: VersionSettings = {
  autoBump: true,
  bumpType: 'patch',
  autoTag: true,
  tagPrefix: 'v',
  tagOnStatus: ['published'],
};

export function getSettings(): VersionSettings { return { ...settings }; }
export function updateSettings(patch: Partial<VersionSettings>): VersionSettings {
  settings = { ...settings, ...patch };
  return { ...settings };
}
```

### Step 3：逐域拆分路由（4-6h）

按以下顺序逐个拆出子路由文件。每个子路由文件的结构统一为：

```typescript
import { Router } from 'express';
import { success, error } from '../utils/response.js';
// ... 业务 import

const router = Router();

// route handlers...

export default router;
```

#### 3a. `versionBuild.ts`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/:id/build` | POST | 触发构建 |
| `/:id/build/retry` | POST | 重新构建 |
| `/build/config` | GET | 获取构建配置 |
| `/:id/artifacts` | GET | 列出产物 |
| `/:id/artifacts/:name` | GET | 下载产物 |
| `/:id/artifacts` | DELETE | 删除产物 |
| `/artifacts/import` | POST | 导入产物目录 |
| `/artifacts/size` | GET | 产物总大小 |

#### 3b. `versionRollback.ts`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/:id/rollback/preview` | GET | 回退预览 |
| `/:id/rollback/targets` | GET | 可回退目标 |
| `/:id/rollback` | POST | 执行回退 |
| `/rollback/history` | GET | 回退历史 |

#### 3c. `versionTag.ts`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/tags` | GET | Tag 列表 |
| `/tags` | POST | 创建 Tag |
| `/tags/:name` | DELETE | 删除 Tag |
| `/:id/auto-tag` | POST | 自动创建 Tag |

#### 3d. `versionCompare.ts`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/compare` | GET | 对比两个版本 |
| `/compare/quick` | GET | 快速对比 |

#### 3e. `versionScreenshot.ts`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/:id/screenshots` | GET | 获取截图列表 |
| `/:id/screenshots` | POST | 上传截图 |
| `/:id/screenshots/:screenshotId` | DELETE | 删除截图 |
| `/:id/screenshots/link` | POST | 关联截图 |

#### 3f. `versionSummary.ts`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/:id/summary` | GET | 获取摘要 |
| `/:id/summary/generate` | POST | 生成摘要 |
| `/:id/summary` | PUT | 编辑摘要 |

#### 3g. `versionBump.ts`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/:id/bump` | POST | 手动 bump |
| `/bump/history` | GET | bump 历史 |
| `/bump/auto` | POST | 触发自动 bump |

#### 3h. `versionSettings.ts`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/settings` | GET | 获取版本设置 |
| `/settings` | PUT | 更新版本设置 |

### Step 4：在主路由中聚合（0.5h）

改写 `version.ts` 为聚合入口：

```typescript
import { Router } from 'express';
import versionBuildRouter from './versionBuild.js';
import versionRollbackRouter from './versionRollback.js';
import versionTagRouter from './versionTag.js';
import versionCompareRouter from './versionCompare.js';
import versionScreenshotRouter from './versionScreenshot.js';
import versionSummaryRouter from './versionSummary.js';
import versionBumpRouter from './versionBump.js';
import versionSettingsRouter from './versionSettings.js';
// ... 版本 CRUD 端点留在此文件

const router = Router();

// 版本 CRUD
router.get('/', ...);
router.get('/:id', ...);
router.post('/', ...);
router.put('/:id', ...);
router.delete('/:id', ...);

// 子域路由挂载
router.use('/', versionBuildRouter);
router.use('/', versionRollbackRouter);
router.use('/', versionTagRouter);
router.use('/', versionCompareRouter);
router.use('/', versionScreenshotRouter);
router.use('/', versionSummaryRouter);
router.use('/', versionBumpRouter);
router.use('/', versionSettingsRouter);

export default router;
```

### Step 5：移除顶层迁移执行（0.5h）

删除 `version.ts` 顶部的 `runMigrations()`，改到 `server/src/index.ts` 中统一执行：

```typescript
// server/src/index.ts - 在路由注册之前
import { runMigrations } from './db/migrations/run.js';
runMigrations();
```

### Step 6：验证（1h）

1. 所有原有端点请求路径不变
2. 运行现有测试确保通过
3. 手动测试关键端点

---

## 5. 涉及文件清单

### 新建

| 文件 | 预估行数 |
|------|---------|
| `server/src/routes/versionBuild.ts` | ~200 |
| `server/src/routes/versionRollback.ts` | ~200 |
| `server/src/routes/versionTag.ts` | ~200 |
| `server/src/routes/versionCompare.ts` | ~100 |
| `server/src/routes/versionScreenshot.ts` | ~150 |
| `server/src/routes/versionSummary.ts` | ~100 |
| `server/src/routes/versionBump.ts` | ~150 |
| `server/src/routes/versionSettings.ts` | ~100 |
| `server/src/services/versionSettingsStore.ts` | ~30 |

### 修改

| 文件 | 改动 |
|------|------|
| `server/src/routes/version.ts` | 从 2305 行缩减到 ~200 行（仅 CRUD + 聚合） |
| `server/src/models/version.ts` | 补充完整类型定义 |
| `server/src/index.ts` | 迁移 `runMigrations()` 到此处 |

---

## 6. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | `version.ts` 不超过 300 行 | `wc -l` |
| 2 | 所有版本相关 API 端点路径不变 | 对比拆分前后的路由表 |
| 3 | 无循环依赖 | `npx madge --circular server/src/routes/` |
| 4 | 所有现有测试通过 | `npm test` |
| 5 | `runMigrations()` 不在路由文件中执行 | grep 检查 |
| 6 | 类型定义在 `models/version.ts` 中 | grep `export interface Version` |
