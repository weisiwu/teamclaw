# package.json 脚本说明

> 前后端 `package.json` 中所有 npm scripts 的用途说明。

---

## 前端 package.json

路径：`package.json`（项目根目录）

### 开发相关

| 脚本 | 命令 | 说明 |
|------|------|------|
| `dev` | `next dev` | 启动 Next.js 开发服务器（热重载） |
| `dev:all` | `bash scripts/dev.sh` | 一键启动完整开发环境（Docker + 前后端） |
| `dev:backend` | `bash scripts/dev.sh --backend` | 仅启动后端服务 |
| `dev:frontend` | `bash scripts/dev.sh --frontend` | 仅启动前端服务 |
| `dev:stop` | `bash scripts/dev.sh --stop` | 停止所有开发服务 |
| `dev:status` | `bash scripts/dev.sh --status` | 查看开发服务状态 |

### 构建与部署

| 脚本 | 命令 | 说明 |
|------|------|------|
| `build` | `next build` | 构建生产环境 Next.js 应用 |
| `start` | `next start` | 启动生产环境 Next.js（需先 build） |
| `dev:stop` | `bash scripts/dev.sh --stop` | 停止开发服务 |

### 代码质量

| 脚本 | 命令 | 说明 |
|------|------|------|
| `lint` | `next lint` | 运行 ESLint 检查代码 |
| `format` | `prettier --write .` | 用 Prettier 格式化所有代码 |
| `format:check` | `prettier --check .` | 检查代码格式是否符合 Prettier 规范 |

### 测试

| 脚本 | 命令 | 说明 |
|------|------|------|
| `test` | `vitest` | 运行 Vitest 单元/集成测试 |
| `test:ui` | `vitest --ui` | 运行 Vitest 并打开浏览器 UI |
| `test:coverage` | `vitest --coverage` | 运行测试并生成覆盖率报告 |

### Git Hooks

| 脚本 | 命令 | 说明 |
|------|------|------|
| `prepare` | `husky` | 安装 Git Hooks（首次 `npm install` 时自动触发） |

---

## 后端 package.json

路径：`server/package.json`

### 开发相关

| 脚本 | 命令 | 说明 |
|------|------|------|
| `dev` | `tsx watch src/index.ts` | 启动 Express 开发服务器（热重载） |

> `tsx` 是 TypeScript 执行器，支持热重载，适合开发调试。

### 构建与部署

| 脚本 | 命令 | 说明 |
|------|------|------|
| `build` | `tsc --noEmit false --skipLibCheck \|\| true && node fix-esm-extensions.cjs` | 编译 TypeScript 到 `dist/` 目录 |
| `start` | `node dist/index.js` | 启动生产环境 Express 服务器（需先 build） |

### 测试

| 脚本 | 命令 | 说明 |
|------|------|------|
| `test` | `NODE_OPTIONS=--experimental-vm-modules jest` | 运行 Jest 测试（ESM 模式） |
| `test:watch` | `NODE_OPTIONS=--experimental-vm-modules jest --watch` | 监听模式运行测试 |
| `test:coverage` | `NODE_OPTIONS=--experimental-vm-modules jest --coverage` | 运行测试并生成覆盖率报告 |

---

## 快捷使用示例

```bash
# 开发
npm run dev                    # 前端热重载开发
npm run dev:all                # 完整开发环境

# 构建
npm run build                  # 前端构建（Next.js）
cd server && npm run build     # 后端编译（TypeScript → dist/）

# 生产启动
npm run start                  # 前端（需先 npm run build）
cd server && npm run start     # 后端（需先 npm run build）

# 代码质量
npm run lint                   # ESLint 检查
npm run format                 # 代码格式化
npm run format:check           # 检查格式

# 测试
npm run test                   # 前端测试
cd server && npm run test      # 后端测试
npm run test:coverage          # 前端覆盖率
```

---

## husky + lint-staged

项目配置了 Git Hooks（通过 husky），提交前自动执行格式化：

- **`pre-commit` hook**：自动对暂存的 `.js/.jsx/.ts/.tsx` 文件执行 `prettier --write` + `eslint --fix`

```bash
# 安装 hooks
npm run prepare

# 手动触发 pre-commit
npx lint-staged
```

提交时 lint-staged 会自动格式化代码，无需手动运行 `npm run format`。

---

## 环境变量要求

| 脚本 | 需要的最小环境变量 |
|------|-------------------|
| `dev` | `DATABASE_URL`, `REDIS_URL`, `CHROMA_URL` |
| `build` | `NEXT_TELEMETRY_DISABLED=1`（可选，禁用遥测） |
| `start` | 无（从 `.env` 读取） |
| `dev:all` | `.env` 或 `.env.example` |
