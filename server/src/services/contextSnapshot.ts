/**
 * Context Snapshot 服务
 * 任务机制模块 - 项目上下文快照
 *
 * 在任务创建时自动记录当前项目状态快照：
 * - 当前活跃任务
 * - 当前 Git 分支信息
 * - 最近 Git commits
 * - Agent 运行时状态
 */

import { taskLifecycle } from './taskLifecycle.js';
import { getCurrentBranch, getGitLog } from './gitService.js';
import { getAllAgents } from './agentService.js';

export interface ContextSnapshot {
  timestamp: string;
  activeTasks: Array<{
    taskId: string;
    title: string;
    status: string;
  }>;
  gitBranch: string;
  recentCommits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
  }>;
  agentStates: Array<{
    name: string;
    status: string;
    currentTask: string | null;
  }>;
}

export class ContextSnapshotService {
  private static instance: ContextSnapshotService;

  private constructor() {}

  static getInstance(): ContextSnapshotService {
    if (!ContextSnapshotService.instance) {
      ContextSnapshotService.instance = new ContextSnapshotService();
    }
    return ContextSnapshotService.instance;
  }

  /**
   * 生成当前项目上下文快照
   */
  async capture(sessionId: string): Promise<string> {
    try {
      const runningTasks = taskLifecycle.getTasksByStatus('running');
      const pendingTasks = taskLifecycle.getTasksByStatus('pending');

      let gitBranch = 'unknown';
      let recentCommits: Array<{ hash: string; message: string; author: string; date: string }> = [];

      try {
        const defaultCwd = process.env.PROJECT_PATH || process.cwd();
        gitBranch = getCurrentBranch(defaultCwd);
        const commits = getGitLog(defaultCwd, { maxCount: 5 });
        recentCommits = commits.map(c => ({
          hash: c.shortHash,
          message: c.message.split('\n')[0],
          author: c.author,
          date: c.date,
        }));
      } catch (err) {
        // Git 操作失败不影响快照生成
        console.warn('[contextSnapshot] Git info unavailable:', err);
      }

      const agents = getAllAgents();

      const snapshot: ContextSnapshot = {
        timestamp: new Date().toISOString(),
        activeTasks: [
          ...runningTasks.map(t => ({ taskId: t.taskId, title: t.title, status: t.status })),
          ...pendingTasks.slice(0, 3).map(t => ({ taskId: t.taskId, title: t.title, status: t.status })),
        ],
        gitBranch,
        recentCommits,
        agentStates: agents.map(a => ({
          name: a.name,
          status: a.status,
          currentTask: a.currentTask || null,
        })),
      };

      const snapshotStr = JSON.stringify(snapshot);
      console.log(`[contextSnapshot] Captured snapshot for session ${sessionId}`);
      return snapshotStr;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[contextSnapshot] Failed to capture snapshot:', msg);
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        activeTasks: [],
        gitBranch: 'unknown',
        recentCommits: [],
        agentStates: [],
        error: msg,
      });
    }
  }

  /**
   * 获取快照摘要（供日志/通知使用）
   */
  getSnapshotSummary(snapshotStr: string): string {
    try {
      const snap: ContextSnapshot = JSON.parse(snapshotStr);
      const parts: string[] = [];

      if (snap.activeTasks.length > 0) {
        parts.push(`${snap.activeTasks.length} 个活跃任务`);
      }
      if (snap.gitBranch && snap.gitBranch !== 'unknown') {
        parts.push(`分支: ${snap.gitBranch}`);
      }
      if (snap.recentCommits.length > 0) {
        parts.push(`${snap.recentCommits.length} 个最近提交`);
      }
      if (snap.agentStates.length > 0) {
        const busyAgents = snap.agentStates.filter(a => a.status !== 'idle').length;
        if (busyAgents > 0) {
          parts.push(`${busyAgents} 个忙碌 Agent`);
        }
      }

      return parts.length > 0 ? parts.join(' | ') : '快照为空';
    } catch {
      return '快照解析失败';
    }
  }
}

export const contextSnapshot = ContextSnapshotService.getInstance();
