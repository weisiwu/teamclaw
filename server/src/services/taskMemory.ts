/**
 * Task Memory 服务
 * 任务机制模块 - 任务上下文/记忆化管理
 *
 * 基于 SessionID 的上下文注入、工作进度持久化
 * 持久化：PostgreSQL task_memory 表 + 内存 Map 缓存
 * 新增：LLM 摘要生成、向量化存储、语义检索
 */

import { Task } from '../models/task.js';
import { llmService } from './llmService.js';
import { addDocuments, query } from './vectorStore.js';
import { taskRepo } from '../db/repositories/taskRepo.js';
import { taskMemoryRepo } from '../db/repositories/taskMemoryRepo.js';

const TASK_MEMORY_COLLECTION = 'task_memory';

// ── 类型定义 ────────────────────────────────────────

interface ContextMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface TaskCheckpoint {
  id: string;
  progress: number;
  summary: string;
  timestamp: string;
}

interface TaskContext {
  taskId: string;
  sessionId: string;
  messages: ContextMessage[];
  checkpoints: TaskCheckpoint[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSummary {
  summary: string;
  keyChanges: string[];
  techStack: string[];
  patterns: string[];
}

export interface TaskSearchResult {
  taskId: string;
  title: string;
  summary: string;
  similarity: number;
  completedAt: string;
}

// ── 内存存储服务（原有功能）───────────────────────────

class TaskMemoryService {
  private static instance: TaskMemoryService;

  private contexts: Map<string, TaskContext> = new Map();
  private readonly MAX_MESSAGES_PER_TASK = 200;
  private readonly MAX_CHECKPOINTS_PER_TASK = 20;
  private readonly MAX_CONTEXTS = 1000;

  private constructor() {
    this.loadFromDb().catch(err => {
      console.warn('[taskMemory] Failed to load contexts from DB on startup:', err);
    });
  }

  private async loadFromDb(): Promise<void> {
    try {
      const rows = await taskMemoryRepo.findAll();
      for (const row of rows) {
        const ctx: TaskContext = {
          taskId: row.task_id,
          sessionId: row.session_id,
          messages: row.messages as ContextMessage[],
          checkpoints: row.checkpoints as TaskCheckpoint[],
          summary: row.summary ?? undefined,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        };
        this.contexts.set(row.context_key, ctx);
      }
      console.log(`[taskMemory] Loaded ${rows.length} contexts from PostgreSQL`);
    } catch (err) {
      console.warn('[taskMemory] Could not load from DB:', err);
    }
  }

  static getInstance(): TaskMemoryService {
    if (!TaskMemoryService.instance) {
      TaskMemoryService.instance = new TaskMemoryService();
    }
    return TaskMemoryService.instance;
  }

  async getOrCreateContext(taskId: string, sessionId: string): Promise<TaskContext> {
    const key = `${sessionId}:${taskId}`;
    if (!this.contexts.has(key)) {
      const now = new Date().toISOString();
      this.contexts.set(key, {
        taskId,
        sessionId,
        messages: [],
        checkpoints: [],
        createdAt: now,
        updatedAt: now,
      });
      this.enforceMemoryLimit();
    }
    const ctx = this.contexts.get(key)!;
    await this.persistContext(key, ctx);
    return ctx;
  }

  getContext(taskId: string, sessionId: string): TaskContext | undefined {
    return this.contexts.get(`${sessionId}:${taskId}`);
  }

  buildContextPrompt(taskId: string, sessionId: string): string {
    const ctx = this.getContext(taskId, sessionId);
    if (!ctx) return '';

    const lines: string[] = [];
    lines.push(`\n<!-- TaskContext: ${taskId} -->`);
    lines.push(
      `<task_progress>${ctx.checkpoints.length > 0 ? ctx.checkpoints[ctx.checkpoints.length - 1].progress : 0}%</task_progress>`
    );

    if (ctx.summary) {
      lines.push(`<task_summary>${ctx.summary}</task_summary>`);
    }

    if (ctx.checkpoints.length > 0) {
      lines.push('<task_checkpoints>');
      for (const cp of ctx.checkpoints.slice(-3)) {
        lines.push(`  [${cp.progress}%] ${cp.summary}`);
      }
      lines.push('</task_checkpoints>');
    }

    lines.push('<!-- /TaskContext -->');
    return lines.join('\n');
  }

  async addMessage(
    taskId: string,
    sessionId: string,
    role: ContextMessage['role'],
    content: string
  ): Promise<void> {
    const ctx = await this.getOrCreateContext(taskId, sessionId);
    ctx.messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    });
    ctx.updatedAt = new Date().toISOString();

    if (ctx.messages.length > this.MAX_MESSAGES_PER_TASK) {
      ctx.messages = ctx.messages.slice(-this.MAX_MESSAGES_PER_TASK);
    }
    await this.persistContext(`${sessionId}:${taskId}`, ctx);
  }

  async createCheckpoint(
    taskId: string,
    sessionId: string,
    progress: number,
    summary: string
  ): Promise<TaskCheckpoint> {
    const ctx = await this.getOrCreateContext(taskId, sessionId);
    const checkpoint: TaskCheckpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      progress,
      summary,
      timestamp: new Date().toISOString(),
    };
    ctx.checkpoints.push(checkpoint);
    ctx.updatedAt = checkpoint.timestamp;

    if (ctx.checkpoints.length > this.MAX_CHECKPOINTS_PER_TASK) {
      ctx.checkpoints = ctx.checkpoints.slice(-this.MAX_CHECKPOINTS_PER_TASK);
    }
    await this.persistContext(`${sessionId}:${taskId}`, ctx);

    return checkpoint;
  }

  async updateSummary(taskId: string, sessionId: string, summary: string): Promise<void> {
    const ctx = await this.getOrCreateContext(taskId, sessionId);
    ctx.summary = summary;
    ctx.updatedAt = new Date().toISOString();
    await this.persistContext(`${sessionId}:${taskId}`, ctx);
  }

  getTaskMemorySummary(taskId: string): {
    messages: number;
    checkpoints: number;
    summary?: string;
    lastUpdated: string;
  } | null {
    for (const ctx of this.contexts.values()) {
      if (ctx.taskId === taskId) {
        return {
          messages: ctx.messages.length,
          checkpoints: ctx.checkpoints.length,
          summary: ctx.summary,
          lastUpdated: ctx.updatedAt,
        };
      }
    }
    return null;
  }

  clearContext(taskId: string, sessionId: string): boolean {
    const key = `${sessionId}:${taskId}`;
    taskMemoryRepo.delete(taskId, sessionId).catch(err =>
      console.warn('[taskMemory] Failed to delete from DB:', err)
    );
    return this.contexts.delete(key);
  }

  /**
   * 持久化上下文到数据库（非阻塞）
   */
  private async persistContext(key: string, ctx: TaskContext): Promise<void> {
    // Strip sessionId from key (key = "${sessionId}:${taskId}")
    const parts = key.includes(':') ? key.split(':') : [key, key];
    const sessionId = parts[0];
    const taskId = parts[1];
    try {
      // Persist to task_memory table
      await taskMemoryRepo.upsert({
        taskId,
        sessionId,
        messages: ctx.messages,
        checkpoints: ctx.checkpoints,
        summary: ctx.summary,
      });
      // Also update contextSnapshot in tasks table for backward compatibility
      taskRepo.upsert({
        taskId,
        title: taskId,
        contextSnapshot: {
          messages: ctx.messages,
          checkpoints: ctx.checkpoints,
          summary: ctx.summary,
          createdAt: ctx.createdAt,
          updatedAt: ctx.updatedAt,
        },
      }).catch(err => console.warn('[taskMemory] Failed to update taskRepo contextSnapshot:', err));
    } catch (err) {
      console.warn(
        `[taskMemory] Failed to persist context for ${key}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  private enforceMemoryLimit(): void {
    if (this.contexts.size > this.MAX_CONTEXTS) {
      const entries = Array.from(this.contexts.entries());
      entries.sort((a, b) => a[1].updatedAt.localeCompare(b[1].updatedAt));
      const toDelete = entries.slice(0, Math.floor(this.MAX_CONTEXTS * 0.2));
      for (const [key] of toDelete) {
        this.contexts.delete(key);
      }
    }
  }

  // ── 新增：LLM 摘要生成 ────────────────────────────────

  /**
   * 任务完成后生成摘要并向量化
   */
  async onTaskCompleted(task: Task): Promise<TaskSummary | null> {
    try {
      const sessionId = task.sessionId || task.taskId;
      const ctx = this.getContext(task.taskId, sessionId);

      // 1. 收集任务上下文：改动文件、Git commits、执行日志
      const context = {
        taskId: task.taskId,
        title: task.title,
        description: task.description,
        tags: task.tags,
        result: task.result,
        assignedAgent: task.assignedAgent,
        messages: ctx?.messages.slice(-20).map(m => `[${m.role}] ${m.content}`) || [],
        checkpoints: ctx?.checkpoints.map(cp => `[${cp.progress}%] ${cp.summary}`) || [],
        progress: task.progress,
      };

      // 2. 调用 LLM 生成结构化摘要
      const response = await llmService.chat({
        tier: 'light',
        messages: [
          {
            role: 'system',
            content: `你是一个任务分析助手。请根据以下任务信息生成结构化摘要。
要求：返回一个合法的 JSON 对象，格式如下，不要添加任何额外说明：
{
  "summary": "任务完成情况的一两句话总结",
  "keyChanges": ["关键改动1", "关键改动2"],
  "techStack": ["使用的技术栈1", "使用的技术栈2"],
  "patterns": ["设计模式或架构模式1", "模式2"]
}`,
          },
          { role: 'user', content: JSON.stringify(context, null, 2) },
        ],
      });

      let parsed: TaskSummary;
      try {
        parsed = JSON.parse(response.content) as TaskSummary;
      } catch {
        // 如果 JSON 解析失败，尝试提取 JSON
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]) as TaskSummary;
        } else {
          parsed = {
            summary: response.content.slice(0, 200),
            keyChanges: [],
            techStack: [],
            patterns: [],
          };
        }
      }

      // 3. 向量化存储到 ChromaDB
      const docContent = [
        parsed.summary,
        ...parsed.keyChanges,
        ...parsed.techStack,
        ...parsed.patterns,
      ].join(' | ');

      await addDocuments(
        TASK_MEMORY_COLLECTION,
        [docContent],
        [task.taskId],
        [
          {
            taskId: task.taskId,
            title: task.title,
            completedAt: task.completedAt || new Date().toISOString(),
            tags: task.tags.join(','),
            filesChanged: parsed.keyChanges.join(','),
            summary: parsed.summary,
            techStack: parsed.techStack.join(','),
          },
        ]
      );

      // 4. 更新内存摘要
      this.updateSummary(task.taskId, sessionId, parsed.summary);

      console.log(`[taskMemory] Task summary generated and vectorized for ${task.taskId}`);
      return parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[taskMemory] Failed to generate summary for ${task.taskId}:`, msg);
      return null;
    }
  }

  /**
   * 语义检索相关历史任务
   */
  async searchSimilarTasks(queryText: string, topK: number = 5): Promise<TaskSearchResult[]> {
    try {
      const results = await query(TASK_MEMORY_COLLECTION, queryText, topK);

      return results.map(r => {
        const meta = r.metadata || {};
        return {
          taskId: String(meta.taskId || r.id),
          title: String(meta.title || ''),
          summary: r.document || '',
          similarity: 1 - (r.distance || 0), // ChromaDB distance 转换为相似度
          completedAt: String(meta.completedAt || ''),
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[taskMemory] Semantic search failed:`, msg);
      return [];
    }
  }

  /**
   * 为新任务注入历史上下文
   */
  async enrichTaskContext(task: Task): Promise<string> {
    try {
      const similar = await this.searchSimilarTasks(
        `${task.title} ${task.description} ${task.tags.join(' ')}`,
        3
      );

      if (similar.length === 0) return '';

      return similar
        .map(
          (s, i) =>
            `[参考任务 ${i + 1}] ${s.title}\n摘要：${s.summary}\n相似度：${(s.similarity * 100).toFixed(1)}%`
        )
        .join('\n\n');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[taskMemory] Failed to enrich context for task:`, msg);
      return '';
    }
  }

  /**
   * 获取任务摘要（从向量库）
   */
  async getTaskSummary(taskId: string): Promise<TaskSummary | null> {
    // 尝试从内存中获取
    for (const ctx of this.contexts.values()) {
      if (ctx.taskId === taskId && ctx.summary) {
        return {
          summary: ctx.summary,
          keyChanges: [],
          techStack: [],
          patterns: [],
        };
      }
    }
    return null;
  }

  /**
   * 获取与某任务相似的历史任务
   */
  async getSimilarTasks(taskId: string, topK: number = 5): Promise<TaskSearchResult[]> {
    const task = this.searchSimilarTasks(taskId, topK + 1);
    // 排除自身
    return (await task).filter(r => r.taskId !== taskId).slice(0, topK);
  }
}

export const taskMemory = TaskMemoryService.getInstance();
