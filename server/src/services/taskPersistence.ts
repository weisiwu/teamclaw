/**
 * Task Persistence 服务
 * 任务机制模块 - 任务 Markdown 文件持久化
 *
 * 将任务按状态存储到 data/tasks/{inbox,dispatched,completed,suspended,archived}/ 目录
 */

import * as fs from 'fs';
import * as path from 'path';
import { Task, TaskStatus } from '../models/task.js';

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
  private static instance: TaskPersistence;

  private constructor() {
    // 确保基础目录存在
    this.ensureBaseDirs();
  }

  static getInstance(): TaskPersistence {
    if (!TaskPersistence.instance) {
      TaskPersistence.instance = new TaskPersistence();
    }
    return TaskPersistence.instance;
  }

  private ensureBaseDirs(): void {
    const dirs = ['inbox', 'dispatched', 'completed', 'suspended', 'archived'];
    for (const dir of dirs) {
      const dirPath = path.join(TASK_DIR, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  /**
   * 将任务写入对应状态目录（Markdown 格式）
   */
  async persist(task: Task): Promise<string> {
    const dir = STATUS_DIR_MAP[task.status] || 'inbox';
    const targetDir = path.join(TASK_DIR, dir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, `${task.taskId}.md`);
    const content = this.renderMarkdown(task);
    fs.writeFileSync(filePath, content, 'utf-8');

    console.log(`[taskPersistence] Task ${task.taskId} persisted to ${filePath}`);
    return filePath;
  }

  /**
   * 状态变更时移动文件到新目录
   */
  async move(taskId: string, oldStatus: TaskStatus, newStatus: TaskStatus): Promise<void> {
    const oldDir = STATUS_DIR_MAP[oldStatus] || 'inbox';
    const newDir = STATUS_DIR_MAP[newStatus] || 'inbox';

    // 如果目录没变，不需要移动
    if (oldDir === newDir) return;

    const oldPath = path.join(TASK_DIR, oldDir, `${taskId}.md`);
    const newDirPath = path.join(TASK_DIR, newDir);
    const newPath = path.join(TASK_DIR, newDir, `${taskId}.md`);

    if (fs.existsSync(oldPath)) {
      if (!fs.existsSync(newDirPath)) {
        fs.mkdirSync(newDirPath, { recursive: true });
      }
      fs.renameSync(oldPath, newPath);
      console.log(`[taskPersistence] Task ${taskId} moved from ${oldDir} to ${newDir}`);
    }
  }

  /**
   * 读取任务文件
   */
  async read(taskId: string, status?: TaskStatus): Promise<string | null> {
    if (status) {
      const dir = STATUS_DIR_MAP[status] || 'inbox';
      const filePath = path.join(TASK_DIR, dir, `${taskId}.md`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      return null;
    }

    // 搜索所有目录
    const dirs = ['inbox', 'dispatched', 'completed', 'suspended', 'archived'];
    for (const dir of dirs) {
      const filePath = path.join(TASK_DIR, dir, `${taskId}.md`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    }
    return null;
  }

  /**
   * 删除任务文件
   */
  async remove(taskId: string, status?: TaskStatus): Promise<boolean> {
    if (status) {
      const dir = STATUS_DIR_MAP[status] || 'inbox';
      const filePath = path.join(TASK_DIR, dir, `${taskId}.md`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    }

    // 搜索所有目录
    const dirs = ['inbox', 'dispatched', 'completed', 'suspended', 'archived'];
    for (const dir of dirs) {
      const filePath = path.join(TASK_DIR, dir, `${taskId}.md`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    }
    return false;
  }

  /**
   * 将任务渲染为 Markdown
   */
  private renderMarkdown(task: Task): string {
    const checkpoints = task.progress > 0 ? `\n## 进度\n\n**${task.progress}%**\n` : '';
    const result = task.result ? `\n## 执行结果\n\n${task.result}\n` : '';
    const tags = task.tags.length > 0 ? `\n- **标签**: ${task.tags.join(', ')}\n` : '';
    const assignedAgent = task.assignedAgent ? `\n- **执行者**: ${task.assignedAgent}\n` : '';
    const parentTask = task.parentTaskId ? `\n- **父任务**: ${task.parentTaskId}\n` : '';
    const dependsOn = task.dependsOn.length > 0 ? `\n- **依赖**: ${task.dependsOn.join(', ')}\n` : '';
    const retry = task.retryCount > 0 ? `\n- **重试次数**: ${task.retryCount}\n` : '';
    const versionId = task.versionId ? `\n- **版本**: ${task.versionId}\n` : '';

    return `# ${task.title}

- **ID**: ${task.taskId}
- **状态**: ${task.status}
- **优先级**: ${task.priority}
- **创建时间**: ${task.createdAt}
- **更新时间**: ${task.updatedAt}
- **完成时间**: ${task.completedAt || '-'}
- **创建者**: ${task.createdBy}${assignedAgent}${tags}${parentTask}${dependsOn}${retry}${versionId}

## 描述

${task.description || '（无）'}
${checkpoints}${result}
`;
  }
}

export const taskPersistence = TaskPersistence.getInstance();
