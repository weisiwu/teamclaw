# Vitest 配置说明

> 本项目使用 **Vitest** 而非 Jest。以下为 `vitest.config.ts` 的完整说明。

## 配置文件位置

```
teamclaw/
└── vitest.config.ts          # ← 根目录
```

## 完整配置内容

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],                     // 支持 React JSX/TSX
  test: {
    globals: true,                         // 全局注入 describe/it/expect 等
    environment: "jsdom",                 // 浏览器 DOM 模拟环境
    setupFiles: ["./tests/setup.ts"],      // 每个测试文件运行前执行
    include: [
      "tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"
    ],
    exclude: ["node_modules", ".next", "dist"],
    coverage: {
      provider: "v8",                      // 使用 V8 内置覆盖率
      reporter: ["text", "json", "html"],  // 控制台 + JSON + HTML 报告
      exclude: [
        "node_modules",
        "tests",                          // 测试代码本身不计入覆盖率
        "**/*.d.ts",
        "**/*.config.*",
        "**/setup.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@/lib": path.resolve(__dirname, "./lib"),
      "@/components": path.resolve(__dirname, "./components"),
      "@/hooks": path.resolve(__dirname, "./hooks"),
      "@/app": path.resolve(__dirname, "./app"),
    },
  },
});
```

## 配置项详解

### `plugins: [react()]`

使用 `@vitejs/plugin-react` 支持 Next.js/React 的 JSX 转换，确保 `.tsx` 组件测试正常渲染。

### `test.globals: true`

Vitest 在每个测试文件中自动注入以下全局函数（无需 `import`）：

```typescript
describe, it, test, expect, spyOn,
beforeEach, afterEach, beforeAll, afterAll,
vi, type Mock
```

### `test.environment: "jsdom"`

使用 `jsdom` 模拟浏览器环境，提供 `window`、`document`、`DOM API`。  
组件测试需要此环境。路由测试（supertest + Express）不需要真实 DOM，但仍使用此配置保持一致。

### `test.setupFiles: ["./tests/setup.ts"]`

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
```

该文件在**每个测试文件运行前**执行一次，负责导入 `jest-dom` 匹配器（如 `toBeInTheDocument()`、`toHaveClass()` 等）。

### `test.include` / `test.exclude`

| 模式 | 说明 |
|------|------|
| `**/*.{test,spec}.ts` | 标准单元/集成测试 |
| `**/*.{test,spec}.tsx` | React 组件测试 |

排除：`node_modules`、`.next`（Next.js 构建产物）、`dist`。

### `coverage`

| 选项 | 说明 |
|------|------|
| `provider: "v8"` | 使用 V8 引擎内置代码覆盖率，比 istanbul 更高效 |
| `reporter: ["text", "json", "html"]` | 终端输出 + `coverage/coverage-summary.json` + `coverage/index.html` |
| `exclude` | 测试代码、类型声明、配置文件均不计入覆盖率 |

### `resolve.alias`

路径别名与 `tsconfig.json` 保持一致，确保测试时模块解析正确：

| 别名 | 实际路径 |
|------|---------|
| `@/` | `./`（项目根目录） |
| `@/lib` | `./lib` |
| `@/components` | `./components` |
| `@/hooks` | `./hooks` |
| `@/app` | `./app` |

## 测试环境要求

### Node.js 版本

- **最低版本**：`Node.js 18+`（推荐 `Node.js 20`，CI 使用 Node 20）
- 项目 `package.json` 中 `engines` 字段未强制声明，但 CI workflow 指定 `NODE_VERSION: "20"`

### 环境变量

测试默认使用 `.env.example` 中的变量，无需手动配置。涉及敏感操作的测试（如数据库写入）会使用内存模拟而非真实数据库。

### 安装依赖

```bash
npm ci --legacy-peer-deps
```

> ⚠️ `--legacy-peer-deps` 用于解决 `next@14` 与某些 peer dependency 的冲突。

## 添加新的测试配置文件

若需要在特定目录使用不同配置，可创建 `vitest.config.ts` 或 `vitest.config.js` 覆盖：

```typescript
// tests/routes/vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    // 仅针对 routes 目录
    include: ["tests/routes/**/*"],
  },
});
```

运行特定配置：
```bash
npx vitest --config tests/routes/vitest.config.ts
```
