# 项目与导入模型

> 来源文件：`server/src/models/project.ts`

## Project 模型

项目基本信息模型。

```typescript
export type ProjectSource = 'url' | 'local';
export type ProjectStatus = 'active' | 'archived';
export type ImportStatus = 'pending' | 'processing' | 'done' | 'error';
export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export interface Project {
  id: string;
  name: string;
  source: ProjectSource;
  url?: string; // 来源 URL（source='url' 时）
  localPath?: string; // 本地路径（source='local' 时）
  techStack: string[]; // 技术栈，如 ['next.js', 'react', 'typescript']
  buildTool?: string; // 构建工具，如 'npm', 'yarn', 'pnpm'
  hasGit: boolean; // 是否包含 Git 仓库
  importedAt: string; // ISO 8601 导入时间
  status: ProjectStatus; // active | archived
}
```

### 字段说明

| 字段         | 类型             | 必填 | 说明                                |
| ------------ | ---------------- | ---- | ----------------------------------- |
| `id`         | string           | ✅   | 项目唯一 ID                         |
| `name`       | string           | ✅   | 项目名称                            |
| `source`     | 'url' \| 'local' | ✅   | 来源类型                            |
| `url`        | string           | 条件 | 远程仓库 URL（source='url' 时必填） |
| `localPath`  | string           | 条件 | 本地路径（source='local' 时必填）   |
| `techStack`  | string[]         | ✅   | 技术栈列表                          |
| `buildTool`  | string           | ❌   | 构建工具名称                        |
| `hasGit`     | boolean          | ✅   | 是否为 Git 仓库                     |
| `importedAt` | string           | ✅   | ISO 8601 导入时间                   |
| `status`     | ProjectStatus    | ✅   | 项目状态                            |

## ImportTask 模型

导入任务状态追踪模型。

```typescript
export interface ImportStep {
  step: number; // 步骤编号（从 1 开始）
  name: string; // 步骤名称
  status: StepStatus; // pending | running | done | error
  error?: string; // 错误信息（status='error' 时）
}

export interface ImportTask {
  taskId: string; // 任务 ID
  projectId: string; // 关联的项目 ID
  status: ImportStatus; // pending | processing | done | error
  currentStep: number; // 当前执行步骤（1-based）
  totalSteps: number; // 总步骤数
  steps: ImportStep[]; // 步骤详情列表
  startedAt?: string; // 开始时间（ISO 8601）
  completedAt?: string; // 完成时间（ISO 8601）
}
```

### ImportStatus 状态流转

```
pending → processing → done
                    ↘ error
```

### ImportStep 典型步骤

1. `clone` - 克隆仓库
2. `analyze` - 分析技术栈
3. `index` - 建立索引
4. `verify` - 验证完整性

## 数据库表（PostgreSQL）

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('url', 'local')),
  url TEXT,
  local_path TEXT,
  tech_stack JSONB NOT NULL DEFAULT '[]',
  build_tool TEXT,
  has_git BOOLEAN NOT NULL DEFAULT false,
  imported_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived'))
);
```
