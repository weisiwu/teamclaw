# 【Feature】F3 任务记忆化与语义检索

> 优先级：高
> 前置依赖：【P0】H1 数据存储统一、【P1】M4 向量化批量处理
> 关联模块：[任务机制模块](../modules/任务机制模块.md)

---

## 1. 现状分析

### 1.1 已有代码

| 文件 | 状态 | 说明 |
|------|------|------|
| `server/src/services/taskLifecycle.ts` | 已实现 | 任务状态机（内存存储），状态流转 hooks |
| `server/src/services/taskFlow.ts` | 已实现 | 父子任务、依赖管理 |
| `server/src/services/taskMemory.ts` | 骨架已有 | 任务记忆接口，但无向量化实现 |
| `server/src/services/taskStats.ts` | 已实现 | 任务统计聚合 |
| `server/src/services/taskScheduler.ts` | 已实现 | 任务调度 |
| `server/src/services/vectorStore.ts` | 已实现 | ChromaDB 向量存储（add/query/delete） |
| `server/src/models/task.ts` | 已实现 | Task 数据模型完整定义 |

### 1.2 缺失功能

- **任务完成时 LLM 摘要生成**：任务完成后无自动调用 LLM 生成改动摘要的逻辑
- **任务摘要向量化存储**：`taskMemory.ts` 未调用 `vectorStore` 将任务摘要嵌入 ChromaDB
- **语义检索**：无法通过自然语言查询找到相似历史任务
- **任务文件持久化**：任务文件未按状态写入 `tasks/inbox/`、`tasks/dispatched/` 等目录
- **任务上下文快照**：`contextSnapshot` 字段虽然定义了，但从未被写入有意义的数据
- **历史任务辅助决策**：Agent 执行新任务时无法自动检索相关历史任务作为参考

---

## 2. 目标

```
任务完成
  │
  ├── 1. LLM 生成任务摘要（改动文件、改动说明、关联 commit）
  ├── 2. 摘要向量化写入 ChromaDB（collection: task_memory）
  ├── 3. 任务文件持久化到 tasks/completed/ 目录
  └── 4. 更新任务记录到 PostgreSQL

新任务创建时
  │
  ├── 1. 语义检索相关历史任务
  ├── 2. 将相关任务摘要注入 Agent Prompt（作为上下文）
  └── 3. 记录上下文快照
```

---

## 3. 实现步骤

### Step 1：任务完成 Hook — LLM 摘要生成

在 `taskLifecycle.ts` 的状态转换 hook 中增加完成后处理：

```typescript
// server/src/services/taskMemory.ts

import { llmService } from './llmService.js';
import { vectorStore } from './vectorStore.js';

const TASK_MEMORY_COLLECTION = 'task_memory';

export class TaskMemoryService {
  /**
   * 任务完成后生成摘要并向量化
   */
  async onTaskCompleted(task: Task): Promise<TaskSummary> {
    // 1. 收集任务上下文：改动文件、Git commits、执行日志
    const context = await this.collectContext(task);

    // 2. 调用 LLM 生成结构化摘要
    const summary = await llmService.chat({
      tier: 'light', // 用轻量模型降低成本
      messages: [
        {
          role: 'system',
          content: '请根据以下任务信息生成结构化摘要，JSON 格式：{ "summary": "...", "keyChanges": [...], "techStack": [...], "patterns": [...] }',
        },
        { role: 'user', content: JSON.stringify(context) },
      ],
    });

    const parsed = JSON.parse(summary.content) as TaskSummary;

    // 3. 向量化存储到 ChromaDB
    await vectorStore.addDocuments(TASK_MEMORY_COLLECTION, [
      {
        id: task.taskId,
        content: parsed.summary,
        metadata: {
          taskId: task.taskId,
          title: task.title,
          completedAt: task.completedAt,
          tags: task.tags.join(','),
          filesChanged: parsed.keyChanges.join(','),
        },
      },
    ]);

    return parsed;
  }

  /**
   * 语义检索相关历史任务
   */
  async searchSimilarTasks(query: string, topK: number = 5): Promise<TaskSearchResult[]> {
    const results = await vectorStore.query(TASK_MEMORY_COLLECTION, query, topK);
    return results.map(r => ({
      taskId: r.metadata.taskId,
      title: r.metadata.title,
      summary: r.content,
      similarity: r.score,
      completedAt: r.metadata.completedAt,
    }));
  }

  /**
   * 为新任务注入历史上下文
   */
  async enrichTaskContext(task: Task): Promise<string> {
    const similar = await this.searchSimilarTasks(task.title + ' ' + task.description, 3);
    if (similar.length === 0) return '';

    return similar.map((s, i) =>
      `[参考任务 ${i + 1}] ${s.title}\n摘要：${s.summary}\n相似度：${(s.similarity * 100).toFixed(1)}%`
    ).join('\n\n');
  }
}
```

### Step 2：任务文件持久化

**新建 `server/src/services/taskPersistence.ts`**：

```typescript
import * as fs from 'fs';
import * as path from 'path';

const TASK_DIR = path.join(process.cwd(), 'data', 'tasks');

const STATUS_DIR_MAP: Record<string, string> = {
  pending: 'inbox',
  running: 'dispatched',
  done: 'completed',
  suspended: 'suspended',
  cancelled: 'archived',
  failed: 'archived',
};

export class TaskPersistence {
  /**
   * 将任务写入对应状态目录（Markdown 格式）
   */
  async persist(task: Task): Promise<string> {
    const dir = STATUS_DIR_MAP[task.status] || 'inbox';
    const targetDir = path.join(TASK_DIR, dir);
    fs.mkdirSync(targetDir, { recursive: true });

    const filePath = path.join(targetDir, `${task.taskId}.md`);
    const content = this.renderMarkdown(task);
    fs.writeFileSync(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * 状态变更时移动文件到新目录
   */
  async move(taskId: string, oldStatus: string, newStatus: string): Promise<void> {
    const oldDir = path.join(TASK_DIR, STATUS_DIR_MAP[oldStatus] || 'inbox');
    const newDir = path.join(TASK_DIR, STATUS_DIR_MAP[newStatus] || 'inbox');
    const oldPath = path.join(oldDir, `${taskId}.md`);
    const newPath = path.join(newDir, `${taskId}.md`);

    if (fs.existsSync(oldPath)) {
      fs.mkdirSync(newDir, { recursive: true });
      fs.renameSync(oldPath, newPath);
    }
  }

  private renderMarkdown(task: Task): string {
    return `# ${task.title}

- **ID**: ${task.taskId}
- **状态**: ${task.status}
- **优先级**: ${task.priority}
- **创建时间**: ${task.createdAt}
- **完成时间**: ${task.completedAt || '-'}
- **创建者**: ${task.createdBy}
- **标签**: ${task.tags.join(', ')}

## 描述

${task.description}

## 执行结果

${task.result || '（无）'}
`;
  }
}
```

### Step 3：上下文快照记录

在任务创建时自动记录当前项目状态快照：

```typescript
// server/src/services/contextSnapshot.ts

export class ContextSnapshotService {
  /**
   * 生成当前项目上下文快照
   */
  async capture(sessionId: string): Promise<string> {
    const snapshot = {
      timestamp: new Date().toISOString(),
      // 当前活跃任务
      activeTasks: taskLifecycle.getTasksByStatus('running').map(t => ({
        taskId: t.taskId,
        title: t.title,
      })),
      // 当前分支信息
      gitBranch: await gitService.getCurrentBranch(),
      // 最近 5 个 commit
      recentCommits: await gitService.getRecentCommits(5),
      // Agent 状态
      agentStates: agentService.getAllAgents().map(a => ({
        name: a.name,
        status: a.status,
      })),
    };

    return JSON.stringify(snapshot);
  }
}
```

### Step 4：搜索 API 集成

**修改 `server/src/routes/search.ts`**：

```typescript
// 新增任务语义搜索端点
router.get('/tasks', async (req, res) => {
  const query = req.query.q as string;
  const topK = parseInt(req.query.topK as string) || 5;

  if (!query) {
    return res.status(400).json(error(400, 'query parameter "q" is required'));
  }

  const results = await taskMemory.searchSimilarTasks(query, topK);
  res.json(success({ list: results, total: results.length }));
});
```

### Step 5：集成到任务生命周期

**修改 `server/src/services/taskLifecycle.ts`**：

在状态转换 hook 中注入记忆化逻辑：

```typescript
// 注册完成 Hook
taskLifecycle.onStatusChange('done', async (task) => {
  // 1. 生成摘要并向量化
  await taskMemory.onTaskCompleted(task);

  // 2. 持久化到文件
  await taskPersistence.persist(task);
});

// 注册创建 Hook
taskLifecycle.onCreate(async (task) => {
  // 1. 记录上下文快照
  task.contextSnapshot = await contextSnapshot.capture(task.sessionId);

  // 2. 检索相关历史任务
  const historicalContext = await taskMemory.enrichTaskContext(task);
  if (historicalContext) {
    task.description += `\n\n---\n### 相关历史任务\n${historicalContext}`;
  }
});
```

---

## 4. 涉及文件

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `server/src/services/taskMemory.ts` | 实现 LLM 摘要 + 向量化存储 + 语义检索 |
| 新建 | `server/src/services/taskPersistence.ts` | 任务 Markdown 文件持久化 |
| 新建 | `server/src/services/contextSnapshot.ts` | 项目上下文快照 |
| 修改 | `server/src/services/taskLifecycle.ts` | 注入记忆化和持久化 Hook |
| 修改 | `server/src/services/vectorStore.ts` | 确保 task_memory collection 初始化 |
| 修改 | `server/src/routes/search.ts` | 新增任务语义搜索 API |
| 修改 | `app/tasks/page.tsx` | 添加语义搜索输入框 |
| 修改 | `app/tasks/[id]/page.tsx` | 展示任务摘要和相关历史任务 |

---

## 5. API 新增/修改

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/search/tasks?q=xxx&topK=5` | 语义搜索历史任务 |
| `GET` | `/api/v1/tasks/:taskId/summary` | 获取任务生成的摘要 |
| `GET` | `/api/v1/tasks/:taskId/context` | 获取任务创建时的上下文快照 |
| `GET` | `/api/v1/tasks/:taskId/similar` | 获取与该任务相似的历史任务 |

---

## 6. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 任务完成后自动调用 LLM 生成结构化摘要 | 日志 + API 查询 |
| 2 | 摘要成功写入 ChromaDB `task_memory` collection | ChromaDB 查询验证 |
| 3 | 语义搜索 API 返回相关度排序的历史任务 | curl 测试 |
| 4 | 任务文件按状态存储到 `data/tasks/{inbox,dispatched,completed}/` | 文件系统检查 |
| 5 | 状态变更时文件自动移动到对应目录 | 操作验证 |
| 6 | 新任务创建时 `contextSnapshot` 字段有真实快照数据 | API 查询 |
| 7 | 新任务创建时自动注入相关历史任务上下文 | 查看任务描述 |
| 8 | 前端任务详情页展示摘要和相关历史任务卡片 | 浏览器截图 |
| 9 | 前端任务列表页语义搜索框可用 | 浏览器操作 |
