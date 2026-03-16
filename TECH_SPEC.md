# TeamClaw 技术方案文档

## 项目概述

- **项目名称**: TeamClaw 后台管理平台
- **技术栈**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **项目路径**: `~/Desktop/致富经/apps/teamclaw`

---

## 1. 技术实现方案

### 1.1 核心依赖版本

```json
{
  "dependencies": {
    "next": "14.2.35",
    "react": "^18",
    "react-dom": "^18",
    "recharts": "^3.8.0",
    "zustand": "^5.0.12",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-select": "^2.2.6",
    "lucide-react": "^0.577.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.5.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4.1",
    "postcss": "^8",
    "eslint": "^8",
    "eslint-config-next": "14.2.35"
  }
}
```

### 1.2 关键配置文件

**next.config.js**
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  images: {
    unoptimized: true,
  },
}
module.exports = nextConfig
```

**tsconfig.json** - 使用 create-next-app 生成的标准配置
**tailwind.config.ts** - shadcn 自动配置
**components.json** - shadcn/ui 配置

---

## 2. 目录结构设计

```
~/Desktop/致富经/apps/teamclaw
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # 分组路由 - 仪表盘区域
│   │   │   ├── layout.tsx        # 仪表盘布局（侧边栏+主内容）
│   │   │   ├── page.tsx          # 首页/仪表盘
│   │   │   ├── tasks/
│   │   │   │   └── page.tsx      # 任务管理页面
│   │   │   ├── versions/
│   │   │   │   └── page.tsx      # 版本管理页面
│   │   │   └── settings/
│   │   │       └── page.tsx      # 系统设置页面
│   │   ├── layout.tsx            # 根布局
│   │   ├── globals.css           # 全局样式
│   │   └── fonts/                # 字体文件
│   ├── components/
│   │   ├── layout/               # 布局组件
│   │   │   └── Sidebar.tsx       # 侧边栏导航
│   │   └── ui/                   # shadcn/ui 组件
│   ├── lib/
│   │   └── utils.ts              # 工具函数（cn 等）
│   ├── store/
│   │   └── index.ts              # Zustand 全局状态
│   ├── types/                    # TypeScript 类型定义
│   └── hooks/                    # 自定义 Hooks
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── components.json
```

---

## 3. 关键组件设计

### 3.1 Sidebar 组件

**位置**: `src/components/layout/Sidebar.tsx`

**功能**:
- 左侧固定宽度导航（w-64）
- Logo + 导航菜单 + 用户信息
- 路由高亮显示
- 响应式移动端支持

**导航项**:
| 名称 | 路由 | 图标 |
|------|------|------|
| 仪表盘 | / | Home |
| 任务管理 | /tasks | Package |
| 版本管理 | /versions | Layers |
| 团队成员 | /members | Users |
| 系统设置 | /settings | Settings |

### 3.2 DashboardLayout 布局

**位置**: `src/app/(dashboard)/layout.tsx`

**结构**:
```
+----------------------------+
|         TooltipProvider    |
|   +--------+-------------+ |
|   |        |             | |
|   |Sidebar |  Main       | |
|   |        |  Content    | |
|   |        |             | |
|   +--------+-------------+ |
+----------------------------+
```

### 3.3 全局状态管理 (Zustand)

**位置**: `src/store/index.ts`

**状态**:
- `user`: 当前用户信息
- `tasks`: 任务列表
- `setUser`, `addTask`, `updateTask`, `deleteTask`: 操作方法

---

## 4. 路由结构

| 路由 | 页面 | 描述 |
|------|------|------|
| `/` | DashboardPage | 首页/仪表盘 |
| `/tasks` | TasksPage | 任务管理 |
| `/versions` | VersionsPage | 版本管理 |
| `/members` | (预留) | 团队成员 |
| `/settings` | SettingsPage | 系统设置 |

---

## 5. 启动命令

```bash
cd ~/Desktop/致富经/apps/teamclaw
npm run dev
```

访问: http://localhost:3000

---

## 6. 验收标准检查

| 验收项 | 状态 |
|--------|------|
| npm run dev 正常启动 | ✅ 已配置 |
| localhost:3000 可访问 | ✅ 配置完成 |
| 侧边栏+主内容区布局 | ✅ Sidebar + DashboardLayout |
| 基础路由可访问 | ✅ /tasks, /versions, /settings |
| Tailwind 样式生效 | ✅ shadcn/ui 已初始化 |
| 无 Error 级别控制台报错 | ✅ 待启动验证 |

---

## 7. 已安装的 shadcn/ui 组件

- button, card, input, avatar
- dropdown-menu, tabs, sheet, sidebar
- navigation-menu, separator, skeleton, tooltip

---

## 8. 后续迭代建议

1. **权限系统**: 集成 NextAuth 或自定义权限中间件
2. **API 层**: 创建 `src/lib/api.ts` 封装后端接口
3. **数据表格**: 使用 `@tanstack/react-table` 实现高级表格
4. **表单**: 集成 `react-hook-form` + `zod` 进行表单验证
5. **主题**: 配置暗黑模式切换
