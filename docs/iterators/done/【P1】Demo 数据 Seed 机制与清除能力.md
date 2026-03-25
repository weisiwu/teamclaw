# 37【P1】Demo 数据 Seed 机制与清除能力

## 背景

当前项目启动后各页面数据为空（任务列表、版本列表、消息列表等），新用户或演示场景下无法直观了解系统功能。需要以 TeamClaw 自身作为示例项目，预置一套完整的 Demo 数据，让项目默认启动即有内容可看。

### 现有数据存储方式

| 数据 | 存储方式 | 说明 |
|------|----------|------|
| 项目（Projects） | 内存 `Map` | `importOrchestrator.ts` 中的 `projects` Map |
| Agent 团队 | 内存常量 | `constants/agents.ts` 中的 `AGENT_TEAM` 数组 |
| 辅助能力 | 内存 `Map` + JSON 文件 | `abilityService.ts`，持久化到 `data/abilities.json` |
| 任务（Tasks） | PostgreSQL | `taskRepo.ts` |
| 版本（Versions） | PostgreSQL | `versionRepo.ts` |
| 消息（Messages） | PostgreSQL | `messageRepo.ts` |
| 用户（Users） | PostgreSQL | `userRepo.ts` |
| 标签（Tags） | PostgreSQL | `tagService.ts` |
| 分支（Branches） | PostgreSQL | DB 表 |
| 审计日志 | PostgreSQL | DB 表 |

## 目标

1. **服务启动时自动填充 Demo 数据**（首次启动或数据库为空时）
2. **提供清除 Demo 数据的 API 和 UI 入口**
3. **Demo 数据以 TeamClaw 自身为样本项目**
4. 正式验收版本后可移除 Demo 数据模块

## Demo 数据内容设计

### 项目数据

```typescript
const DEMO_PROJECT: Project = {
  id: 'demo_teamclaw',
  name: 'TeamClaw',
  source: 'local',
  localPath: process.cwd(),  // TeamClaw 自身目录
  techStack: ['TypeScript', 'React', 'Next.js', 'Express', 'PostgreSQL', 'TailwindCSS'],
  buildTool: 'npm',
  hasGit: true,
  importedAt: new Date().toISOString(),
  status: 'active',
};
```

### 任务数据（10-15 条）

```typescript
const DEMO_TASKS = [
  {
    title: '实现用户登录功能',
    description: '支持用户名密码登录，JWT token 认证',
    status: 'completed',
    priority: 'high',
    assignee: 'coder1',
    tags: ['auth', 'backend'],
  },
  {
    title: '设计 Agent 团队协作页面',
    description: '展示 Agent 团队层级结构、状态、任务分配',
    status: 'completed',
    priority: 'high',
    assignee: 'coder2',
    tags: ['frontend', 'agent'],
  },
  {
    title: 'API Token 管理功能',
    description: '支持用户在平台录入多个 API Token，分配给不同 Agent',
    status: 'in_progress',
    priority: 'high',
    assignee: 'pm',
    tags: ['feature', 'agent', 'llm'],
  },
  {
    title: '版本管理与回滚',
    description: '支持版本列表、版本对比、一键回滚',
    status: 'completed',
    priority: 'medium',
    assignee: 'coder1',
    tags: ['version', 'backend'],
  },
  {
    title: 'Tools & Skills 管理页面',
    description: '重构辅助能力页为 Tools/Skills 管理中心，支持导入导出',
    status: 'pending',
    priority: 'medium',
    assignee: 'coder2',
    tags: ['feature', 'frontend'],
  },
  // ... 更多任务
];
```

### 版本数据（5-8 条）

```typescript
const DEMO_VERSIONS = [
  { version: '0.1.0', tag: 'alpha', summary: '项目初始化，基础框架搭建', changes: 120 },
  { version: '0.2.0', tag: 'alpha', summary: '用户认证、Agent 团队管理', changes: 85 },
  { version: '0.3.0', tag: 'beta', summary: '版本管理、任务系统', changes: 156 },
  { version: '0.4.0', tag: 'beta', summary: '后台配置、审计日志', changes: 93 },
  { version: '0.5.0', tag: 'rc', summary: 'LLM 集成、Agent 执行引擎', changes: 210 },
];
```

### 消息数据（10-20 条）

模拟飞书群聊消息，包含需求讨论、bug 报告、进度汇报等场景。

### 标签数据

```typescript
const DEMO_TAGS = [
  'auth', 'backend', 'frontend', 'agent', 'llm', 'feature',
  'bugfix', 'version', 'ui', 'performance', 'security',
];
```

## 实现方案

### 1. Seed 服务

```typescript
// server/src/services/demoSeed.ts

export const DEMO_DATA_FLAG = 'demo_data_seeded';

export async function seedDemoData(): Promise<{ seeded: boolean; counts: Record<string, number> }> {
  // 检查是否已 seed（通过数据库标记）
  const alreadySeeded = await checkFlag(DEMO_DATA_FLAG);
  if (alreadySeeded) return { seeded: false, counts: {} };

  const counts: Record<string, number> = {};

  // 1. 项目
  projects.set(DEMO_PROJECT.id, DEMO_PROJECT);
  counts.projects = 1;

  // 2. 任务（写入 PostgreSQL）
  for (const task of DEMO_TASKS) {
    await taskRepo.create({ ...task, projectId: 'demo_teamclaw', isDemoData: true });
  }
  counts.tasks = DEMO_TASKS.length;

  // 3. 版本
  for (const ver of DEMO_VERSIONS) {
    await versionRepo.create({ ...ver, projectId: 'demo_teamclaw', isDemoData: true });
  }
  counts.versions = DEMO_VERSIONS.length;

  // 4. 消息
  counts.messages = await seedDemoMessages();

  // 5. 标签
  counts.tags = await seedDemoTags();

  // 设置标记
  await setFlag(DEMO_DATA_FLAG);

  console.log('[demoSeed] Demo data seeded:', counts);
  return { seeded: true, counts };
}
```

### 2. 清除服务

```typescript
export async function clearDemoData(): Promise<{ cleared: boolean; counts: Record<string, number> }> {
  const counts: Record<string, number> = {};

  // 按 isDemoData 标记或 projectId='demo_teamclaw' 删除
  counts.tasks = await taskRepo.deleteByProject('demo_teamclaw');
  counts.versions = await versionRepo.deleteByProject('demo_teamclaw');
  counts.messages = await messageRepo.deleteByProject('demo_teamclaw');
  counts.tags = await tagService.deleteDemoTags();

  // 清除项目
  projects.delete('demo_teamclaw');
  counts.projects = 1;

  // 移除标记
  await clearFlag(DEMO_DATA_FLAG);

  console.log('[demoSeed] Demo data cleared:', counts);
  return { cleared: true, counts };
}
```

### 3. 启动时自动 Seed

```typescript
// server/src/index.ts — 在 runMigrations() 之后
const server = app.listen(PORT, async () => {
  console.log(`TeamClaw server running on port ${PORT}`);
  await runMigrations();
  // 自动填充 Demo 数据（首次启动）
  await seedDemoData();
  registerAutoBumpHook();
});
```

### 4. API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/admin/demo/seed` | 手动触发 seed Demo 数据 |
| DELETE | `/api/v1/admin/demo/clear` | 清除所有 Demo 数据 |
| GET | `/api/v1/admin/demo/status` | 查看 Demo 数据状态（是否已 seed、各类数据量） |

### 5. 前端 UI

在系统设置页添加 "Demo 数据管理" 区块：

```
┌─────────────────────────────────────────┐
│ 🎮 Demo 数据管理                        │
│                                         │
│ 状态: ✅ 已加载                          │
│ 项目: 1 | 任务: 15 | 版本: 5 | 消息: 20 │
│                                         │
│ [重新加载 Demo 数据]  [清除 Demo 数据]   │
│                                         │
│ ⚠️ 清除后不可恢复，生产环境请务必清除    │
└─────────────────────────────────────────┘
```

## 数据库改造

需要在关键表中添加 `is_demo` 标记列（或统一用 `project_id = 'demo_teamclaw'` 来标识），便于清除时精准删除：

```sql
-- 新增迁移：为 tasks、versions 等表添加 is_demo 列
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE versions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
```

## 正式版本移除方案

验收完成后：

1. 删除 `server/src/services/demoSeed.ts`
2. 删除 `server/src/data/demo/` 目录（Demo 数据 JSON 文件）
3. 从 `index.ts` 移除 `seedDemoData()` 调用
4. 删除 `/api/v1/admin/demo/*` 路由
5. 可选：删除 `is_demo` 列的迁移（或保留不影响）

## 实现文件

- `server/src/services/demoSeed.ts` — Seed / Clear 逻辑
- `server/src/data/demo/tasks.json` — Demo 任务数据
- `server/src/data/demo/versions.json` — Demo 版本数据
- `server/src/data/demo/messages.json` — Demo 消息数据
- `server/src/data/demo/tags.json` — Demo 标签数据
- `server/src/routes/demo.ts` — Seed/Clear/Status API
- `server/src/db/migrations/YYYYMMDD_NNN_add_is_demo_column.sql` — 数据库迁移
- `server/src/index.ts` — 启动时调用 seedDemoData
- 前端：设置页 Demo 数据管理区块

## 依赖关系

- 依赖现有数据库迁移机制（`runMigrations`）
- 无其他前置依赖，可独立开发
