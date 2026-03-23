/**
 * Import Task Repository — PostgreSQL CRUD (migrated from in-memory Map)
 */

import { query, queryOne, execute } from '../pg.js';

export interface ImportTaskRow {
  task_id: string;
  project_id: string;
  status: string;
  current_step: number;
  total_steps: number | null;
  steps: Record<string, unknown>[];
  started_at: Date;
  completed_at: Date | null;
  error_message: string | null;
}

export const importRepo = {
  async upsert(task: {
    taskId: string;
    projectId: string;
    status?: string;
    currentStep?: number;
    totalSteps?: number;
    steps?: Array<{ step: number; name: string; status: string; error?: string }>;
    startedAt?: string;
    completedAt?: string;
    errorMessage?: string;
  }): Promise<number> {
    const existing = await this.findById(task.taskId);
    if (existing) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;

      if (task.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(task.status); }
      if (task.currentStep !== undefined) { sets.push(`current_step = $${idx++}`); vals.push(task.currentStep); }
      if (task.completedAt !== undefined) { sets.push(`completed_at = $${idx++}`); vals.push(task.completedAt ? new Date(task.completedAt) : null); }
      if (task.errorMessage !== undefined) { sets.push(`error_message = $${idx++}`); vals.push(task.errorMessage); }
      if (task.steps !== undefined) { sets.push(`steps = $${idx++}`); vals.push(JSON.stringify(task.steps)); }

      if (sets.length === 0) return 0;
      vals.push(task.taskId);
      return execute(`UPDATE import_tasks SET ${sets.join(', ')} WHERE task_id = $${idx}`, vals);
    }

    return execute(`
      INSERT INTO import_tasks (task_id, project_id, status, current_step, total_steps, steps, started_at, completed_at, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      task.taskId,
      task.projectId,
      task.status ?? 'pending',
      task.currentStep ?? 0,
      task.totalSteps ?? null,
      task.steps ? JSON.stringify(task.steps) : null,
      task.startedAt ? new Date(task.startedAt) : new Date(),
      task.completedAt ? new Date(task.completedAt) : null,
      task.errorMessage ?? null,
    ]);
  },

  async findById(taskId: string): Promise<ImportTaskRow | null> {
    return queryOne<ImportTaskRow>('SELECT * FROM import_tasks WHERE task_id = $1', [taskId]);
  },

  async findByProject(projectId: string): Promise<ImportTaskRow[]> {
    return query<ImportTaskRow>(
      'SELECT * FROM import_tasks WHERE project_id = $1 ORDER BY started_at DESC',
      [projectId]
    );
  },

  async findPending(): Promise<ImportTaskRow[]> {
    return query<ImportTaskRow>("SELECT * FROM import_tasks WHERE status IN ('pending', 'processing') ORDER BY started_at ASC");
  },

  async delete(taskId: string): Promise<number> {
    return execute('DELETE FROM import_tasks WHERE task_id = $1', [taskId]);
  },
};
