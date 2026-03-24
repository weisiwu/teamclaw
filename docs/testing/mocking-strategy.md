# Mock 策略说明

## 概述

本项目使用 Vitest 内置的 `vi` API 进行 Mock，涵盖以下场景：
- React 组件中的 API 模块
- Express 路由中的数据库模型
- 外部第三方服务
- Node.js 内置模块

## Mock 工具：`vi` API

Vitest 的 `vi` 等价于 Jest 的 `jest`，核心 API：

```typescript
import { vi, describe, it, expect } from 'vitest';

// vi.fn() — 创建 mock 函数
// vi.mock() — mock 模块
// vi.spyOn() — 包装对象方法
// vi.mocked() — 类型断言
```

## 1. Mock React 组件中的 API 模块

**场景**：组件调用 `lib/api/versions.ts` 中的函数，需要 mock 其返回值。

**文件**：`tests/components/ChangelogPanel.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChangelogPanel } from '../../components/versions/ChangelogPanel';

// 使用 vi.mock() mock 整个模块
vi.mock('../../lib/api/versions', () => ({
  saveVersionSummary: vi.fn().mockResolvedValue({
    id: 'summary-1',
    versionId: 'v-1',
  }),
}));

describe('ChangelogPanel', () => {
  it('should render changelog content', () => {
    render(
      <ChangelogPanel
        changelog={mockChangelog}
        onGenerate={vi.fn()}
        loading={false}
        generating={false}
      />
    );
    expect(screen.getByText('Fixed bug in login')).toBeInTheDocument();
  });
});
```

**原理**：`vi.mock()` 在模块加载阶段劫持 `import`，使测试文件中导入的是 mock 版本而非真实实现。

## 2. Mock 数据库（内存 Map）

**场景**：路由集成测试需要数据库数据，但不连接真实 PostgreSQL。

**文件**：`tests/routes/build.test.ts`

```typescript
// 在测试文件顶部定义内存 mock 数据
const mockBuildRecords = new Map([
  [
    'br-test-1',
    {
      id: 'br-test-1',
      versionId: 'v-test-1',
      status: 'success',
      triggeredBy: 'test-user',
      ...
    },
  ],
]);

// 重新实现 handler 逻辑，读取 mock 数据
function handleGetBuild(id: string) {
  const record = mockBuildRecords.get(id);
  if (!record) {
    return { status: 404, body: error(404, 'Build record not found') };
  }
  return { status: 200, body: success(record) };
}
```

**优点**：
- 不需要真实数据库
- 数据完全可控
- 测试间互不干扰

**缺点**：
- 需要在测试文件中重新实现 handler 逻辑（轻微重复）

## 3. Mock Express 中间件（使用 supertest）

**场景**：测试认证中间件的行为，不关心下游逻辑。

**文件**：`tests/middleware/auth.test.ts`

```typescript
import request from 'supertest';
import express from 'express';

// 创建最小 Express app，仅挂载被测中间件
function createTestApp(middleware: any, path = '/test') {
  const app = express();
  app.use(express.json());
  app.get(path, middleware, (_req, res) => {
    res.json({ success: true }); // mock 下游
  });
  app.use(unifiedErrorHandler);
  return app;
}

it('401 - 无 Token → 401', async () => {
  const app = createTestApp(requireAuth, '/test');
  const res = await request(app).get('/test');
  expect(res.status).toBe(401);
});
```

**原理**：下游用简单的 mock handler 替代，隔离测试范围。

## 4. Mock 整个模块（`vi.mock`）

**场景**：在测试中完全替换某个模块的实现。

```typescript
// mock 必须是工厂函数（不接受参数时）或字符串（自动 hoist）
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));
```

> ⚠️ **`vi.mock()` 是 hoisted**（自动提升到文件顶部），即使在 `describe` 块内调用也会在所有测试运行前执行。不能依赖运行时变量。

## 5. Mock 函数（`vi.fn()`）

```typescript
// 创建 mock 函数
const mockCallback = vi.fn();

// 设置返回值
mockCallback.mockReturnValue('result');

// 设置异步返回值
mockCallback.mockResolvedValue({ id: '1' });
mockCallback.mockRejectedValue(new Error('failed'));

// 记录调用次数和参数
mockCallback('arg1', 'arg2');
expect(mockCallback).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockCallback).toHaveBeenCalledTimes(1);
```

## 6. Spy on 对象方法（`vi.spyOn`）

```typescript
import fs from 'fs';

// 包装现有方法，保留原功能但可追踪
const spy = vi.spyOn(fs, 'readFileSync');

// 原有功能正常
const data = fs.readFileSync('test.txt', 'utf-8');

// 验证调用
expect(spy).toHaveBeenCalledWith('test.txt', 'utf-8');
expect(spy).toHaveBeenCalledTimes(1);

// 还原为原方法
spy.mockRestore();
```

## 7. TypeScript 类型 Mock

```typescript
// 告诉 TypeScript 这是一个 mock 函数（获得正确的类型提示）
const mockFn = vi.fn() as any as () => string;

// 或使用 vitest 内置的类型断言
const mockSave = vi.mocked(saveVersionSummary);
mockSave.mockResolvedValue({ id: '1' });
```

## 8. 环境变量 Mock

```typescript
// 在测试前设置环境变量
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, NODE_ENV: 'test' };
});

afterEach(() => {
  process.env = originalEnv;
});
```

## 9. `vi.mocked()` 类型守卫

```typescript
import { vi, expect, it } from 'vitest';

const mockFn = vi.fn();

it('type guard works', () => {
  mockFn('hello');
  expect(vi.mocked(mockFn)).toHaveBeenCalledWith('hello');
});
```

## Mock 策略总结

| 场景 | 方法 | 示例 |
|------|------|------|
| 替换 API 模块 | `vi.mock()` | `vi.mock('../../lib/api/versions')` |
| 模拟数据库 | 内存 `Map` | `mockBuildRecords.get(id)` |
| 测试中间件 | supertest + mock app | `createTestApp(middleware)` |
| mock 函数 | `vi.fn()` | `vi.fn().mockResolvedValue(...)` |
| 监控现有方法 | `vi.spyOn()` | `vi.spyOn(fs, 'readFileSync')` |
| 还原 mock | `mockRestore()` | `spy.mockRestore()` |

## 注意事项

1. **`vi.mock()` 必须位于文件顶部**（import 语句之后），Vitest 会 hoisting。
2. **不要 mock 所有东西**：优先使用自包含测试（内存数据），只有在调用无法重构时再用 `vi.mock()`。
3. **`--passWithNoTests`**：CI 中使用，确保空测试套件不导致失败。
4. **每个测试文件独立**：`mockBuildRecords` 等变量定义在测试文件内，不共享状态。
5. **异步 mock 要返回 Promise**：`vi.fn().mockResolvedValue()` 是异步 mock，组件测试中用于替代 API 调用。
