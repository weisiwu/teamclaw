# Teamclaw

Teamclaw 是一个现代化的团队协作平台，提供项目管理、文档协作和团队沟通功能。

## 功能特性

- 📊 **项目管理** - 看板、甘特图、里程碑追踪
- 📝 **文档协作** - 实时 Markdown 编辑、版本控制
- 🤝 **团队协作** - 任务分配、进度同步、通知中心
- 📈 **数据分析** - 可视化报表、团队效能分析

## 技术栈

- **框架**: [Next.js 14](https://nextjs.org/) (App Router)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **状态管理**: [Zustand](https://zustand-demo.pmnd.rs/)
- **数据获取**: [TanStack Query](https://tanstack.com/query)
- **测试**: [Vitest](https://vitest.dev/)
- **容器**: Docker + Docker Compose

## 快速开始

### 环境要求

- Node.js 20.x+
- npm 10.x+

### 本地开发

1. 克隆仓库：

```bash
git clone https://github.com/weisiwu/teamclaw.git
cd teamclaw
```

2. 安装依赖：

```bash
npm install
```

3. 配置环境变量：

```bash
cp .env.example .env.local
# 编辑 .env.local 填入必要的环境变量
```

4. 启动开发服务器：

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

### Docker 部署

使用 Docker Compose 一键启动：

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 项目结构

```
teamclaw/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   └── ...
├── components/             # React 组件
│   └── ui/                # UI 组件 (shadcn)
├── lib/                    # 工具函数和配置
│   ├── api/               # API 封装
│   ├── env.ts             # 环境变量
│   └── utils.ts           # 工具函数
├── hooks/                  # 自定义 Hooks
├── tests/                  # 测试文件
├── docs/                   # 项目文档
├── public/                 # 静态资源
├── .env.example            # 环境变量示例
├── .eslintrc.json          # ESLint 配置
├── .prettierrc             # Prettier 配置
├── next.config.js          # Next.js 配置
├── tailwind.config.ts      # Tailwind 配置
├── vitest.config.ts        # Vitest 配置
├── Dockerfile              # Docker 构建配置
└── docker-compose.yml      # Docker Compose 配置
```

## 可用脚本

```bash
# 开发
npm run dev              # 启动开发服务器

# 构建
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 代码质量
npm run lint             # 运行 ESLint
npm run format           # 格式化代码
npm run format:check     # 检查代码格式

# 测试
npm run test             # 运行测试
npm run test:coverage    # 生成测试覆盖率报告

# 准备
npm run prepare          # 安装 Husky hooks
```

## 开发规范

- **代码风格**: Prettier + ESLint
- **提交规范**: [Conventional Commits](https://www.conventionalcommits.org/)
- **Git Hooks**: Husky + lint-staged

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 文档

- [技术规范](./TECH_SPEC.md) - 项目技术架构和设计文档
- [API 文档](./docs/api.md) - API 接口文档

## 贡献

我们欢迎所有形式的贡献！请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何参与。

## 许可证

[MIT](./LICENSE)

---

<p align="center">Made with ❤️ by Teamclaw Team</p>
