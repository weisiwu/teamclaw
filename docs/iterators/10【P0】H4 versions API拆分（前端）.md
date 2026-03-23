# 【P0】H4 versions API 拆分（前端）

> 优先级：P0（高）
> 前置依赖：H3（后端路由拆分）同步或之后进行 · 关联任务：H3

---

## 1. 问题描述

`lib/api/versions.ts` 是前端最大的单文件：

- **文件大小**：96KB / 3231 行
- **内容混杂**：API 调用函数、React Query hooks、本地状态管理（`versionSettings` 模块级变量）、工具函数
- **import 爆炸**：单行 import 从 `types.ts` 导入 50+ 个类型

### 直接影响

- IDE 编辑卡顿（96KB 单文件）
- 任何版本相关改动都要在 3000+ 行中定位
- tree-shaking 效果差——引用一个函数可能拉入整个文件
- 无法为单个功能域做代码审查

---

## 2. 当前文件结构分析

`lib/api/versions.ts` 内容分布：

| 行范围（估算） | 内容 | 行数 |
|---------------|------|------|
| 1-60 | import + 本地 settings 状态 | 60 |
| 60-400 | 版本 CRUD API（get, list, create, update, delete） | 340 |
| 400-800 | 构建相关 API（trigger, retry, config, artifacts） | 400 |
| 800-1200 | Tag 管理 API（create, list, delete, auto-tag） | 400 |
| 1200-1600 | 回退 API（preview, execute, history） | 400 |
| 1600-1900 | 版本对比 API | 300 |
| 1900-2200 | 截图管理 API | 300 |
| 2200-2500 | 摘要 API | 300 |
| 2500-2800 | Bump + 设置 API | 300 |
| 2800-3231 | React Query hooks（useVersions, useBuild 等） | 431 |

---

## 3. 目标状态

与后端 H3 对齐，拆分为功能域文件：

```
lib/api/
├── versions.ts              # 版本 CRUD（缩减到 ~300 行）
├── versionBuild.ts          # 构建相关 API + hooks
├── versionRollback.ts       # 回退相关 API + hooks
├── versionTag.ts            # Tag 相关 API + hooks
├── versionCompare.ts        # 版本对比 API + hooks
├── versionScreenshot.ts     # 截图管理 API + hooks
├── versionSummary.ts        # 版本摘要 API + hooks
├── versionSettings.ts       # 版本设置 + Bump API + hooks
└── versionShared.ts         # 共享常量（API_BASE）和工具函数
```

---

## 4. 实现步骤

### Step 1：创建共享模块 `versionShared.ts`（0.5h）

提取公共依赖：

```typescript
// lib/api/versionShared.ts
export const API_BASE = '/api/v1';

// 统一的 fetch + JSON 解析
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || `API error: ${res.status}`);
}
```

### Step 2：逐域拆分（4h）

每个子文件遵循统一结构：

```typescript
// 1. import 类型
import { XxxType } from './types';
import { API_BASE, apiFetch } from './versionShared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 2. 纯 API 函数（Promise-based）
export async function getXxx(): Promise<XxxType> { ... }
export async function createXxx(data: CreateXxxRequest): Promise<XxxType> { ... }

// 3. React Query hooks
export function useXxx() {
  return useQuery({ queryKey: ['xxx'], queryFn: getXxx });
}
export function useCreateXxx() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createXxx, onSuccess: () => qc.invalidateQueries({ queryKey: ['xxx'] }) });
}
```

#### 拆分对照表

| 新文件 | 包含的 API 函数 | 包含的 hooks |
|-------|----------------|-------------|
| `versions.ts` | `getVersions`, `getVersion`, `createVersion`, `updateVersion`, `deleteVersion` | `useVersions`, `useVersion`, `useCreateVersion` 等 |
| `versionBuild.ts` | `triggerBuild`, `retryBuild`, `getBuildConfig`, `listArtifacts`, `downloadArtifact`, `deleteArtifacts`, `importArtifacts`, `getArtifactsSize` | `useBuild`, `useBuildConfig`, `useArtifacts` 等 |
| `versionRollback.ts` | `getRollbackPreview`, `getRollbackTargets`, `executeRollback`, `getRollbackHistory` | `useRollbackPreview`, `useRollbackHistory` 等 |
| `versionTag.ts` | `getTags`, `createTag`, `deleteTag`, `autoCreateTag` | `useTags`, `useCreateTag` 等 |
| `versionCompare.ts` | `compareVersions`, `quickCompare` | `useVersionCompare` 等 |
| `versionScreenshot.ts` | `getScreenshots`, `uploadScreenshot`, `linkScreenshot`, `deleteScreenshot` | `useScreenshots` 等 |
| `versionSummary.ts` | `getSummary`, `generateSummary`, `editSummary` | `useVersionSummary` 等 |
| `versionSettings.ts` | `getVersionSettings`, `updateVersionSettings`, `getBumpHistory`, `triggerAutoBump`, `manualBump` | `useVersionSettings`, `useBumpHistory` 等 |

### Step 3：更新 import 路径（1h）

全局搜索所有从 `lib/api/versions` 导入的组件/页面，更新 import 路径：

```bash
# 查找所有引用
grep -rn "from.*['\"].*lib/api/versions" app/ components/ hooks/ --include="*.ts" --include="*.tsx"
```

常见需要更新的文件模式：

| 页面/组件 | 原 import | 新 import |
|----------|-----------|----------|
| `app/versions/page.tsx` | `from '@/lib/api/versions'` | `from '@/lib/api/versions'`（CRUD 保持不变） |
| `app/versions/[id]/build/page.tsx` | `from '@/lib/api/versions'` | `from '@/lib/api/versionBuild'` |
| `app/versions/[id]/rollback/page.tsx` | `from '@/lib/api/versions'` | `from '@/lib/api/versionRollback'` |
| `components/version/TagManager.tsx` | `from '@/lib/api/versions'` | `from '@/lib/api/versionTag'` |

### Step 4：添加 barrel export（可选，0.5h）

如果不想大面积改 import 路径，可在 `versions.ts` 中 re-export：

```typescript
// lib/api/versions.ts（底部）
export * from './versionBuild';
export * from './versionRollback';
export * from './versionTag';
export * from './versionCompare';
export * from './versionScreenshot';
export * from './versionSummary';
export * from './versionSettings';
```

> 注意：barrel export 会降低 tree-shaking 效果，建议仅作为过渡方案。

### Step 5：清理本地状态（0.5h）

当前文件顶部有模块级状态：

```typescript
let versionSettings: VersionSettings = { ... };
```

移到 `versionSettings.ts` 中，或改用 Zustand store（推荐）。

---

## 5. 涉及文件清单

### 新建

| 文件 | 预估行数 |
|------|---------|
| `lib/api/versionShared.ts` | ~30 |
| `lib/api/versionBuild.ts` | ~400 |
| `lib/api/versionRollback.ts` | ~300 |
| `lib/api/versionTag.ts` | ~300 |
| `lib/api/versionCompare.ts` | ~200 |
| `lib/api/versionScreenshot.ts` | ~250 |
| `lib/api/versionSummary.ts` | ~200 |
| `lib/api/versionSettings.ts` | ~300 |

### 修改

| 文件 | 改动 |
|------|------|
| `lib/api/versions.ts` | 从 3231 行缩减到 ~300 行 |
| 所有引用 `versions.ts` 的页面和组件 | 更新 import 路径 |

---

## 6. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | `lib/api/versions.ts` 不超过 400 行 | `wc -l` |
| 2 | 每个子文件不超过 500 行 | `wc -l lib/api/version*.ts` |
| 3 | 所有页面功能正常（构建、回退、Tag 等） | 浏览器手动测试 |
| 4 | `npm run build` 无 TypeScript 错误 | 构建输出 |
| 5 | 无未使用的 export | ESLint 检查 |
| 6 | React Query hooks 缓存失效正常工作 | 操作后列表自动刷新 |
