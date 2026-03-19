# 迭代 76：分支管理功能 - 技术方案设计

> **任务来源**: Issue #171  
> **方向**: 分支管理 - 创建分支、指定主分支  
> **评审结论**: APPROVED

---

## 1. 现状分析

### 1.1 已有基础

| 模块 | 文件路径 | 当前能力 | 状态 |
|------|----------|----------|------|
| 分支模型 | `server/src/models/branch.ts` | BranchRecord, BranchConfig 类型定义 | ✅ 完善 |
| 分支服务 | `server/src/services/branchService.ts` | 内存 CRUD、设置主分支、保护分支 | ✅ 完善 |
| 分支路由 | `server/src/routes/branch.ts` | 完整 REST API | ✅ 完善 |
| 前端 API | `lib/api/branches.ts` | API 函数 + React Query Hooks | ✅ 完善 |

### 1.2 与 Git 集成的缺失

当前实现为**纯内存存储**，需要增强：
1. 创建分支 → 需执行 `git branch` / `git checkout -b`
2. 列出分支 → 需从 `git branch -a` 获取
3. 删除分支 → 需执行 `git branch -d/-D`
4. 设置默认分支 → 需更新项目配置或 git config

---

## 2. 技术选型与理由

| 技术决策 | 选择 | 理由 |
|---------|------|------|
| Git 操作封装 | `gitService.ts` 扩展 | 已有封装，复用执行逻辑 |
| 数据持久化 | SQLite + Git 双写 | DB 存元数据，Git 存实际分支 |
| 默认分支存储 | projects 表 defaultBranch 字段 | 项目级配置，与代码库分离 |
| 分支同步策略 | 启动时同步 + 操作时双写 | 确保 DB 和 Git 状态一致 |
| 并发控制 | 内存锁 + Git 锁 | 防止并发操作冲突 |

---

## 3. 数据模型设计

### 3.1 数据库 Schema 变更

```sql
-- projects 表新增默认分支字段
ALTER TABLE projects ADD COLUMN default_branch TEXT DEFAULT 'main';

-- branches 表（如不存在则创建）
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_main INTEGER DEFAULT 0,
  is_remote INTEGER DEFAULT 0,
  is_protected INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  last_commit_at TEXT,
  commit_message TEXT,
  author TEXT,
  project_id TEXT,
  base_branch TEXT,
  description TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_branches_project ON branches(project_id);
CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);
```

### 3.2 TypeScript 类型定义（扩展）

```typescript
// server/src/models/branch.ts

export interface BranchRecord {
  id: string;
  name: string;
  isMain: boolean;
  isRemote: boolean;
  isProtected: boolean;
  createdAt: string;
  lastCommitAt: string;
  commitMessage: string;
  author: string;
  projectId?: string;       // 关联项目 ID
  baseBranch?: string;      // 基于哪个分支创建
  description?: string;
  commitHash?: string;      // 当前 commit hash
  aheadCount?: number;      // 领先主分支的 commit 数
  behindCount?: number;     // 落后主分支的 commit 数
}

// 创建分支请求
export interface CreateBranchRequest {
  name: string;
  baseBranch?: string;      // 基于哪个分支创建，默认主分支
  projectId: string;        // 所属项目
  description?: string;
  checkout?: boolean;       // 是否切换到新分支
}

// 分支列表响应
export interface BranchListResponse {
  data: BranchRecord[];
  total: number;
  page: number;
  pageSize: number;
  defaultBranch: string;    // 当前默认分支名
}

// 分支统计
export interface BranchStats {
  total: number;
  main: number;
  protected: number;
  remote: number;
  active: number;           // 最近有提交的分支数
  stale: number;            // 长期未更新的分支数
}
```

---

## 4. API 契约清单

### 4.1 获取分支列表（增强）

**端点**: `GET /api/v1/projects/:projectId/branches`

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 50 |
| includeRemote | boolean | 否 | 是否包含远程分支 |
| sortBy | string | 否 | 排序：name \| updated \| created |

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "data": [
      {
        "id": "branch_1",
        "name": "main",
        "isMain": true,
        "isRemote": false,
        "isProtected": true,
        "createdAt": "2026-01-01T08:00:00Z",
        "lastCommitAt": "2026-03-19T14:30:00Z",
        "commitMessage": "feat: add version management",
        "commitHash": "abc1234...",
        "author": "system",
        "aheadCount": 0,
        "behindCount": 0
      },
      {
        "id": "branch_2",
        "name": "feature/login",
        "isMain": false,
        "isRemote": true,
        "isProtected": false,
        "createdAt": "2026-03-15T10:00:00Z",
        "lastCommitAt": "2026-03-18T16:20:00Z",
        "commitMessage": "feat: add login page",
        "commitHash": "def5678...",
        "baseBranch": "main",
        "aheadCount": 5,
        "behindCount": 2
      }
    ],
    "total": 8,
    "page": 1,
    "pageSize": 50,
    "defaultBranch": "main"
  }
}
```

### 4.2 创建分支（增强，集成 Git）

**端点**: `POST /api/v1/projects/:projectId/branches`

**请求体**:
```json
{
  "name": "feature/new-feature",
  "baseBranch": "main",
  "description": "新功能开发分支",
  "checkout": false
}
```

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "branch_3",
    "name": "feature/new-feature",
    "isMain": false,
    "isRemote": false,
    "isProtected": false,
    "createdAt": "2026-03-20T10:00:00Z",
    "lastCommitAt": "2026-03-20T10:00:00Z",
    "commitMessage": "Created branch feature/new-feature from main",
    "commitHash": "abc1234...",
    "baseBranch": "main",
    "description": "新功能开发分支"
  }
}
```

**错误响应**:
```json
{
  "code": 409,
  "message": "Branch 'feature/new-feature' already exists"
}
```

### 4.3 删除分支（增强，集成 Git）

**端点**: `DELETE /api/v1/projects/:projectId/branches/:branchId`

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| force | boolean | 否 | 是否强制删除（-D），默认 false |

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "deleted": true,
    "branchName": "feature/old-feature"
  }
}
```

### 4.4 设置默认分支（主分支）

**端点**: `PUT /api/v1/projects/:projectId/branches/:branchId/default`

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "branch_2",
    "name": "develop",
    "isMain": true,
    "isProtected": true,
    "previousMain": "main"
  }
}
```

### 4.5 切换分支（检出）

**端点**: `POST /api/v1/projects/:projectId/branches/:branchId/checkout`

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "currentBranch": "feature/login",
    "previousBranch": "main",
    "commitHash": "def5678..."
  }
}
```

### 4.6 获取分支对比信息

**端点**: `GET /api/v1/projects/:projectId/branches/:branchId/compare`

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "branch": "feature/login",
    "baseBranch": "main",
    "aheadCount": 5,
    "behindCount": 2,
    "commits": [
      { "hash": "abc123", "message": "feat: add login", "author": "dev" }
    ]
  }
}
```

---

## 5. 文件变更计划

### 5.1 后端文件

| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|----------|
| `server/src/db/migrations/xxx_add_project_default_branch.sql` | **新增** | projects 表新增 default_branch 字段 |
| `server/src/db/migrations/xxx_create_branches_table.sql` | **新增** | 创建 branches 表的迁移脚本 |
| `server/src/models/branch.ts` | 修改 | 扩展 BranchRecord 类型，新增 projectId/commitHash/aheadCount/behindCount |
| `server/src/services/gitService.ts` | 修改 | 新增分支相关 Git 操作函数 |
| `server/src/services/branchService.ts` | 修改 | 1. 从内存存储改为 SQLite 存储<br>2. 集成 Git 命令执行<br>3. 新增分支对比功能 |
| `server/src/routes/branch.ts` | 修改 | 1. 添加 projectId 路径参数<br>2. 新增 checkout/compare 端点<br>3. 更新默认分支设置端点 |

### 5.2 前端文件

| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|----------|
| `lib/api/types.ts` | 修改 | 扩展 BranchRecord 类型定义 |
| `lib/api/branches.ts` | 修改 | 1. 添加 projectId 参数<br>2. 新增 checkout/compare API 函数<br>3. 更新 React Query hooks |
| `app/branches/page.tsx` | **新增** | 分支管理页面（列表 + 操作） |
| `app/branches/components/BranchList.tsx` | **新增** | 分支列表组件 |
| `app/branches/components/CreateBranchDialog.tsx` | **新增** | 创建分支对话框 |
| `app/branches/components/BranchCompare.tsx` | **新增** | 分支对比组件 |

---

## 6. 核心实现逻辑

### 6.1 Git 服务扩展 (gitService.ts)

```typescript
// 新增分支相关操作

export interface GitBranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  commitHash: string;
  commitMessage: string;
  lastCommitDate: string;
}

// 获取所有分支
export async function getGitBranches(
  projectPath: string,
  options?: { includeRemote?: boolean }
): Promise<GitBranchInfo[]> {
  const remoteFlag = options?.includeRemote ? '-a' : '';
  const result = await execGit(projectPath, ['branch', remoteFlag, '-v', '--format=%(refname:short)|%(HEAD)|%(objectname:short)|%(subject)|%(committerdate:iso8601)']);
  
  return result.split('\n')
    .filter(Boolean)
    .map(line => {
      const [name, head, hash, message, date] = line.split('|');
      return {
        name: name.replace('remotes/origin/', ''),
        isCurrent: head === '*',
        isRemote: name.startsWith('remotes/'),
        commitHash: hash,
        commitMessage: message,
        lastCommitDate: date,
      };
    });
}

// 创建分支
export async function createGitBranch(
  projectPath: string,
  branchName: string,
  baseBranch?: string
): Promise<void> {
  const args = ['branch', branchName];
  if (baseBranch) {
    args.push(baseBranch);
  }
  await execGit(projectPath, args);
}

// 删除分支
export async function deleteGitBranch(
  projectPath: string,
  branchName: string,
  force: boolean = false
): Promise<void> {
  const flag = force ? '-D' : '-d';
  await execGit(projectPath, ['branch', flag, branchName]);
}

// 切换分支
export async function checkoutBranch(
  projectPath: string,
  branchName: string
): Promise<void> {
  await execGit(projectPath, ['checkout', branchName]);
}

// 获取分支对比信息
export async function compareBranches(
  projectPath: string,
  branch: string,
  baseBranch: string
): Promise<{ ahead: number; behind: number }> {
  const result = await execGit(
    projectPath, 
    ['rev-list', '--left-right', '--count', `${baseBranch}...${branch}`]
  );
  const [behind, ahead] = result.split('\t').map(Number);
  return { ahead, behind };
}

// 设置默认分支（仅本地配置）
export async function setDefaultBranch(
  projectPath: string,
  branchName: string
): Promise<void> {
  await execGit(projectPath, ['config', 'init.defaultBranch', branchName]);
}
```

### 6.2 分支服务增强 (branchService.ts)

```typescript
// 从 SQLite 获取分支
export async function getAllBranches(projectId: string): Promise<BranchRecord[]> {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM branches WHERE project_id = ? ORDER BY is_main DESC, name ASC'
  ).all(projectId) as any[];
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    isMain: Boolean(row.is_main),
    isRemote: Boolean(row.is_remote),
    isProtected: Boolean(row.is_protected),
    createdAt: row.created_at,
    lastCommitAt: row.last_commit_at,
    commitMessage: row.commit_message,
    commitHash: row.commit_hash,
    author: row.author,
    projectId: row.project_id,
    baseBranch: row.base_branch,
    description: row.description,
  }));
}

// 同步 Git 分支到数据库
export async function syncBranches(projectId: string): Promise<void> {
  const project = getProject(projectId);
  if (!project?.path) return;
  
  const gitBranches = await getGitBranches(project.path, { includeRemote: true });
  const db = getDb();
  
  for (const gitBranch of gitBranches) {
    // 检查是否已存在
    const existing = db.prepare(
      'SELECT id FROM branches WHERE project_id = ? AND name = ?'
    ).get(projectId, gitBranch.name);
    
    if (existing) {
      // 更新
      db.prepare(`
        UPDATE branches 
        SET commit_hash = ?, commit_message = ?, last_commit_at = ?, is_remote = ?
        WHERE id = ?
      `).run(
        gitBranch.commitHash,
        gitBranch.commitMessage,
        gitBranch.lastCommitDate,
        gitBranch.isRemote ? 1 : 0,
        existing.id
      );
    } else {
      // 插入
      db.prepare(`
        INSERT INTO branches (id, name, project_id, is_remote, commit_hash, commit_message, last_commit_at, created_at, is_main, is_protected)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `branch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        gitBranch.name,
        projectId,
        gitBranch.isRemote ? 1 : 0,
        gitBranch.commitHash,
        gitBranch.commitMessage,
        gitBranch.lastCommitDate,
        gitBranch.lastCommitDate,
        0,
        0
      );
    }
  }
}

// 创建分支（Git + DB）
export async function createBranch(
  projectId: string,
  data: CreateBranchRequest
): Promise<BranchRecord> {
  const project = getProject(projectId);
  if (!project?.path) {
    throw new Error('Project not found or no repository');
  }
  
  // 1. 在 Git 中创建分支
  await createGitBranch(project.path, data.name, data.baseBranch);
  
  // 2. 可选：切换到新分支
  if (data.checkout) {
    await checkoutBranch(project.path, data.name);
  }
  
  // 3. 写入数据库
  const db = getDb();
  const id = `branch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  
  db.prepare(`
    INSERT INTO branches (id, name, project_id, base_branch, description, created_at, last_commit_at, is_main, is_protected, is_remote)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    projectId,
    data.baseBranch || project.defaultBranch || 'main',
    data.description || '',
    new Date().toISOString(),
    new Date().toISOString(),
    0,
    0,
    0
  );
  
  return getBranch(id)!;
}
```

---

## 7. 前端组件设计

### 7.1 分支列表页面

```typescript
// app/branches/page.tsx 主要功能

export default function BranchesPage() {
  const { projectId } = useParams();
  const { data: branches, isLoading } = useBranches(projectId);
  const { data: stats } = useBranchStats(projectId);
  const createBranch = useCreateBranch();
  const deleteBranch = useDeleteBranch();
  const setDefaultBranch = useSetDefaultBranch();

  return (
    <div className="p-6">
      {/* 头部统计 */}
      <BranchStatsCards stats={stats} />
      
      {/* 操作栏 */}
      <div className="flex justify-between mb-4">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> 新建分支
        </Button>
        <Button variant="outline" onClick={() => syncBranches()} >
          <RefreshCw className="w-4 h-4 mr-1" /> 同步分支
        </Button>
      </div>
      
      {/* 分支列表 */}
      <BranchList 
        branches={branches}
        onDelete={deleteBranch.mutate}
        onSetDefault={setDefaultBranch.mutate}
        onCheckout={checkoutBranch.mutate}
      />
      
      {/* 创建对话框 */}
      <CreateBranchDialog 
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={createBranch.mutate}
        baseBranches={branches?.filter(b => !b.isRemote)}
      />
    </div>
  );
}
```

### 7.2 分支列表项组件

```typescript
// BranchListItem 关键交互

interface BranchListItemProps {
  branch: BranchRecord;
  isDefault: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
  onCheckout: () => void;
}

function BranchListItem({ branch, isDefault, onSetDefault, onDelete, onCheckout }: BranchListItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        {/* 分支图标 */}
        <GitBranch className={cn(
          "w-5 h-5",
          branch.isMain ? "text-blue-500" : 
          branch.isProtected ? "text-amber-500" : "text-gray-500"
        )} />
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{branch.name}</span>
            {isDefault && <Badge>默认</Badge>}
            {branch.isProtected && <Badge variant="warning">受保护</Badge>}
          </div>
          <p className="text-sm text-gray-500">
            {branch.aheadCount} 领先 / {branch.behindCount} 落后 · 
            最后更新 {formatDate(branch.lastCommitAt)}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCheckout}>
          切换
        </Button>
        {!isDefault && (
          <Button variant="ghost" size="sm" onClick={onSetDefault}>
            设为默认
          </Button>
        )}
        {!branch.isProtected && (
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## 8. 数据库迁移脚本

```sql
-- migrations/xxx_add_project_default_branch.sql
-- 添加项目默认分支字段

ALTER TABLE projects ADD COLUMN default_branch TEXT DEFAULT 'main';

-- 更新现有项目的默认分支
UPDATE projects SET default_branch = 'main' WHERE default_branch IS NULL;

-- migrations/xxx_create_branches_table.sql
-- 创建分支表

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_id TEXT NOT NULL,
  is_main INTEGER DEFAULT 0,
  is_remote INTEGER DEFAULT 0,
  is_protected INTEGER DEFAULT 0,
  commit_hash TEXT,
  commit_message TEXT,
  created_at TEXT NOT NULL,
  last_commit_at TEXT,
  author TEXT,
  base_branch TEXT,
  description TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_branches_project ON branches(project_id);
CREATE INDEX IF NOT EXISTS idx_branches_name ON branches(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_project_name ON branches(project_id, name);
```

---

## 9. 验收标准对照

| 验收项 | 实现方案 | 验证方式 |
|--------|----------|----------|
| 创建分支 | POST /projects/:id/branches + git branch | API 测试 + Git 验证 |
| 列出分支 | GET /projects/:id/branches + git branch -a | API 测试 |
| 删除分支 | DELETE /projects/:id/branches/:id + git branch -d | API 测试 + Git 验证 |
| 设置默认分支 | PUT /projects/:id/branches/:id/default + DB 更新 | API 测试 |
| 切换分支 | POST /projects/:id/branches/:id/checkout + git checkout | API 测试 + Git 验证 |
| 分支对比 | GET /projects/:id/branches/:id/compare + git rev-list | API 测试 |
| Build 通过 | TypeScript + ESLint | `npm run build` |

---

## 10. 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| Git 操作失败 | 中 | 分支状态不一致 | 事务性处理，失败回滚 |
| 并发创建同名分支 | 低 | 数据冲突 | DB 唯一索引 + Git 前置检查 |
| 删除受保护分支 | 低 | 数据丢失 | 双重校验（DB + Git） |
| 默认分支切换影响 CI/CD | 中 | 构建失败 | 确认对话框 + 影响说明 |

---

**设计人**: architect  
**日期**: 2026-03-20  
**关联 Issue**: #171
