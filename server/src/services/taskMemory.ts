/**
 * Task Memory 服务
 * 任务机制模块 - 任务上下文/记忆化管理
 * 
 * 基于 SessionID 的上下文注入、工作进度持久化
 * 当前为内存存储，预留 DB 接入接口
 */

interface ContextMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface TaskCheckpoint {
  id: string;
  progress: number;         // 0-100
  summary: string;          // 检查点摘要
  timestamp: string;
}

interface TaskContext {
  taskId: string;
  sessionId: string;
  messages: ContextMessage[];
  checkpoints: TaskCheckpoint[];
  summary?: string;        // 自动生成的摘要
  createdAt: string;
  updatedAt: string;
}

class TaskMemoryService {
  private static instance: TaskMemoryService;

  // Session -> TaskContext
  private contexts: Map<string, TaskContext> = new Map();

  // 内存限制
  private readonly MAX_MESSAGES_PER_TASK = 200;
  private readonly MAX_CHECKPOINTS_PER_TASK = 20;
  private readonly MAX_CONTEXTS = 1000;

  private constructor() {}

  static getInstance(): TaskMemoryService {
    if (!TaskMemoryService.instance) {
      TaskMemoryService.instance = new TaskMemoryService();
    }
    return TaskMemoryService.instance;
  }

  /**
   * 获取或创建任务上下文
   */
  getOrCreateContext(taskId: string, sessionId: string): TaskContext {
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
    return this.contexts.get(key)!;
  }

  /**
   * 获取任务上下文
   */
  getContext(taskId: string, sessionId: string): TaskContext | undefined {
    return this.contexts.get(`${sessionId}:${taskId}`);
  }

  /**
   * 注入上下文到 session（返回可用于 system prompt 的文本）
   */
  buildContextPrompt(taskId: string, sessionId: string): string {
    const ctx = this.getContext(taskId, sessionId);
    if (!ctx) return '';

    const lines: string[] = [];
    lines.push(`\n<!-- TaskContext: ${taskId} -->`);
    lines.push(`<task_progress>${ctx.checkpoints.length > 0 ? ctx.checkpoints[ctx.checkpoints.length - 1].progress : 0}%</task_progress>`);

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

  /**
   * 添加消息到上下文
   */
  addMessage(taskId: string, sessionId: string, role: ContextMessage['role'], content: string): void {
    const ctx = this.getOrCreateContext(taskId, sessionId);
    ctx.messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    });
    ctx.updatedAt = new Date().toISOString();

    // 限制消息数量
    if (ctx.messages.length > this.MAX_MESSAGES_PER_TASK) {
      ctx.messages = ctx.messages.slice(-this.MAX_MESSAGES_PER_TASK);
    }
  }

  /**
   * 创建检查点
   */
  createCheckpoint(taskId: string, sessionId: string, progress: number, summary: string): TaskCheckpoint {
    const ctx = this.getOrCreateContext(taskId, sessionId);
    const checkpoint: TaskCheckpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      progress,
      summary,
      timestamp: new Date().toISOString(),
    };
    ctx.checkpoints.push(checkpoint);
    ctx.updatedAt = checkpoint.timestamp;

    // 限制检查点数量
    if (ctx.checkpoints.length > this.MAX_CHECKPOINTS_PER_TASK) {
      ctx.checkpoints = ctx.checkpoints.slice(-this.MAX_CHECKPOINTS_PER_TASK);
    }

    return checkpoint;
  }

  /**
   * 更新任务摘要
   */
  updateSummary(taskId: string, sessionId: string, summary: string): void {
    const ctx = this.getOrCreateContext(taskId, sessionId);
    ctx.summary = summary;
    ctx.updatedAt = new Date().toISOString();
  }

  /**
   * 获取任务的所有上下文（给前端展示）
   */
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

  /**
   * 清除任务上下文
   */
  clearContext(taskId: string, sessionId: string): boolean {
    return this.contexts.delete(`${sessionId}:${taskId}`);
  }

  /**
   * 限制内存使用
   */
  private enforceMemoryLimit(): void {
    if (this.contexts.size > this.MAX_CONTEXTS) {
      // 删除最老的上下文
      const entries = Array.from(this.contexts.entries());
      entries.sort((a, b) => a[1].updatedAt.localeCompare(b[1].updatedAt));
      const toDelete = entries.slice(0, Math.floor(this.MAX_CONTEXTS * 0.2));
      for (const [key] of toDelete) {
        this.contexts.delete(key);
      }
    }
  }
}

export const taskMemory = TaskMemoryService.getInstance();
