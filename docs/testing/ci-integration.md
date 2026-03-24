# 持续集成中的测试执行

## CI 配置文件

```
teamclaw/
└── .github/workflows/
    ├── ci.yml        # 主 CI 工作流（lint → test → build）
    └── cd.yml        # 持续部署工作流
```

## CI 工作流结构（ci.yml）

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:           # ← Job 1: 静态检查
  test:           # ← Job 2: 单元测试
  build:          # ← Job 3: 构建（依赖 lint + test）
  docker:         # ← Job 4: Docker 构建（仅 push 到 main/develop 时）
```

## Job 执行顺序

```
push / pull_request
       │
       ▼
   ┌─────────┐
   │  lint   │  ──→ ESLint + TypeScript 类型检查
   └────┬────┘
        │
   ┌────▼────┐
   │  test   │  ──→ npm test（Vitest）
   └────┬────┘
        │
   ┌────▼────┐
   │  build  │  ──→ Next.js build + Server build
   └────┬────┘     (需要 lint 和 test 都通过)
        │
   ┌────▼────┐
   │  docker │  ──→ Docker build + push (仅 main/develop)
   └─────────┘
```

## 各 Job 详情

### Job 1：`lint`（ESLint + TypeScript）

```yaml
lint:
  name: Lint & Type Check
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js ${{ env.NODE_VERSION }}   # NODE_VERSION: "20"
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: "npm"

    - name: Install dependencies
      run: npm ci --legacy-peer-deps

    - name: Type check
      run: npx tsc --noEmit

    - name: ESLint
      run: npx eslint . --max-warnings 50
```

**目的**：在运行测试前提前发现类型错误和代码风格问题。

### Job 2：`test`（Vitest 测试）

```yaml
test:
  name: Unit Tests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js ${{ env.NODE_VERSION }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: "npm"

    - name: Install dependencies
      run: npm ci --legacy-peer-deps

    - name: Run tests
      run: npm test -- --passWithNoTests
```

**关键参数**：`--passWithNoTests`

确保在没有测试文件的情况下（理论上不应该发生），CI 不会报错退出。

**测试命令实际执行**：

```bash
npm test -- --passWithNoTests
# → npx vitest run --passWithNoTests
```

`--passWithNoTests` 在 CI 环境中相当于 `npx vitest run --passWithNoTests`（非 watch 模式，一次性运行完毕）。

**缓存策略**：`cache: "npm"` 自动缓存 `node_modules`，加快依赖安装。

### Job 3：`build`（构建）

```yaml
build:
  name: Build
  runs-on: ubuntu-latest
  needs: [lint, test]        # ← 依赖 lint 和 test 都成功
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      ...

    - name: Build Next.js
      run: npm run build
      env:
        NEXT_TELEMETRY_DISABLED: 1

    - name: Build Server
      run: |
        cd server && npm ci --legacy-peer-deps && npm run build

    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: build-artifacts
        path: |
          .next
          server/dist
          public
          package.json
          server/package.json
        retention-days: 7
```

**目的**：
1. 验证代码可正常构建
2. 将构建产物作为 artifact 上传，供后续 Docker Job 使用

### Job 4：`docker`（Docker 构建和推送）

```yaml
docker:
  name: Docker Build
  runs-on: ubuntu-latest
  needs: [build]             # ← 依赖 build 完成
  if: github.event_name == 'push' &&
     (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop')
  steps:
    - uses: actions/checkout@v4
    - uses: docker/setup-buildx-action@v3
    - uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    # ... build & push
```

**触发条件**：仅在 push 到 `main` 或 `develop` 分支时运行，不在 PR 时运行。

## 覆盖率报告在 CI 中的处理

当前 `ci.yml` 的 `test` Job **仅执行测试，未上传覆盖率报告**。

如需在 CI 中收集覆盖率，可添加：

```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov   # 示例
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/coverage-summary.json
    fail_ci_if_error: false
```

或生成 GitHub Actions 摘要：

```yaml
- name: Run tests
  run: npm run test:coverage -- --reporter=github-actions
```

## PR 检查行为

当提交 Pull Request 到 `main` 时：

| Job | 何时运行 | PR 中显示 |
|-----|---------|----------|
| `lint` | ✅ | ✅ type check + ESLint 结果 |
| `test` | ✅ | ✅ 测试通过/失败状态 |
| `build` | ✅（依赖满足后） | ✅ build 状态 |
| `docker` | ❌ | ❌ 不在 PR 时构建 |

## 修改 CI 配置的注意事项

1. **不要移除 `--passWithNoTests`**：它是防止空测试套件的 safety net
2. **Node 版本**：当前固定为 Node 20，与本地开发保持一致
3. **`--legacy-peer-deps`**：解决 `next@14` 与部分 devDependencies 的 peer 冲突
4. **`NEXT_TELEMETRY_DISABLED: 1`**：禁止 Next.js 在 build 时发送遥测数据
5. **Artifact 保留 7 天**：`retention-days: 7`，避免占用过多存储

## 本地模拟 CI 环境

```bash
# 模拟 CI 的 lint + test
npm run lint && npm test -- --passWithNoTests

# 模拟完整 CI 构建
npm run build && cd server && npm run build
```

## 常见 CI 失败排查

| 症状 | 常见原因 | 解决方式 |
|------|---------|---------|
| `test` Job 失败 | 测试用例写错 / mock 不当 | 本地运行 `npm test` 复现 |
| `lint` Job 失败 | ESLint 规则违规 | `npm run format` 自动修复格式 |
| `build` Job 失败 | TypeScript 错误 / 环境变量缺失 | `npx tsc --noEmit` 定位 |
| `docker` Job 失败 | `DOCKERHUB_TOKEN` secret 过期 | 更新 GitHub Secrets |
| `npm ci` 失败 | lock 文件与 package.json 不同步 | `npm install` 重新生成 lock |
