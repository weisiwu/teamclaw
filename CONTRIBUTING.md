# Contributing to Teamclaw

感谢您对 Teamclaw 项目的关注！我们欢迎任何形式的贡献。

## 开发环境准备

### 环境要求

- Node.js 20.x 或更高版本
- npm 10.x 或更高版本
- Git

### 本地开发

1. Fork 本仓库
2. 克隆您的 Fork 到本地：

```bash
git clone https://github.com/YOUR_USERNAME/teamclaw.git
cd teamclaw
```

3. 安装依赖：

```bash
npm install
```

4. 复制环境变量模板并配置：

```bash
cp .env.example .env.local
# 编辑 .env.local 填入您的配置
```

5. 启动开发服务器：

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 代码规范

### 代码格式

我们使用 Prettier 和 ESLint 来保证代码质量：

```bash
# 格式化代码
npm run format

# 检查代码格式
npm run format:check

# 运行 ESLint
npm run lint
```

### 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码风格修改（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：

```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve login redirect issue"
git commit -m "docs: update README with API docs"
```

### Pre-commit Hooks

本项目配置了 Husky + lint-staged，在提交前会自动运行代码检查和格式化。

## 测试

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 编写测试

- 测试文件放在 `tests/` 目录
- 测试文件命名：`*.test.ts` 或 `*.spec.ts`
- 使用 Vitest 作为测试框架

## 提交 PR

1. 创建功能分支：

```bash
git checkout -b feature/my-feature
```

2. 提交您的更改（遵循提交规范）
3. 确保所有测试通过
4. 推送到您的 Fork：

```bash
git push origin feature/my-feature
```

5. 创建 Pull Request

### PR 规范

- 清晰描述变更内容和原因
- 确保 CI 检查通过
- 关联相关的 Issue
- 保持 PR 范围聚焦，避免一次性修改过多内容

## 分支策略

- `main`: 主分支，保持可部署状态
- `develop`: 开发分支，集成新功能
- `feature/*`: 功能分支
- `fix/*`: 修复分支
- `hotfix/*`: 紧急修复分支

## 报告问题

### Bug 报告

如果您发现了 bug，请创建 Issue 并包含：

- 问题描述
- 复现步骤
- 期望行为
- 实际行为
- 运行环境（浏览器、操作系统等）
- 相关截图（如有）

### 功能请求

对于新功能请求：

- 清晰描述功能
- 说明使用场景
- 可能的实现方案

## 代码审查

所有代码变更都需要经过审查：

- 至少一名维护者审查通过
- 所有 CI 检查通过
- 无未解决的审查意见

## 许可证

提交 PR 即表示您同意将您的代码按照本项目的许可证进行授权。

## 联系我们

如有任何问题，欢迎通过以下方式联系：

- 在 GitHub 创建 Issue
- 加入我们的社区讨论

---

再次感谢您的贡献！
