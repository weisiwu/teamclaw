# 31【P0】前端 - Tools & Skills 管理页面重构

## 背景

当前 `/capabilities` 页面仅显示 6 个权限开关，无法满足 Tools/Skills 的管理需求。需要将该页面重构为 **智能体 Tools & Skills 管理中心**，支持分类浏览、搜索、详情查看、创建编辑等完整功能。

## 页面结构

### 顶部 Tab 切换

```
[🔧 Tools]    [📚 Skills]
```

### Tools Tab

#### 列表视图

- **分类筛选栏**：全部 / 文件操作 / Git / Shell / API / 浏览器 / 自定义
- **来源筛选**：全部 / 内置 / 用户创建 / 导入
- **搜索框**：按名称/描述搜索
- **卡片网格布局**（每行 2-3 个）

#### Tool 卡片内容

```
┌──────────────────────────────────┐
│ 📁 文件读取           [开关]     │
│ file_read                        │
│ 读取指定路径的文件内容            │
│                                  │
│ 分类: 文件操作  来源: 内置       │
│ 风险: 🟢低   审批: 否            │
│ 参数: path, encoding             │
│                                  │
│ [查看详情]  [编辑]  [删除]       │
└──────────────────────────────────┘
```

#### Tool 详情/编辑弹窗

- 显示完整参数列表（名称、类型、必填、默认值、描述）
- 风险等级选择
- 审批开关
- 适用 Agent 选择（可选）

### Skills Tab

#### 列表视图

- **分类筛选栏**：全部 / 构建 / 部署 / 测试 / 结构 / 编码 / 审查 / 自定义
- **来源筛选**：全部 / 自动生成 / 用户创建 / 导入
- **搜索框**
- **磁盘同步按钮**：点击触发 `POST /api/v1/skills/sync`

#### Skill 卡片内容

```
┌──────────────────────────────────┐
│ 📖 React 编码规范       [开关]   │
│ react-coding-guide               │
│ React 项目编码规范和最佳实践      │
│                                  │
│ 分类: 编码  来源: 用户创建       │
│ 适用: coder1, coder2             │
│ 标签: react, frontend            │
│                                  │
│ [预览内容]  [编辑]  [删除]       │
└──────────────────────────────────┘
```

#### Skill 预览弹窗

- 全屏 Dialog，左侧元信息，右侧 Markdown 渲染预览
- 支持在线编辑 Skill 内容（Markdown 编辑器）

### 创建按钮

页面右上角 "新建 Tool" / "新建 Skill" 按钮，打开创建弹窗。

### 统计概览（页面顶部）

```
Tools: 12 个（10 启用 / 2 禁用）    Skills: 8 个（6 启用 / 2 禁用）
内置: 5 | 用户: 4 | 导入: 3          生成: 4 | 用户: 2 | 导入: 2
```

## 默认 Skills 展示

- 自动生成的 Skills（来自 `skillGenerator.ts`）标记为 "🤖 自动生成"
- 显示生成时间和关联项目
- 内容只读（编辑需先复制为用户 Skill）

## UI 组件使用

- `Tabs` — Tools/Skills 切换
- `Card` — Tool/Skill 卡片
- `Dialog` — 详情/编辑/创建弹窗
- `Badge` — 分类、来源、风险等级、标签
- `Switch` — 启用/禁用
- `Input` / `Textarea` — 表单
- `Select` — 分类选择、Agent 选择
- `Button` — 操作按钮
- `Skeleton` — 加载态
- `EmptyState` — 空状态

## 前端文件

- `app/capabilities/page.tsx` — 完全重写
- `lib/api/tools.ts` — Tools API 封装
- `lib/api/skills.ts` — Skills API 封装
- `hooks/useTools.ts` — React Query hooks
- `hooks/useSkills.ts` — React Query hooks
- Next.js 代理路由（tools/skills 系列）
- Sidebar 菜单项名称改为 "Tools & Skills"

## 依赖关系

- 依赖任务 30（后端 API）
- 任务 32（导入导出 UI）可在此基础上添加
