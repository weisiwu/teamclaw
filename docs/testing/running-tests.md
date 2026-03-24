# 如何运行测试

## 快速参考

```bash
# 运行所有测试（一次性）
npm test

# 监听模式 — 文件变更自动重新运行
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# Vitest 可视化 UI（在浏览器中交互式运行测试）
npm run test:ui

# 运行特定测试文件
npx vitest run tests/utils.test.ts

# 运行匹配名称的测试
npx vitest run --grep "auth"

# 在指定端口打开 UI（默认 51204）
npm run test:ui -- --port 3001

# CI 模式（无交互，退出码指示成功/失败）
npx vitest run --passWithNoTests
```

## npm scripts 详解

| 命令 | Vitest 等价 | 说明 |
|------|------------|------|
| `npm test` | `npx vitest` | 交互模式（watch by default） |
| `npm run test:watch` | `npx vitest --watch` | 监听模式，文件变更自动重跑 |
| `npm run test:coverage` | `npx vitest --coverage` | 生成覆盖率报告 |
| `npm run test:ui` | `npx vitest --ui` | 浏览器可视化测试界面 |

> 💡 在 CI 环境中，`npm test` 实际执行 `npx vitest run --passWithNoTests`，确保即使没有测试文件也不会报错。

## package.json 相关配置

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## 常用 Vitest 运行参数

```bash
# 指定配置文件（使用非默认配置时）
npx vitest --config vitest.config.ts

# 指定测试目录（覆盖 include 配置）
npx vitest run tests/routes/

# 仅运行自上次提交以来有变更的文件
npx vitest --changed

# 指定浏览器环境（需要额外配置）
npx vitest --browser

# 并行运行（Vitest 默认并行，指定线程数）
npx vitest --pool=forks --poolOptions.forks=4

# 安静模式（减少输出）
npx vitest run --silent

# 显示完整打印（包含 console.log）
npx vitest run --reporter=verbose
```

## 覆盖率报告

```bash
npm run test:coverage
```

输出说明：

```
✓ tests/utils.test.ts ................ 5 passed
✓ tests/middleware/auth.test.ts ..... 12 passed
✓ tests/routes/build.test.ts ........ 18 passed
...

覆盖率摘要：
-----------|---------|----------|---------|---------|
 File       | % Stmts | % Branch | % Funcs | % Lines |
-----------|---------|----------|---------|---------|
 lib/utils  |  100.00 |   100.00 |  100.00 |  100.00 |
 server/... |   85.00 |   72.50 |   90.00 |   83.33 |
-----------|---------|----------|---------|---------|

HTML 报告：coverage/index.html
JSON 报告：coverage/coverage-summary.json
```

## Vitest UI 使用

```bash
npm run test:ui
```

启动后访问 `http://localhost:51204`（或指定端口），可在浏览器中：
- 查看所有测试套件和用例
- 点击运行单个测试
- 查看覆盖率热力图
- 检查失败的测试详情

## 在 IDE 中运行

### VS Code

安装 **Vitest** 扩展，或在 `.vscode/settings.json` 中配置：

```json
{
  "vitest.enabled": true,
  "vitest.command": "npm test --"
}
```

### WebStorm / IntelliJ

原生支持 Vitest：右键 `vitest.config.ts` → "Run" 或 "Debug"。

## 常见问题

### "Cannot find module 'xxx'" 或路径别名不生效

确保在项目根目录运行 `npm ci --legacy-peer-deps`，让 `vitest.config.ts` 中的 `resolve.alias` 配置生效。

### 测试挂起不退出

Vitest 监听模式默认等待。按 `Q` 退出，或使用 `npx vitest --watch=false`。

### Node 版本问题

```bash
# 推荐使用 Node 20
node --version  # 确认 >= 18
nvm use 20      # 切换版本（如使用 nvm）
```

### 覆盖率报告显示 0%

运行 `npm run test:coverage` 后检查 `coverage/` 目录是否存在。确认被测文件在 `vitest.config.ts` 的 `coverage.include` 范围内（默认已排除 `tests/` 自身）。
