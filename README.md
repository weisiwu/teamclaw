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
cp server/.env.example server/.env
# 编辑 server/.env 填入必要的环境变量
```

**必需变量**（server/.env 中）：
- `DATABASE_URL` — PostgreSQL 连接字符串（使用外部数据库或 Docker 时由 setup-db.sh 自动配置）
- `REDIS_URL` — Redis 连接地址（默认 `redis://localhost:6379`，无需修改）
- `JWT_SECRET` — JWT 签名密钥（生产环境务必更换，开发环境可用默认值）

4. 初始化数据库（PostgreSQL）：

```bash
# 方式 A（默认）：启动 Docker DB → 创建数据库 → 运行迁移
# 前提：DATABASE_URL 已配置（Docker 模式会覆盖为本地连接字符串）
./scripts/setup-db.sh

# 方式 B：使用外部已存在的 PostgreSQL
# 前提：DATABASE_URL 指向外部数据库
./scripts/setup-db.sh --external

# 方式 C：重置数据库（删除重建，适合开发中彻底刷新）
./scripts/setup-db.sh --reset

# 方式 D：预检模式（检查配置，不执行写入）
./scripts/setup-db.sh --dry-run

# 查看完整帮助
./scripts/setup-db.sh --help
```

5. 启动开发服务器：

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

### 默认账号

| 用途 | 用户名 | 密码 |
|------|--------|------|
| 前端登录 | `admin` | `admin123` |
| PostgreSQL 数据库 | `teamclaw` | `password` |

- 数据库连接串：`postgresql://teamclaw:password@localhost:5432/teamclaw`
- Redis：`redis://localhost:6379`（无密码）

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

## 故障排查

### 数据库连接失败

```bash
# 1. 检查 Docker 是否运行
docker ps | grep postgres

# 2. 检查 DATABASE_URL 环境变量
echo $DATABASE_URL

# 3. 查看容器日志
docker logs teamclaw-postgres

# 4. 重新初始化
./scripts/setup-db.sh --reset
```

常见原因：
- **Docker 未启动**：启动 Docker Desktop 后重试
- **端口被占用**：`lsof -i :5432` 检查 5432 端口
- **DATABASE_URL 格式错误**：应为 `postgresql://user:password@host:port/dbname`
- **数据库不存在**：运行 `./scripts/setup-db.sh` 创建
- **外部数据库连接失败**（--external 模式）：运行 `./scripts/setup-db.sh --dry-run` 预检

### 使用外部数据库（--external 模式）

```bash
# 1. 预检（不执行写入操作）
./scripts/setup-db.sh --dry-run

# 2. 设置 DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:port/dbname"

# 3. 连接外部数据库
./scripts/setup-db.sh --external

# 4. 验证连接
./scripts/setup-db.sh --dry-run
```

DATABASE_URL 格式必须为：`postgresql://用户名:密码@主机:端口/数据库名`
示例：`postgresql://teamclaw:password@192.168.1.100:5432/teamclaw`

### 迁移失败

```bash
# 手动运行迁移
cd server && npx tsx src/db/migrations/run.ts

# 查看迁移日志
cat /tmp/migration.log
```

### 端口占用

```bash
# 检查端口占用
lsof -i :3000  # 前端
lsof -i :9700  # 后端

# 停止占用进程或修改 .env 中的 PORT
```

### 前端页面空白 / 500 错误

1. 检查后端是否正常运行：`curl http://localhost:9700/health`
2. 检查 `.env.local` 是否存在：`cp .env.example .env.local`
3. 清除缓存：`rm -rf .next && npm run dev`
4. 检查浏览器控制台具体错误信息

### 飞书集成功能不可用

1. 确认 `server/.env` 中已填写 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`
2. 在飞书开放平台确认应用权限和事件订阅
3. 检查 `SERVER_URL` 是否为可访问的公网地址（飞书需要）

## 许可证

[MIT](./LICENSE)

---

<p align="center">Made with ❤️ by Teamclaw Team</p>
