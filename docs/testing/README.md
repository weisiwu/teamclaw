# Testing Documentation

> ⚠️ 注意：本项目使用 **Vitest** 作为测试框架，而非 Jest。两者 API 高度兼容，但配置和运行方式有所不同。

## 目录

- [Vitest 配置说明](./vitest-configuration.md)
- [测试目录结构](./test-structure.md)
- [运行测试](./running-tests.md)
- [测试覆盖范围](./coverage.md)
- [单元测试 vs 集成测试](./unit-vs-integration.md)
- [Mock 策略](./mocking-strategy.md)
- [持续集成中的测试执行](./ci-integration.md)

---

## 快速开始

```bash
# 安装依赖（若尚未安装）
npm ci --legacy-peer-deps

# 运行所有测试
npm test

# 监听模式（文件变更自动重新运行）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# Vitest UI 可视化界面
npm run test:ui
```

---

## 测试文件组织概览

```
tests/
├── setup.ts                    # 全局测试环境配置
├── helpers/
│   ├── setup.ts               # Express app 工厂函数
│   └── auth.ts               # 认证测试辅助函数
├── components/                # React 组件测试
│   └── ChangelogPanel.test.tsx
├── db/                        # 数据库相关测试
│   └── versions.test.ts
├── middleware/                # Express 中间件测试
│   ├── auth.test.ts
│   └── errorHandler.test.ts
├── models/                    # 数据模型测试
│   └── buildRecord.test.ts
├── routes/                    # API 路由集成测试
│   ├── auth.test.ts
│   ├── build.test.ts
│   ├── build-stats.test.ts
│   ├── build-trigger.test.ts
│   ├── changelog.test.ts
│   ├── changelog-diff.test.ts
│   ├── chats.test.ts
│   ├── health.test.ts
│   ├── llm.test.ts
│   ├── message.test.ts
│   ├── messages.test.ts
│   ├── search.test.ts
│   ├── tag.test.ts
│   ├── task.test.ts
│   ├── tasks.test.ts
│   ├── version.test.ts
│   ├── version-id.test.ts
│   └── versions.test.ts
└── *.test.ts                  # 工具函数 / 核心逻辑单元测试
    ├── api-response.test.ts
    ├── apiTypes.test.ts
    ├── branch-store.test.ts
    ├── docs-lib.test.ts
    ├── docs.test.ts
    ├── env.test.ts
    ├── permissions.test.ts
    ├── priorityCalculator.test.ts
    ├── response.test.ts
    ├── roles.test.ts
    ├── semver.test.ts
    ├── taskStore.test.ts
    └── utils.test.ts
```

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 测试框架 | **Vitest** (`vitest ^4.1.0`) |
| React 测试 | `@testing-library/react ^16.3.2` |
| DOM 测试 | `@testing-library/jest-dom ^6.9.1` |
| HTTP 测试 | `supertest ^7.2.2` |
| 覆盖率 | `@vitest/coverage-v8 ^4.1.0` |
| UI 可视化 | `vitest --ui` |
| 运行环境 | `jsdom` |

## 关键约定

- **测试环境**：`jsdom`（模拟浏览器 DOM 环境）
- **全局 API**：Vitest 提供 `describe`/`it`/`expect` 等全局函数（`globals: true`）
- **路径别名**：`@/` 指向项目根目录，匹配 `tsconfig.json` 和 `vite/vitest` 配置
- **TypeScript**：所有测试文件均使用 `.ts` / `.tsx` 后缀，类型安全
- **Mock 策略**：路由测试使用内存数据模拟数据库；组件测试使用 `vi.mock()` 模拟 API 层
