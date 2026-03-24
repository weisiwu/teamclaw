# TeamClaw package.json 脚本说明

本文档详细介绍 `package.json` 中定义的 npm 脚本及其用途。

---

## 开发脚本

### `npm run dev`

启动 Next.js 开发服务器。

```bash
# 功能
- 启动前端开发服务器（默认端口 3000）
- 启用热重载（HMR）
- 自动编译 TypeScript

# 适用场景
- 单独开发前端页面
- 调试 UI 组件
```

### `npm run dev:all`

同时启动前后端开发服务器。

```bash
# 功能
- 启动后端 Express 服务（端口 9700）
- 启动前端 Next.js 服务（端口 3000）
- 使用 tmux/screen 管理多个进程

# 适用场景
- 全栈功能开发
- 集成测试

# 依赖
# 需要安装 tmux 或 screen
```

### `npm run dev:backend`

仅启动后端开发服务器。

```bash
# 功能
- 启动 Express 服务（端口 9700）
- 启用 ts-node-dev 热重载
- 自动执行数据库迁移

# 适用场景
- 后端 API 开发
- 数据库调试
```

### `npm run dev:frontend`

仅启动前端开发服务器。

```bash
# 功能
- 启动 Next.js 开发服务器
- 代理 API 请求到 localhost:9700

# 适用场景
- 纯前端开发
- UI 调试
```

### `npm run dev:stop`

停止所有开发服务。

```bash
# 功能
- 停止所有 tmux/screen 会话
- 清理进程

# 适用场景
- 开发结束清理
- 重启前准备
```

### `npm run dev:status`

查看开发服务运行状态。

```bash
# 输出示例
Frontend: Running (PID 12345) - http://localhost:3000
Backend:  Running (PID 12346) - http://localhost:9700
```

---

## 构建脚本

### `npm run build`

构建生产环境代码。

```bash
# 功能
- 编译 Next.js 前端代码
- 生成静态资源
- 输出到 .next/ 目录

# 前置条件
- 安装所有依赖
- 配置环境变量

# 输出
.next/
├── server/
├── static/
├── cache/
└── ...
```

### `npm start`

启动生产环境服务器。

```bash
# 功能
- 启动 Next.js 生产服务器
- 使用 .next/ 目录中的构建产物

# 环境变量
PORT=3000  # 可覆盖

# 适用场景
- 生产环境部署
- 性能测试
```

---

## 代码质量脚本

### `npm run lint`

运行 ESLint 代码检查。

```bash
# 功能
- 检查 TypeScript/JavaScript 代码规范
- 使用 Next.js 默认规则

# 输出
✔ No ESLint warnings or errors
# 或
✖ X problems (X errors, X warnings)

# 修复
npm run lint -- --fix  # 自动修复
```

### `npm run format`

格式化代码。

```bash
# 功能
- 使用 Prettier 格式化所有文件
- 包含：ts/tsx/js/jsx/json/md/css

# 配置
.prettierrc  # 格式规则
```

### `npm run format:check`

检查代码格式（不修改文件）。

```bash
# 功能
- 验证代码是否符合 Prettier 格式
- CI 中使用，不通过则构建失败

# 适用场景
- GitHub Actions 检查
- 提交前验证
```

### 代码提交前自动格式化

项目配置了 `lint-staged`，在 Git 提交前自动运行：

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --fix"],
    "*.{json,md,mdx,css}": ["prettier --write"]
  }
}
```

---

## 测试脚本

### `npm test`

运行测试套件。

```bash
# 功能
- 使用 Vitest 运行所有测试
- 默认 watch 模式（开发时）
- CI 环境自动使用 run 模式

# 输出示例
 ✓ tests/routes/health.test.ts (14 tests)
 ✓ tests/models/buildRecord.test.ts (19 tests)
 ...
 Test Files  19 passed (19)
 Tests       340 passed (340)
```

### `npm run test:ui`

启动 Vitest UI 界面。

```bash
# 功能
- 打开浏览器测试界面
- 可视化查看测试结果
- 支持过滤和调试

# 访问
http://localhost:51204/__vitest__/
```

### `npm run test:coverage`

生成测试覆盖率报告。

```bash
# 功能
- 生成代码覆盖率统计
- 输出到 coverage/ 目录

# 报告类型
- HTML: coverage/index.html
- LCOV: coverage/lcov.info
- 终端摘要

# 配置
vitest.config.ts:
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html']
  }
```

---

## Git Hooks

### `npm run prepare`

安装 Husky Git hooks。

```bash
# 功能
- 初始化 Husky
- 安装 Git hooks
- 在 npm install 后自动运行

# 配置的 hooks
.husky/
├── pre-commit     # 提交前运行 lint-staged
└── commit-msg     # 校验提交信息格式
```

---

## 脚本使用速查

### 日常开发

```bash
# 开始工作
npm run dev:all           # 启动所有服务

# 代码修改后
npm run format            # 格式化代码
npm run lint              # 检查代码
npm test                  # 运行测试

# 结束工作
npm run dev:stop          # 停止服务
```

### 生产部署

```bash
# 部署前检查
npm run lint
npm run format:check
npm test -- --run         # 非交互式测试

# 构建
npm ci --legacy-peer-deps # 安装依赖
npm run build             # 构建前端

# 启动
npm start                 # 或 pm2/docker
```

### 调试诊断

```bash
# 检查环境
npm run dev:status        # 服务状态

# 清理
rm -rf node_modules .next
npm ci --legacy-peer-deps

# 完整重建
npm ci && npm run build
```

---

## 自定义脚本示例

可在 `package.json` 中添加自定义脚本：

```json
{
  "scripts": {
    "db:migrate": "cd server && node dist/db/migrations/run.js",
    "db:seed": "node scripts/seed.js",
    "analyze": "ANALYZE=true npm run build",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf .next node_modules server/dist"
  }
}
```

---

## 故障排查

### 脚本执行失败

```bash
# 检查 Node.js 版本
node --version  # 需要 20+

# 清除缓存
npm cache clean --force

# 重新安装
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### 权限问题

```bash
# macOS/Linux
chmod +x scripts/*.sh

# Windows (Git Bash)
git config core.filemode false
```
