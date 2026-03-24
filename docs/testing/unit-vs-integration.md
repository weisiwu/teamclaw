# 单元测试 vs 集成测试

## 概念区分

| 维度 | 单元测试 (Unit Test) | 集成测试 (Integration Test) |
|------|---------------------|--------------------------|
| **目标** | 隔离验证单个函数/模块 | 验证多个模块协同工作 |
| **依赖** | 完全 mock 外部依赖 | 使用真实或半真实依赖 |
| **速度** | 极快（毫秒级） | 较慢（涉及 HTTP/DB） |
| **定位** | `tests/*.test.ts` | `tests/routes/`、`tests/middleware/` |
| **数据库** | Mock | 内存模拟或真实测试 DB |
| **HTTP 层** | 直接调用函数 | 使用 supertest 发真实 HTTP 请求 |
| **典型耗时** | < 50ms | 50ms ~ 500ms |

## 本项目的测试分层

```
┌─────────────────────────────────────────────────┐
│         单元测试 (tests/*.test.ts)               │  ← 纯函数、工具、Store
│  utils.test.ts, roles.test.ts, semver.test.ts  │
├─────────────────────────────────────────────────┤
│       组件测试 (tests/components/*.test.tsx)     │  ← React 组件渲染
│       ChangelogPanel.test.tsx                  │
├─────────────────────────────────────────────────┤
│       中间件测试 (tests/middleware/*.test.ts)    │  ← HTTP 层直接测试
│       auth.test.ts, errorHandler.test.ts       │
├─────────────────────────────────────────────────┤
│       集成测试 (tests/routes/*.test.ts)         │  ← 完整 HTTP 请求链
│       build.test.ts, versions.test.ts          │
├─────────────────────────────────────────────────┤
│         数据库测试 (tests/db/*.test.ts)          │  ← 数据持久化层
│         versions.test.ts                        │
└─────────────────────────────────────────────────┘
```

## 单元测试 — 适用场景

**原则**：不涉及 I/O（无文件、无网络请求、无数据库调用）的纯逻辑函数。

### 示例：工具函数测试

```typescript
// tests/utils.test.ts
import { cn } from '@/lib/utils';

it('deduplicates conflicting tailwind classes (last wins)', () => {
  const result = cn('text-red-500 text-blue-500');
  expect(result).toBe('text-blue-500');  // 直接测试函数返回值
});
```

### 示例：纯业务逻辑测试

```typescript
// tests/roles.test.ts
describe('Role Hierarchy', () => {
  it('admin inherits all permissions of user', () => {
    const adminPerms = getPermissions('admin');
    const userPerms = getPermissions('user');
    userPerms.forEach(perm => {
      expect(adminPerms).toContain(perm);  // 无任何 mock，直接验证逻辑
    });
  });
});
```

### 示例：Zustand Store 测试

```typescript
// tests/branch-store.test.ts
import { create } from 'zustand';
import { useBranchStore } from '@/lib/stores/branchStore';

it('selects active branch', () => {
  const store = create(useBranchStore);
  store.getState().selectBranch('feature-1');
  expect(store.getState().activeBranch).toBe('feature-1');  // 直接操作 store
});
```

### 单元测试特征

- ✅ 直接 `import` 被测函数/类
- ✅ 无 `supertest` / `request()`
- ✅ 无 `vi.mock()` 外部模块（但可以用 `vi.fn()` mock 内部依赖）
- ✅ 断言直接来自 `expect()`
- ✅ 执行速度 < 50ms

## 集成测试 — 适用场景

**原则**：验证"从 HTTP 请求到响应"的完整链路，涉及多个模块协作。

### 示例：路由集成测试

```typescript
// tests/routes/build.test.ts
import request from 'supertest';
import { createTestApp } from '../helpers/setup';
import { buildRouter } from '../../../server/src/routes/build';

const app = createTestApp('/api/v1/builds', buildRouter);

it('returns 404 when build not found', async () => {
  // 发送真实 HTTP 请求，模拟前端调用行为
  const res = await request(app).get('/api/v1/builds/br-nonexistent');
  expect(res.status).toBe(404);
  expect(res.body.code).toBe(404);
});
```

### 示例：中间件集成测试

```typescript
// tests/middleware/auth.test.ts
import request from 'supertest';
import { requireAuth } from '../../../server/src/middleware/auth';

it('401 - 无 Token 请求 → 401', async () => {
  const app = createTestApp(requireAuth, '/test');
  const res = await request(app).get('/test');
  expect(res.status).toBe(401);
});
```

### 集成测试特征

- ✅ 使用 `supertest` 发送 HTTP 请求
- ✅ 通过 `createTestApp()` / `createFullApp()` 挂载真实 Express Router
- ✅ 包含完整的中间件栈（认证、CORS、错误处理）
- ✅ 数据库操作使用**内存 mock**（`mockBuildRecords` Map）而非真实 DB
- ✅ 断言检查 `res.status` 和 `res.body` 结构

## Mock 策略在两类测试中的使用

### 单元测试中的 Mock

```typescript
// 用 vi.fn() mock 内部依赖函数
const mockFn = vi.fn().mockReturnValue('mocked');
```

### 集成测试中的 Mock

```typescript
// 路由测试中使用内存 Map 模拟数据库
const mockBuildRecords = new Map([
  ['br-test-1', { id: 'br-test-1', status: 'success', ... }],
]);

// 直接在测试文件中重新实现 handler 逻辑（不依赖真实 DB）
function handleGetBuild(id: string) {
  const record = mockBuildRecords.get(id);  // 读取内存 mock
  if (!record) return { status: 404, ... };
  return { status: 200, body: success(record) };
}
```

这种模式叫做 **"自包含测试"**（self-contained test）：在测试文件中重新实现被测函数所需的数据访问逻辑，不依赖外部服务。

## 何时写单元测试，何时写集成测试

```
是否需要测试 HTTP 层行为？
    │
    ├── 否 → 单元测试（tests/utils.test.ts, tests/roles.test.ts 等）
    │
    └── 是 →
            是否需要测试多个路由/中间件的协作？
                │
                ├── 否 → 中间件测试（tests/middleware/auth.test.ts）
                │
                └── 是 → 路由集成测试（tests/routes/*.test.ts）
```

## 测试文件位置参考

```
tests/
├── *.test.ts              # 单元测试（纯函数、store）
├── components/
│   └── *.test.tsx         # 组件测试（React 渲染）
├── middleware/
│   └── *.test.ts          # 中间件测试（supertest）
├── routes/
│   └── *.test.ts          # 集成测试（supertest + Router）
└── db/
    └── *.test.ts          # 数据库测试（集成）
```

## 注意事项

1. **不要混淆测试层次**：在单元测试中引入 `supertest` 或 `express` 是设计异味（smell），说明该测试应该移到对应目录。
2. **Mock 外部依赖**：API 客户端、数据库驱动、第三方 SDK 在单元测试中必须 mock，在集成测试中使用内存模拟。
3. **测试独立运行**：Vitest 默认并行运行测试，确保每个测试文件完全独立，不依赖执行顺序。
4. **CI 中的测试顺序**：CI workflow 先运行 `lint` → `test` → `build`，其中 `test` 独立运行，不依赖 `lint` 的结果。
