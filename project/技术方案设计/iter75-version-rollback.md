# 迭代 75：版本回退功能 - 技术方案设计

> **任务来源**: PM 需求 - Issue #75  
> **目标**: 实现基于 git commit 的版本回退功能  
> **评审结论**: APPROVED

---

## 1. 现状分析

### 1.1 已有基础

| 模块 | 文件路径 | 当前能力 |
|------|----------|----------|
| 回退服务 | `server/src/services/rollbackService.ts` | `rollbackToCommit()`, `rollbackToTag()`, `rollbackToBranch()` |
| 回退记录模型 | `server/src/models/rollbackRecord.ts` | `RollbackRecord` 类型定义 |
| 构建路由 | `server/src/routes/build.ts` | 已有 `/builds/:id/rollback` 端点（基于 BuildRecord） |
| 版本路由 | `server/src/routes/version.ts` | 已有 `/versions/:id/rollback` 端点（基于 Version） |

### 1.2 与需求的差异

当前实现基于 **BuildRecord**，而需求要求基于 **VersionRecord**（versions 表）：
- 需求要求 VersionRecord 新增 `rollbackCount` 和 `lastRollbackAt` 字段
- 需要新增 `rolled_back` status 状态
- 回退按钮在 VersionDetails 页面展示

---

## 2. 技术选型与理由

| 技术决策 | 选择 | 理由 |
|---------|------|------|
| 回退方式 | `git reset --hard` | 需求明确要求，直接重置到指定 commit |
| 数据持久化 | SQLite versions 表扩展 | 与现有架构一致，版本元数据统一存储 |
| 回退记录 | RollbackRecord + 内存数组 | 复用现有实现，历史记录可追溯 |
| 安全防护 | 确认对话框 + 非 HEAD 检查 | 防止误操作，当前版本不允许回退 |
| 并发控制 | 版本状态锁（status=rolling_back） | 防止并发回退导致冲突 |

---

## 3. 数据模型设计

### 3.1 数据库 Schema 变更

```sql
-- versions 表新增字段
ALTER TABLE versions ADD COLUMN rollback_count INTEGER DEFAULT 0;
ALTER TABLE versions ADD COLUMN last_rollback_at TEXT;

-- status 字段扩展枚举值（原有: draft/published/archived，新增: rolled_back）
-- 注意：代码层需要支持 'rolled_back' 状态
```

### 3.2 TypeScript 类型定义

```typescript
// server/src/models/version.ts

export interface VersionRecord {
  id: string;
  version: string;
  branch: string;
  summary: string;
  commit_hash?: string;       // git commit hash
  created_by: string;
  created_at: string;
  build_status: 'pending' | 'building' | 'success' | 'failed';
  tag_created: number;        // 0/1
  // 新增字段
  rollback_count: number;     // 回退次数
  last_rollback_at?: string;  // 最近回退时间 ISO
}

// Version status 扩展
export type VersionStatus = 'draft' | 'published' | 'archived' | 'rolled_back';

// 前端 Version 类型扩展
export interface Version {
  id: string;
  version: string;
  title: string;
  description?: string;
  status: VersionStatus;      // 包含 rolled_back
  // ... 其他字段
  rollbackCount?: number;     // 回退次数
  lastRollbackAt?: string;    // 最近回退时间
  commitHash?: string;        // 关联的 git commit
}

// 回退请求/响应类型
export interface VersionRollbackRequest {
  targetCommit: string;       // 目标 commit hash（从 version.commit_hash 获取）
  createBackup?: boolean;     // 是否创建备份分支
  reason?: string;            // 回退原因（可选）
}

export interface VersionRollbackResponse {
  success: boolean;
  rollbackId: string;
  versionId: string;
  commitHash: string;         // 回退后的 commit
  previousCommit: string;     // 回退前的 commit
  timestamp: string;
  rollbackCount: number;      // 更新后的回退次数
  status: 'rolled_back';
  backupBranch?: string;      // 备份分支名（如果创建）
}
```

---

## 4. API 契约清单

### 4.1 版本回退 API（新增强化）

**端点**: `POST /api/v1/versions/:versionId/rollback`

**请求体**:
```json
{
  "targetCommit": "abc1234...",      // 必填，目标 commit hash
  "createBackup": true,               // 可选，是否创建备份分支，默认 true
  "reason": "修复线上问题"             // 可选，回退原因
}
```

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "success": true,
    "rollbackId": "rb_1710854400000_a1b2c3",
    "versionId": "v_abc123",
    "commitHash": "abc1234...",
    "previousCommit": "def5678...",
    "timestamp": "2026-03-19T15:00:00Z",
    "rollbackCount": 1,
    "status": "rolled_back",
    "backupBranch": "backup/v_abc123-20260319"
  }
}
```

**错误响应**:
```json
{
  "code": 400,
  "message": "Cannot rollback: version is already at HEAD"
}
```

### 4.2 获取版本当前 HEAD 状态 API（新增）

**端点**: `GET /api/v1/versions/:versionId/head-status`

**用途**: 判断版本是否为当前 HEAD，用于前端控制按钮显示

**响应**:
```json
{
  "code": 0,
  "data": {
    "isCurrentHead": false,
    "currentCommit": "def5678...",
    "versionCommit": "abc1234...",
    "canRollback": true
  }
}
```

### 4.3 获取版本回退历史 API（增强）

**端点**: `GET /api/v1/versions/:versionId/rollback-history`

**响应**:
```json
{
  "code": 0,
  "data": {
    "history": [
      {
        "id": "rb_1710854400000_a1b2c3",
        "versionId": "v_abc123",
        "targetCommit": "abc1234...",
        "previousCommit": "def5678...",
        "mode": "reset",
        "backupBranch": "backup/v_abc123-20260319",
        "performedBy": "developer",
        "performedAt": "2026-03-19T15:00:00Z",
        "reason": "修复线上问题"
      }
    ],
    "total": 1
  }
}
```

---

## 5. 文件变更计划

### 5.1 后端文件

| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|----------|
| `server/src/db/migrations/xxx_add_version_rollback_fields.sql` | **新增** | 添加 `rollback_count` 和 `last_rollback_at` 字段的迁移脚本 |
| `server/src/models/version.ts` | **新增** | `VersionRecord` 类型定义，包含新增字段 |
| `server/src/services/versionRollbackService.ts` | **新增** | 版本回退核心业务逻辑：<br>1. `rollbackVersion(versionId, targetCommit)`<br>2. `isVersionAtHead(versionId)`<br>3. 更新 version status 和 rollback 计数 |
| `server/src/routes/version.ts` | 修改 | 1. 扩展 `/versions/:id/rollback` POST 端点<br>2. 新增 `/versions/:id/head-status` GET 端点<br>3. 增强 `/versions/:id/rollback-history` 返回 |

### 5.2 前端文件

| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|----------|
| `lib/api/types.ts` | 修改 | 扩展 `Version` 类型，添加 `rollbackCount`, `lastRollbackAt`, `commitHash` 字段 |
| `lib/api/versions.ts` | 修改 | 新增 API 函数：<br>1. `rollbackVersion(versionId, request)`<br>2. `getVersionHeadStatus(versionId)`<br>3. 对应 React Query hooks |
| `app/versions/[id]/page.tsx` | 修改 | 1. 添加「回退到此版本」按钮（仅非 HEAD 时显示）<br>2. 添加确认对话框组件<br>3. 显示 rollbackCount 和 lastRollbackAt |
| `app/versions/components/RollbackConfirmDialog.tsx` | **新增** | 回退确认对话框组件，包含：<br>- 回退影响说明<br>- 备份分支选项<br>- 回退原因输入 |
| `app/versions/components/RollbackHistoryPanel.tsx` | **新增** | 回退历史展示面板（可选） |

---

## 6. 核心实现逻辑

### 6.1 版本回退服务 (versionRollbackService.ts)

```typescript
import { getDb } from '../db/sqlite.js';
import { rollbackToCommit, getCurrentCommit } from './rollbackService.js';
import { getProjectPath } from './projectService.js';

export interface RollbackVersionResult {
  success: boolean;
  rollbackId: string;
  commitHash: string;
  previousCommit: string;
  timestamp: string;
  rollbackCount: number;
  backupBranch?: string;
}

/**
 * 执行版本回退
 */
export async function rollbackVersion(
  versionId: string,
  targetCommit: string,
  options?: {
    createBackup?: boolean;
    reason?: string;
    performedBy?: string;
  }
): Promise<RollbackVersionResult> {
  const db = getDb();
  
  // 1. 获取版本信息
  const version = db.prepare('SELECT * FROM versions WHERE id = ?').get(versionId) as VersionRecord;
  if (!version) {
    throw new Error('Version not found');
  }
  
  // 2. 检查是否已在目标 commit
  const projectPath = getProjectPath(versionId);
  const currentCommit = getCurrentCommit(projectPath);
  if (currentCommit === targetCommit) {
    throw new Error('Version is already at target commit');
  }
  
  // 3. 执行 git reset --hard
  const rollbackResult = rollbackToCommit(projectPath, targetCommit, {
    createBranch: options?.createBackup,
    branchName: options?.createBackup ? `backup/${versionId}-${Date.now()}` : undefined,
  });
  
  if (!rollbackResult.success) {
    throw new Error(rollbackResult.error || 'Rollback failed');
  }
  
  // 4. 更新版本记录
  const newRollbackCount = (version.rollback_count || 0) + 1;
  const now = new Date().toISOString();
  
  db.prepare(`
    UPDATE versions 
    SET rollback_count = ?, 
        last_rollback_at = ?,
        status = 'rolled_back'
    WHERE id = ?
  `).run(newRollbackCount, now, versionId);
  
  // 5. 记录回退历史
  const rollbackId = `rb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  // ... 保存到 rollbackHistory 数组或表
  
  return {
    success: true,
    rollbackId,
    commitHash: targetCommit,
    previousCommit: currentCommit,
    timestamp: now,
    rollbackCount: newRollbackCount,
    backupBranch: rollbackResult.newBranch,
  };
}

/**
 * 检查版本是否为当前 HEAD
 */
export function isVersionAtHead(versionId: string): {
  isCurrentHead: boolean;
  currentCommit: string;
  versionCommit: string;
} {
  const db = getDb();
  const version = db.prepare('SELECT commit_hash FROM versions WHERE id = ?').get(versionId) as { commit_hash?: string };
  
  const projectPath = getProjectPath(versionId);
  const currentCommit = getCurrentCommit(projectPath);
  
  return {
    isCurrentHead: currentCommit === version.commit_hash,
    currentCommit,
    versionCommit: version.commit_hash || '',
  };
}
```

### 6.2 确认对话框组件 (RollbackConfirmDialog.tsx)

```typescript
interface RollbackConfirmDialogProps {
  version: Version;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: { createBackup: boolean; reason: string }) => void;
}

export function RollbackConfirmDialog({ version, isOpen, onClose, onConfirm }: RollbackConfirmDialogProps) {
  const [createBackup, setCreateBackup] = useState(true);
  const [reason, setReason] = useState('');
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            确认回退版本
          </DialogTitle>
          <DialogDescription>
            您即将把项目代码回退到版本 <strong>{version.version}</strong> 对应的状态。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTitle>⚠️ 重要提示</AlertTitle>
            <AlertDescription>
              回退操作会执行 <code>git reset --hard</code>，
              这将<strong>永久删除</strong>目标版本之后的所有提交。
              请确保您已备份重要代码。
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="backup" 
              checked={createBackup}
              onCheckedChange={(checked) => setCreateBackup(checked as boolean)}
            />
            <label htmlFor="backup" className="text-sm">
              创建备份分支
            </label>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm">回退原因（可选）</label>
            <Textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：修复线上严重问题..."
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button 
            variant="destructive" 
            onClick={() => onConfirm({ createBackup, reason })}
          >
            确认回退
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 7. 前端集成示例

### 7.1 VersionDetails 页面修改

```typescript
// app/versions/[id]/page.tsx

export default function VersionDetailPage() {
  const [isRollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [headStatus, setHeadStatus] = useState<{ isCurrentHead: boolean } | null>(null);
  
  const rollbackMutation = useRollbackVersion();
  
  // 加载时检查 HEAD 状态
  useEffect(() => {
    if (id) {
      getVersionHeadStatus(id).then(setHeadStatus);
    }
  }, [id]);
  
  const handleRollback = async (options: { createBackup: boolean; reason: string }) => {
    await rollbackMutation.mutateAsync({
      versionId: id,
      targetCommit: version?.commitHash || '',
      ...options,
    });
    setRollbackDialogOpen(false);
    // 刷新版本数据
    const refreshed = await getVersion(id);
    setVersion(refreshed);
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* ... 现有内容 ... */}
      
      {/* 回退按钮 - 仅非 HEAD 时显示 */}
      {headStatus && !headStatus.isCurrentHead && version?.status !== 'rolled_back' && (
        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            className="text-amber-600 border-amber-200 hover:bg-amber-50"
            onClick={() => setRollbackDialogOpen(true)}
          >
            <History className="w-4 h-4 mr-2" />
            回退到此版本
          </Button>
        </div>
      )}
      
      {/* 回退历史展示 */}
      {version?.rollbackCount > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mt-4">
          <div className="flex items-center gap-2 text-amber-700">
            <History className="w-4 h-4" />
            <span>已回退 {version.rollbackCount} 次</span>
            {version.lastRollbackAt && (
              <span className="text-sm text-amber-600">
                （最近：{new Date(version.lastRollbackAt).toLocaleString('zh-CN')}）
              </span>
            )}
          </div>        </div>
      )}
      
      {/* 确认对话框 */}
      <RollbackConfirmDialog
        version={version}
        isOpen={isRollbackDialogOpen}
        onClose={() => setRollbackDialogOpen(false)}
        onConfirm={handleRollback}
      />
    </div>
  );
}
```

---

## 8. 数据库迁移脚本

```sql
-- migrations/xxx_add_version_rollback_fields.sql
-- 添加版本回退相关字段

ALTER TABLE versions ADD COLUMN rollback_count INTEGER DEFAULT 0;
ALTER TABLE versions ADD COLUMN last_rollback_at TEXT;

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_versions_rollback ON versions(rollback_count, last_rollback_at);

-- 更新说明：
-- rollback_count: 记录该版本被回退的次数
-- last_rollback_at: ISO 8601 格式的时间戳，记录最近一次回退时间
```

---

## 9. 验收标准对照

| 验收项 | 实现方案 | 验证方式 |
|--------|----------|----------|
| 版本回退 API | `POST /api/v1/versions/:id/rollback` | API 测试 |
| git reset --hard 执行 | versionRollbackService.ts 调用 rollbackService | 检查项目目录 git log |
| VersionRecord status 更新 | SQLite UPDATE 语句 | 数据库查询验证 |
| rollbackCount 累加 | 事务内更新 versions 表 | API 响应验证 |
| lastRollbackAt 更新 | ISO 时间戳写入 | API 响应验证 |
| 回退按钮显示控制 | `getVersionHeadStatus` API + isCurrentHead 判断 | UI 测试 |
| 确认对话框 | RollbackConfirmDialog 组件 | 浏览器操作 |
| Build 通过 | TypeScript + ESLint | `npm run build` |

---

## 10. 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| git reset --hard 误操作 | 中 | 代码丢失 | 强制创建备份分支，确认对话框 |
| 并发回退冲突 | 低 | 状态不一致 | 添加版本状态锁（status=rolling_back） |
| commit_hash 为空 | 中 | 无法回退 | API 层校验，返回友好错误 |
| 项目路径不存在 | 低 | 回退失败 | 前置检查，清理无效版本记录 |

---

## 11. 与现有回退功能的整合

当前系统已有两类回退实现：

1. **BuildRecord 回退** (`/builds/:id/rollback`) - 基于构建记录
2. **Version 回退** (`/versions/:id/rollback`) - 基于版本记录（本次强化）

**整合策略**:
- 保留两者并存，不同场景使用不同 API
- Build 回退用于 CI/CD 场景（回退到某次构建状态）
- Version 回退用于产品管理场景（回退到某个发布版本）
- 共享底层 `rollbackService.ts` 的 git 操作能力

---

**设计人**: architect  
**日期**: 2026-03-19  
**关联 Issue**: #75
