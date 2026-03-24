# 前端页面文档索引

> 📅 更新日期：2026-03-24
> 📁 路径：`app/` 目录下的所有 Next.js 页面

---

## 概览

本目录包含 teamclaw 前端全部页面文档，按功能域分组：

### 核心功能页面

| ID | 页面 | 路由 | 说明 |
|---|---|---|---|
| P01 | 首页/仪表盘 | `/` | 项目概览、数据统计、快速入口 |
| P02 | 登录 | `/login` | JWT Token 认证 |
| P03 | 任务管理 | `/tasks` | 自动化任务列表与详情 |
| P04 | 版本管理 | `/versions` | 版本列表与详情 |
| P05 | 能力配置 | `/capabilities` | AI Agent 能力配置 |
| P06 | 定时任务 | `/cron` | Cron 调度配置 |
| P07 | 文档中心 | `/docs` | 知识库文档 |
| P08 | Token 管理 | `/tokens` | API 令牌管理 |
| P09 | 成员管理 | `/members` | 团队成员管理 |
| P10 | 消息中心 | `/messages` | 消息记录查看 |
| P11 | 监控面板 | `/monitor` | 系统状态监控 |
| P12 | 设置 | `/settings` | 用户/系统设置 |
| P13 | 导入项目 | `/import` | Git 项目导入 |
| P14 | 分支管理 | `/branches` | Git 分支列表 |
| P15 | 标签管理 | `/tags` | 版本标签管理 |

### 动态路由页面

| ID | 页面 | 路由 | 说明 |
|---|---|---|---|
| P16 | 项目详情 | `/projects/[id]` | 单个项目概览 |
| P17 | 版本详情 | `/versions/[id]` | 版本详细信息 |
| P18 | 版本面板 | `/versions/panel` | 版本操作面板 |
| P19 | 版本新建 | `/versions/new` | 创建新版本 |
| P20 | 版本标签 | `/versions/tags` | 版本标签视图 |
| P21 | 任务详情 | `/tasks/[id]` | 任务详细信息 |
| P22 | 标签详情 | `/tags/[name]` | 单个标签视图 |
| P23 | 标签新建 | `/tags/new` | 创建新标签 |
| P24 | Agent 团队 | `/agent-team` | Agent 团队管理 |
| P25 | 分支详情 | `/branches/[id]` | 分支详细信息 |
| P26 | 文档详情 | `/docs/[slug]` | 文档内容页 |

### 目录结构

```
docs/client/pages/
├── README.md              # 本索引文件
├── P01-home.md            # 首页/仪表盘
├── P02-login.md           # 登录页
├── P03-tasks.md           # 任务管理
├── P04-versions.md        # 版本管理
├── P05-capabilities.md    # 能力配置
├── P06-cron.md           # 定时任务
├── P07-docs.md           # 文档中心
├── P08-tokens.md         # Token 管理
├── P09-members.md        # 成员管理
├── P10-messages.md       # 消息中心
├── P11-monitor.md        # 监控面板
├── P12-settings.md       # 设置页
├── P13-import.md         # 导入项目
├── P14-branches.md        # 分支管理
├── P15-tags.md           # 标签管理
├── P16-project-detail.md  # 项目详情
├── P17-version-detail.md  # 版本详情
└── P26-doc-detail.md     # 文档详情
```

---

## 公共规范

### 认证流程
- 除 `/login` 外所有页面均需 JWT Token
- Token 存储在 `localStorage.token`
- Token 过期后重定向到 `/login?redirect=<当前路径>`

### 状态管理
- 使用 React Query（`@tanstack/react-query`）管理服务端状态
- 使用 `useAuth` hook 管理认证状态
- 路由状态使用 Next.js App Router 的 `useSearchParams` / `useParams`

### API 调用规范
- 所有 API 调用通过 `lib/api/` 下的封装函数
- 使用 `fetchWithAuth` 封装，自动附加 Authorization header
- 错误处理统一使用 `apiError` 辅助函数

### 组件库
- UI 组件：`@/components/ui/`（Card, Button, Input, Select 等）
- 图标：`lucide-react`
- 状态反馈：`@/components/ui/use-toast`

---

## 页面间跳转关系图

```
/ (首页)
├── /tasks → /tasks/[id]
├── /versions → /versions/[id] / /versions/panel / /versions/new / /versions/tags
├── /capabilities
├── /cron
├── /docs → /docs/[slug]
├── /tokens
├── /members
├── /messages
├── /monitor
├── /settings
├── /import
├── /branches → /branches/[id]
├── /tags → /tags/[name] / /tags/new
└── /projects/[id]
```
