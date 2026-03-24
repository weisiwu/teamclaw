# 项目管理 API

> `lib/api/projects.ts`

---

## 功能说明

项目管理 API 封装了项目相关的所有 API 调用，包括项目列表、详情、创建、更新、删除，以及项目导入功能。

---

## 函数列表

### fetchProjects

获取项目列表。

```typescript
async function fetchProjects(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<ProjectListResponse>
```

### fetchProjectById

获取单个项目详情。

```typescript
async function fetchProjectById(id: string): Promise<Project>
```

### createProject

创建新项目。

```typescript
async function createProject(data: CreateProjectData): Promise<Project>
```

### updateProject

更新项目信息。

```typescript
async function updateProject(id: string, data: UpdateProjectData): Promise<Project>
```

### deleteProject

删除项目。

```typescript
async function deleteProject(id: string): Promise<void>
```

### importProject

导入项目（通过 Git URL）。

```typescript
async function importProject(data: {
  gitUrl: string;
  branch?: string;
  auth?: {
    username?: string;
    token?: string;
  };
}): Promise<ImportTask>
```

### getImportStatus

获取导入任务状态。

```typescript
async function getImportStatus(taskId: string): Promise<ImportStatus>
```

---

## 类型定义

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  gitUrl: string;
  defaultBranch: string;
  techStack?: TechStack;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  memberCount: number;
  status: 'active' | 'inactive' | 'archived';
}

interface TechStack {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  orm?: string[];
  framework?: string[];
}

interface ProjectListResponse {
  data: Project[];
  total: number;
  page: number;
  pageSize: number;
}

interface CreateProjectData {
  name: string;
  description?: string;
  gitUrl: string;
  defaultBranch?: string;
  auth?: {
    username?: string;
    token?: string;
  };
}

interface UpdateProjectData {
  name?: string;
  description?: string;
  defaultBranch?: string;
  status?: 'active' | 'inactive' | 'archived';
}

interface ImportTask {
  id: string;
  projectId?: string;
  status: 'pending' | 'cloning' | 'scanning' | 'detecting' | 'analyzing' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  error?: string;
}

interface ImportStatus {
  taskId: string;
  status: ImportTask['status'];
  progress: number;
  currentStep: string;
  steps?: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    completedAt?: string;
  }>;
}
```

---

## 使用示例

```typescript
import {
  fetchProjects,
  fetchProjectById,
  createProject,
  importProject,
  getImportStatus,
} from '@/lib/api/projects';

// 获取项目列表
const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: () => fetchProjects({ page: 1, pageSize: 20 }),
});

// 获取项目详情
const { data: project } = useQuery({
  queryKey: ['projects', projectId],
  queryFn: () => fetchProjectById(projectId),
});

// 导入项目
const mutation = useMutation({
  mutationFn: importProject,
  onSuccess: (task) => {
    // 开始轮询导入状态
    startImportPolling(task.id);
  },
});

mutation.mutate({
  gitUrl: 'https://github.com/example/repo',
  branch: 'main',
  auth: { token: 'ghp_xxx' },
});

// 轮询导入状态
async function startImportPolling(taskId: string) {
  const status = await getImportStatus(taskId);
  if (status.status === 'completed') {
    console.log('导入完成');
  } else if (status.status === 'failed') {
    console.error('导入失败:', status.error);
  } else {
    setTimeout(() => startImportPolling(taskId), 2000);
  }
}
```

---

## 导入流程 (8 步)

| 步骤 | 说明 | API 轮询 |
|---|---|---|
| 1 | 克隆代码库 | — |
| 2 | 扫描文件结构 | — |
| 3 | 检测技术栈 | — |
| 4 | 分析依赖配置 | — |
| 5 | 检测打包机制 | — |
| 6 | 生成功能定位 | — |
| 7 | 分析历史改动 | — |
| 8 | 完成导入 | — |

---

## 相关文件

- `app/api/v1/projects/` — Next.js API Routes
- `lib/api/projects.ts` — 本文件
- `server/src/routes/project.ts` — 后端路由
