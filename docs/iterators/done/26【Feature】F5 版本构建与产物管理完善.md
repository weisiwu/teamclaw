# 【Feature】F5 版本构建与产物管理完善

> 优先级：中
> 前置依赖：【P0】H3 version 路由拆分、【Feature】F1 Agent 协作流程
> 关联模块：[版本管理模块](../modules/版本管理模块.md)

---

## 1. 现状分析

### 1.1 已有代码

| 文件 | 状态 | 说明 |
|------|------|------|
| `server/src/services/buildService.ts` | 已实现 | 读取 package.json 确定构建命令，执行构建，收集产物 |
| `server/src/services/artifactStore.ts` | 已实现 | 产物存储（内存 Map + 本地文件） |
| `server/src/services/branchService.ts` | 已实现 | 分支 CRUD、切换、合并（内存存储） |
| `server/src/services/autoBump.ts` | 已实现 | 自动版本号递增（hook 注册） |
| `server/src/services/changeTracker.ts` | 已实现 | 变更追踪（文件级别） |
| `server/src/services/changelogGenerator.ts` | 已实现 | Changelog 生成 |
| `server/src/services/gitService.ts` | 已实现 | Git 操作封装 |
| `server/src/routes/version.ts` | 已实现 | 版本路由（单文件过大，见 H3 拆分任务） |
| `server/src/routes/build.ts` | 已实现 | 构建路由 |
| `server/src/routes/artifact.ts` | 已实现 | 产物路由 |
| `server/src/routes/branch.ts` | 已实现 | 分支路由 |
| `server/src/routes/download.ts` | 已实现 | 下载路由 |

### 1.2 缺失功能（对照模块文档）

| 功能 | 模块文档描述 | 当前状态 |
|------|------------|---------|
| **版本回退** | 选择历史版本回退，创建 rollback 分支 | ❌ 未实现 |
| **版本对比** | 两个版本间文件差异对比 | ❌ 未实现 |
| **构建流水线 SSE** | 构建过程实时日志流推送 | ❌ 未实现 |
| **版本摘要向量化** | 版本摘要写入 ChromaDB 供检索 | ❌ 未实现 |
| **版本截图对比** | 版本发布前后页面截图 | ❌ 未实现 |
| **版本时间线** | 版本发布事件的 SSE 推送 | ❌ 未实现 |
| **AI Changelog** | 基于 commit 自动生成可读 Changelog | ⚠️ 有基础，未接 LLM |
| **产物打包下载** | 构建产物 zip 打包下载 | ⚠️ 基础下载有，打包未完善 |

---

## 2. 目标

完善版本管理核心能力：回退、对比、构建流式日志、版本摘要检索、AI Changelog。

---

## 3. 实现步骤

### Step 1：版本回退

**新建 `server/src/services/versionRollback.ts`**：

```typescript
export interface RollbackResult {
  success: boolean;
  rollbackBranch: string;   // e.g. rollback/v1.2.0_20260316
  previousVersion: string;
  targetVersion: string;
  commitHash: string;
  message: string;
}

export class VersionRollback {
  /**
   * 回退到指定版本
   * 1. 从 tag 获取对应 commit
   * 2. 创建 rollback 分支
   * 3. checkout 到该 commit
   * 4. 记录回退日志
   */
  async rollback(projectPath: string, targetVersion: string): Promise<RollbackResult> {
    const tagCommit = await gitService.getTagCommit(projectPath, targetVersion);
    if (!tagCommit) throw new Error(`Version tag ${targetVersion} not found`);

    const branchName = `rollback/${targetVersion}_${Date.now()}`;
    await gitService.createBranch(projectPath, branchName, tagCommit);
    await gitService.checkout(projectPath, branchName);

    return {
      success: true,
      rollbackBranch: branchName,
      previousVersion: await this.getCurrentVersion(projectPath),
      targetVersion,
      commitHash: tagCommit,
      message: `已回退到版本 ${targetVersion}，创建分支 ${branchName}`,
    };
  }

  /**
   * 获取可回退的版本列表
   */
  async listRollbackTargets(projectPath: string): Promise<Array<{
    version: string;
    tag: string;
    date: string;
    commitHash: string;
  }>>;
}
```

### Step 2：版本对比

**新建 `server/src/services/versionDiff.ts`**：

```typescript
export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: Array<{
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    insertions: number;
    deletions: number;
    diff?: string;  // unified diff 格式
  }>;
}

export class VersionDiffService {
  /**
   * 对比两个版本的差异
   */
  async diff(projectPath: string, fromTag: string, toTag: string): Promise<VersionDiff> {
    // git diff v1.0.0..v1.1.0 --stat
    // git diff v1.0.0..v1.1.0 -- file.ts
  }

  /**
   * 获取单个文件在两个版本间的详细 diff
   */
  async fileDiff(projectPath: string, fromTag: string, toTag: string, filePath: string): Promise<string>;
}
```

### Step 3：构建流水线 SSE

**修改 `server/src/services/buildService.ts`**：

```typescript
import { EventEmitter } from 'events';

export class BuildService extends EventEmitter {
  /**
   * 执行构建并实时推送日志
   * 使用 spawn 替代 exec，支持 stdout/stderr 流式读取
   */
  async buildWithStream(projectPath: string): Promise<BuildResult> {
    const child = spawn('npm', ['run', 'build'], { cwd: projectPath });

    child.stdout.on('data', (data) => {
      this.emit('log', { type: 'stdout', content: data.toString() });
    });

    child.stderr.on('data', (data) => {
      this.emit('log', { type: 'stderr', content: data.toString() });
    });

    // ... 等待完成
  }
}
```

**修改 `server/src/routes/build.ts`**：

```typescript
// SSE 端点：实时构建日志
router.get('/:buildId/logs/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const onLog = (log: { type: string; content: string }) => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  };

  buildService.on('log', onLog);

  req.on('close', () => {
    buildService.off('log', onLog);
  });
});
```

### Step 4：版本摘要向量化

**新建 `server/src/services/versionMemory.ts`**：

```typescript
const VERSION_MEMORY_COLLECTION = 'version_memory';

export class VersionMemoryService {
  /**
   * 版本发布后，将摘要向量化
   */
  async onVersionCreated(version: Version): Promise<void> {
    // 1. 生成版本摘要（改动文件、关联任务、commit 信息）
    const summary = await this.generateSummary(version);

    // 2. 写入 ChromaDB
    await vectorStore.addDocuments(VERSION_MEMORY_COLLECTION, [{
      id: version.versionId,
      content: summary,
      metadata: {
        versionId: version.versionId,
        tag: version.gitTag,
        branch: version.gitBranch,
        createdAt: version.createdAt,
      },
    }]);
  }

  /**
   * 语义搜索版本
   */
  async searchVersions(query: string, topK: number = 5): Promise<Array<{
    versionId: string;
    tag: string;
    summary: string;
    similarity: number;
  }>>;
}
```

### Step 5：AI Changelog 生成

**修改 `server/src/services/changelogGenerator.ts`**：

```typescript
export class ChangelogGenerator {
  /**
   * 基于 commit 列表调用 LLM 生成可读 Changelog
   */
  async generateAIChangelog(commits: Commit[], previousVersion: string, newVersion: string): Promise<string> {
    const commitSummary = commits.map(c => `- ${c.hash.slice(0, 7)} ${c.message}`).join('\n');

    const response = await llmService.chat({
      tier: 'light',
      messages: [
        {
          role: 'system',
          content: `你是一个技术文档编写者。根据以下 Git commit 列表，生成版本 ${newVersion} 的用户可读 Changelog。
分类为：🆕 新功能、🐛 Bug 修复、♻️ 重构、📝 文档。使用中文。`,
        },
        { role: 'user', content: commitSummary },
      ],
    });

    return `# ${newVersion}\n\n_发布日期：${new Date().toISOString().split('T')[0]}_\n\n${response.content}`;
  }
}
```

### Step 6：产物打包下载

**修改 `server/src/services/artifactStore.ts`**：

```typescript
import archiver from 'archiver';

export class ArtifactStore {
  /**
   * 将版本构建产物打包为 zip
   */
  async packageArtifacts(versionId: string): Promise<string> {
    const artifacts = this.getByVersion(versionId);
    const zipPath = path.join(this.storageDir, `${versionId}.zip`);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    for (const artifact of artifacts) {
      archive.file(artifact.path, { name: artifact.name });
    }
    await archive.finalize();

    return zipPath;
  }
}
```

---

## 4. 涉及文件

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `server/src/services/versionRollback.ts` | 版本回退服务 |
| 新建 | `server/src/services/versionDiff.ts` | 版本对比服务 |
| 新建 | `server/src/services/versionMemory.ts` | 版本摘要向量化 |
| 修改 | `server/src/services/buildService.ts` | SSE 流式构建日志 |
| 修改 | `server/src/services/changelogGenerator.ts` | AI Changelog 集成 |
| 修改 | `server/src/services/artifactStore.ts` | 产物 zip 打包 |
| 修改 | `server/src/routes/build.ts` | 新增 SSE 端点 |
| 修改 | `server/src/routes/version.ts` | 新增回退/对比 API |
| 修改 | `app/versions/[id]/page.tsx` | 版本详情页增加回退/对比/Changelog |
| 修改 | `app/versions/page.tsx` | 版本列表增加对比入口 |

---

## 5. API 新增

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/versions/:id/rollback` | 回退到指定版本 |
| `GET` | `/api/v1/versions/rollback-targets` | 获取可回退版本列表 |
| `GET` | `/api/v1/versions/diff?from=v1.0&to=v1.1` | 版本差异对比 |
| `GET` | `/api/v1/versions/diff/file?from=v1.0&to=v1.1&path=src/x.ts` | 单文件差异 |
| `GET` | `/api/v1/builds/:buildId/logs/stream` | SSE 构建日志流 |
| `GET` | `/api/v1/versions/:id/changelog` | AI 生成的 Changelog |
| `GET` | `/api/v1/versions/:id/artifacts/download` | 产物 zip 打包下载 |
| `GET` | `/api/v1/search/versions?q=xxx` | 语义搜索版本 |

---

## 6. 新增依赖

```json
{
  "archiver": "^6.0.0"
}
```

---

## 7. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 执行版本回退后创建 rollback 分支并切换成功 | `git branch` + `git log` |
| 2 | 版本对比 API 返回正确的文件差异和统计 | curl 验证 |
| 3 | 构建过程日志通过 SSE 实时推送到前端 | 浏览器 EventSource 测试 |
| 4 | 版本摘要写入 ChromaDB，语义搜索可检索 | 搜索 API 验证 |
| 5 | AI Changelog 按类别分组，内容可读 | API 返回结果审查 |
| 6 | 产物 zip 下载包含所有构建输出文件 | 下载并解压验证 |
| 7 | 前端版本详情页展示 Changelog 和回退按钮 | 浏览器截图 |
| 8 | 前端版本列表支持选择两个版本进行对比 | 浏览器操作 |
