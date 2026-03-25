# 【P1】M7 清除项目 Mock 数据

> 优先级：P1（中）
> 前置依赖：【P0】H1 数据存储统一到 PostgreSQL
> 关联规则：⚠️ 数据源要求 — 严格禁止使用 mock 数据或伪造数据，所有数据必须来自真实项目仓库

---

## 1. 问题描述

项目文档明确要求「严格禁止使用 mock 数据或伪造数据」，但当前代码中存在 **大量 mock/fake/硬编码数据**，分布在前端 API 层、后端服务层和组件层。这些数据导致：

- 前端页面展示的是伪造内容，无法验证真实功能
- 后端服务使用内存 Map + 种子数据，重启丢失
- 部分 API 在真实后端调用失败时静默回退到 mock，掩盖了真实 bug
- Token 统计服务启动时生成 30 天随机假数据，误导监控

---

## 2. Mock 数据全量清单

### 2.1 前端 API 层（`lib/api/`）— 最严重

| 文件 | Mock 类型 | 说明 |
|------|----------|------|
| `lib/api/versions.ts` | `mockVersions`、`mockBranches`、`mockSnapshots`、`mockReleaseLogs`、`mockVersionScreenshots`、`mockChangelogs`、`mockDownloadHistory` | **7 个 mock 数组**，版本管理全部数据都是伪造的。所有 API 函数在真实请求失败时 `catch` 后静默回退到 mock |
| `lib/api/tasks.ts` | `mockTasks`、`mockComments` | 任务列表和评论数据全量 mock，`let tasks = [...mockTasks]` 直接操作内存数组 |
| `lib/api/branches.ts` | `mockBranches` | 分支数据 mock，真实 API 失败后回退到 mock |
| `lib/api/tags.ts` | `mockTags` | Git Tag 数据 mock |

**典型问题模式**（`lib/api/versions.ts`）：

```typescript
export async function getVersions(...) {
  try {
    const res = await fetch('/api/v1/versions...');
    if (res.ok) return json.data;
  } catch {
    // Fall through to mock   ← 静默吞掉错误
  }
  await delay(50);
  return mockVersions;            // ← 返回假数据
}
```

### 2.2 后端服务层（`server/src/services/`）

| 文件 | Mock 类型 | 说明 |
|------|----------|------|
| `services/userService.ts` | `initSeedData()` + `userStore: Map` | 3 个硬编码用户（卫思伍、张三、李四），内存 Map 存储 |
| `services/tokenStatsService.ts` | `initFakeData()` | 启动时生成 30 天随机 Token 消耗假数据 |
| `services/cronService.ts` | `cronJobs: Map` | 定时任务内存存储 |
| `services/agentService.ts` | `agents: Map` | Agent 数据内存存储 |
| `services/agentExecution.ts` | `executionLogs: Map` | 执行记录内存存储 |
| `services/taskLifecycle.ts` | 内存 Map | 任务数据内存存储 |
| `services/messageQueue.ts` | 内存 Map | 消息队列内存存储 |
| `services/importOrchestrator.ts` | 内存 Map | 导入任务内存存储 |
| `services/branchService.ts` | 内存 Map | 分支数据内存存储 |
| `services/changeTracker.ts` | 内存 Map | 变更追踪内存存储 |
| `services/abilityService.ts` | 内存 Map | 辅助能力内存存储 |
| `services/tagService.ts` | 内存 Map | 标签内存存储 |
| `services/docFavorite.ts` | 内存 Map | 文档收藏内存存储 |
| `services/docVersion.ts` | 内存 Map | 文档版本内存存储 |
| `services/downloadManager.ts` | 内存 Map | 下载记录内存存储 |
| `services/searchService.ts` | 内存 Map | 搜索缓存内存存储 |
| `services/roleMemory.ts` | 内存 Map | 角色记忆内存存储 |

### 2.3 前端组件层（`components/`）

| 文件 | Mock 类型 | 说明 |
|------|----------|------|
| `components/versions/MessageSelector.tsx` | `mockMessages` | 25 条硬编码飞书消息，飞书未配置时展示 |
| `components/versions/BatchDownloadDialog.tsx` | 注释标注 `Mock batch download results` | 批量下载结果伪造 |
| `components/versions/BuildTriggerDialog.tsx` | 注释标注 `目前是 mock` | 构建触发结果伪造 |
| `components/branch/BranchCompareDialog.tsx` | `mockCompareData()` | 分支对比数据全量伪造 |

### 2.4 前端路由 API（`app/api/v1/`）

| 文件 | Mock 类型 | 说明 |
|------|----------|------|
| `app/api/v1/build/stats/route.ts` | 注释 `Mock data: replace with real DB` | 构建统计数据硬编码 |
| `app/api/v1/build/trigger/route.ts` | 注释 `Currently a mock implementation` | 构建触发状态始终返回 `building` |
| `app/settings/page.tsx` | `当前用户角色（mock）` | 用户角色硬编码为 admin |

### 2.5 后端路由层

| 文件 | Mock 类型 | 说明 |
|------|----------|------|
| `server/src/routes/feishu.ts` | 飞书未配置时返回 mock 数据 | 应改为明确错误提示 |
| `server/src/routes/version.ts` | 内存 Map 存储版本设置 | 应持久化到数据库 |
| `server/src/routes/tag.ts` | 内存 Map 存储标签 | 应持久化到数据库 |
| `server/src/routes/project.ts` | 内存 Map 存储项目 | 应持久化到数据库 |

---

## 3. 改造目标

| 层级 | 目标 |
|------|------|
| **前端 API 层** | 移除所有 `mock*` 数组和 `delay()` 模拟；API 调用失败时抛出错误而非静默回退 mock |
| **后端服务层** | 所有内存 Map 替换为 PostgreSQL 持久化（与 H1 任务联动） |
| **前端组件层** | 移除硬编码 mock 数据，改为真实 API 调用 + 空状态/错误态展示 |
| **种子数据** | 移到数据库迁移脚本中，仅在开发环境通过 `db-seed.sh` 插入 |
| **全局原则** | 未配置外部服务（飞书等）时，明确提示「未配置」而非静默展示假数据 |

---

## 4. 实现步骤

### Step 1：前端 API 层清理

**涉及文件**：`lib/api/versions.ts`、`lib/api/tasks.ts`、`lib/api/branches.ts`、`lib/api/tags.ts`

对每个文件执行：

1. **删除**所有 `mock*` 常量数组
2. **删除** `delay()` 模拟延迟函数
3. **删除** `let tasks = [...mockTasks]` 等内存操作
4. **修改** API 函数：移除 `catch` 中的 mock 回退，改为抛出错误

改造前（`lib/api/versions.ts`）：

```typescript
export async function getVersions(status, page, pageSize) {
  try {
    const res = await fetch('/api/v1/versions...');
    if (res.ok) return json.data;
  } catch {
    // Fall through to mock
  }
  await delay(50);
  return mockVersions; // 假数据
}
```

改造后：

```typescript
export async function getVersions(status, page, pageSize) {
  const res = await fetch(`/api/v1/versions?status=${status}&page=${page}&pageSize=${pageSize}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取版本列表失败 (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}
```

### Step 2：前端组件 Mock 清理

**涉及文件**：`MessageSelector.tsx`、`BatchDownloadDialog.tsx`、`BuildTriggerDialog.tsx`、`BranchCompareDialog.tsx`

1. `MessageSelector.tsx`：删除 `mockMessages` 数组和 `isUsingMock` 状态。飞书未配置时展示明确的配置引导 UI，而非模拟消息
2. `BranchCompareDialog.tsx`：删除 `mockCompareData()`，调用 `GET /api/v1/branches/compare` 真实 API
3. `BatchDownloadDialog.tsx`：删除 mock 注释，调用真实下载 API
4. `BuildTriggerDialog.tsx`：调用真实构建状态 API

### Step 3：后端假数据清理

**涉及文件**：`tokenStatsService.ts`、`userService.ts`

1. `tokenStatsService.ts`：**删除** `initFakeData()` 函数及其调用。Token 统计应来自真实 LLM 调用记录
2. `userService.ts`：**删除** `initSeedData()` 中的硬编码用户。种子数据移至数据库迁移脚本

### Step 4：种子数据迁移

**新建 `scripts/db-seed.sh`**：

```bash
#!/bin/bash
# 仅开发环境使用，插入初始测试数据

psql -h localhost -U teamclaw -d teamclaw <<SQL
INSERT INTO users (user_id, name, role, weight, wechat_id, feishu_id, remark, created_at)
VALUES
  ('user_001', '卫思伍', 'admin', 10, 'wxid_weisiwu', 'ou_da6b48690e83a478e3e3993ecc62da0e', '项目创始人', NOW())
ON CONFLICT (user_id) DO NOTHING;
SQL

echo "✅ 种子数据插入完成（仅新增，不覆盖已有数据）"
```

### Step 5：前端错误态和空状态补全

API 调用失败后不再有 mock 兜底，需要确保所有页面有正确的：

- **加载态**：Skeleton / Spinner
- **空状态**：「暂无数据」+ 引导操作
- **错误态**：错误信息 + 重试按钮

**涉及页面**：
- `app/versions/page.tsx` — 版本列表
- `app/tasks/page.tsx` — 任务列表
- `app/branches/page.tsx` — 分支列表
- `app/tags/page.tsx` — 标签列表
- `app/tokens/page.tsx` — Token 统计

### Step 6：未配置服务的明确提示

**涉及文件**：`server/src/routes/feishu.ts`、`components/versions/MessageSelector.tsx`

飞书等外部服务未配置时，返回明确的 `503 Service Not Configured` 响应：

```typescript
// server/src/routes/feishu.ts
if (!config) {
  return res.status(503).json(error(503, '飞书未配置，请在 .env 中设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET'));
}
```

### Step 7：前端路由 API Mock 清理

**涉及文件**：`app/api/v1/build/stats/route.ts`、`app/api/v1/build/trigger/route.ts`、`app/settings/page.tsx`

1. `build/stats/route.ts`：代理到 Express 后端 `GET /api/v1/builds/stats`
2. `build/trigger/route.ts`：代理到 Express 后端 `POST /api/v1/builds`
3. `settings/page.tsx`：从 auth context 获取真实用户角色

### Step 8：后端内存 Map 替换（与 H1 联动）

> 此步骤与【P0】H1 数据存储统一任务重叠。H1 完成后，本步骤自动完成。此处仅列出需替换的文件清单。

后端 **46 个文件** 使用内存 Map 存储数据，完整清单见上方 2.2 节。替换为 PostgreSQL 后，这些 mock 数据问题自然消除。

---

## 5. 涉及文件总览

### 必须修改（独立于 H1）

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `lib/api/versions.ts` | 删除 7 个 mock 数组，移除 mock 回退 |
| 修改 | `lib/api/tasks.ts` | 删除 mockTasks/mockComments，移除内存操作 |
| 修改 | `lib/api/branches.ts` | 删除 mockBranches，移除 mock 回退 |
| 修改 | `lib/api/tags.ts` | 删除 mockTags，移除 mock 回退 |
| 修改 | `components/versions/MessageSelector.tsx` | 删除 mockMessages + isUsingMock 逻辑 |
| 修改 | `components/branch/BranchCompareDialog.tsx` | 删除 mockCompareData()，接真实 API |
| 修改 | `components/versions/BatchDownloadDialog.tsx` | 删除 mock 注释，接真实 API |
| 修改 | `components/versions/BuildTriggerDialog.tsx` | 接真实构建 API |
| 修改 | `server/src/services/tokenStatsService.ts` | 删除 initFakeData() |
| 修改 | `server/src/services/userService.ts` | 删除 initSeedData()，种子数据移至脚本 |
| 修改 | `server/src/routes/feishu.ts` | 未配置时返回 503 而非 mock |
| 修改 | `app/api/v1/build/stats/route.ts` | 代理到真实后端 |
| 修改 | `app/api/v1/build/trigger/route.ts` | 代理到真实后端 |
| 修改 | `app/settings/page.tsx` | 从 auth context 获取角色 |
| 新建 | `scripts/db-seed.sh` | 开发环境种子数据脚本 |

### 依赖 H1 完成后处理

后端 46 个使用内存 Map 的 service/route 文件（详见 2.2 节），在 H1 完成数据库迁移后统一替换。

---

## 6. 统计

| 类别 | 数量 |
|------|------|
| 前端 mock 数据数组 | **12 个** |
| 后端内存 Map 存储 | **46 个文件** |
| 后端假数据生成函数 | **2 个**（initFakeData、initSeedData） |
| 前端组件 mock | **4 个组件** |
| 前端路由 API mock | **3 个路由** |
| 需修改文件（独立于 H1） | **15 个** |

---

## 7. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | `grep -r "mock" lib/api/ components/ app/` 无 mock 数据数组（测试文件除外） | 终端执行 |
| 2 | `grep -r "initFakeData\|initSeedData" server/src/` 无假数据初始化函数 | 终端执行 |
| 3 | 前端 API 调用失败时抛出错误，不静默回退假数据 | 关闭后端后访问页面，验证错误提示 |
| 4 | 所有页面有正确的加载态、空状态、错误态 | 浏览器截图 |
| 5 | Token 统计页面启动后为空（无假数据），真实调用 LLM 后才有记录 | 浏览器检查 |
| 6 | 飞书未配置时页面展示「未配置」提示而非模拟消息 | 浏览器检查 |
| 7 | `scripts/db-seed.sh` 可为开发环境插入初始数据 | 终端执行 |
| 8 | 种子数据脚本幂等（多次执行无报错，不产生重复数据） | 多次执行验证 |
| 9 | 用户角色从认证上下文获取，非硬编码 admin | 切换账号验证 |
