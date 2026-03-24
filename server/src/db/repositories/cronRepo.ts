/**
 * Cron Repository — PostgreSQL CRUD
 */

import { query, queryOne, execute } from '../pg.js';

export interface CronJobRow {
  id: string;
  name: string;
  cron: string;
  prompt: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  last_run_at: Date | null;
  last_run_status: string | null;
  last_run_output: string | null;
  last_run_error: string | null;
  next_run_at: Date | null;
  run_count: number;
  success_count: number;
  fail_count: number;
  enabled: boolean;
}

export interface CronRunRow {
  id: string;
  cron_job_id: string;
  start_time: Date;
  end_time: Date | null;
  status: string;
  output: string | null;
  error: string | null;
  duration_ms: number | null;
  created_at: Date;
}

export const cronRepo = {
  async upsertJob(job: {
    id: string;
    name: string;
    cron: string;
    prompt: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastRunAt?: string;
    lastRunStatus?: string;
    lastRunOutput?: string;
    lastRunError?: string;
    nextRunAt?: string;
    runCount: number;
    successCount: number;
    failCount: number;
    enabled: boolean;
  }): Promise<number> {
    const existing = await this.findJobById(job.id);
    if (existing) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;

      if (job.name !== undefined) {
        sets.push(`name = $${idx++}`);
        vals.push(job.name);
      }
      if (job.cron !== undefined) {
        sets.push(`cron = $${idx++}`);
        vals.push(job.cron);
      }
      if (job.prompt !== undefined) {
        sets.push(`prompt = $${idx++}`);
        vals.push(job.prompt);
      }
      if (job.status !== undefined) {
        sets.push(`status = $${idx++}`);
        vals.push(job.status);
      }
      if (job.lastRunAt !== undefined) {
        sets.push(`last_run_at = $${idx++}`);
        vals.push(job.lastRunAt ? new Date(job.lastRunAt) : null);
      }
      if (job.lastRunStatus !== undefined) {
        sets.push(`last_run_status = $${idx++}`);
        vals.push(job.lastRunStatus ?? null);
      }
      if (job.lastRunOutput !== undefined) {
        sets.push(`last_run_output = $${idx++}`);
        vals.push(job.lastRunOutput ?? null);
      }
      if (job.lastRunError !== undefined) {
        sets.push(`last_run_error = $${idx++}`);
        vals.push(job.lastRunError ?? null);
      }
      if (job.nextRunAt !== undefined) {
        sets.push(`next_run_at = $${idx++}`);
        vals.push(job.nextRunAt ? new Date(job.nextRunAt) : null);
      }
      if (job.runCount !== undefined) {
        sets.push(`run_count = $${idx++}`);
        vals.push(job.runCount);
      }
      if (job.successCount !== undefined) {
        sets.push(`success_count = $${idx++}`);
        vals.push(job.successCount);
      }
      if (job.failCount !== undefined) {
        sets.push(`fail_count = $${idx++}`);
        vals.push(job.failCount);
      }
      if (job.enabled !== undefined) {
        sets.push(`enabled = $${idx++}`);
        vals.push(job.enabled);
      }
      sets.push(`updated_at = NOW()`);

      if (sets.length === 0) return 0;
      vals.push(job.id);
      return execute(`UPDATE cron_jobs SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    }

    return execute(
      `
      INSERT INTO cron_jobs (id, name, cron, prompt, status, created_at, updated_at, created_by,
        last_run_at, last_run_status, last_run_output, last_run_error, next_run_at,
        run_count, success_count, fail_count, enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `,
      [
        job.id,
        job.name,
        job.cron,
        job.prompt,
        job.status,
        new Date(job.createdAt),
        new Date(job.updatedAt),
        job.createdBy,
        job.lastRunAt ? new Date(job.lastRunAt) : null,
        job.lastRunStatus ?? null,
        job.lastRunOutput ?? null,
        job.lastRunError ?? null,
        job.nextRunAt ? new Date(job.nextRunAt) : null,
        job.runCount,
        job.successCount,
        job.failCount,
        job.enabled,
      ]
    );
  },

  async findJobById(id: string): Promise<CronJobRow | null> {
    return queryOne<CronJobRow>('SELECT * FROM cron_jobs WHERE id = $1', [id]);
  },

  async findAllJobs(): Promise<CronJobRow[]> {
    return query<CronJobRow>('SELECT * FROM cron_jobs ORDER BY created_at DESC');
  },

  async deleteJob(id: string): Promise<number> {
    return execute('DELETE FROM cron_jobs WHERE id = $1', [id]);
  },

  async insertRun(run: {
    id: string;
    cronJobId: string;
    startTime: string;
    endTime?: string;
    status: string;
    output?: string;
    error?: string;
    durationMs?: number;
  }): Promise<number> {
    return execute(
      `
      INSERT INTO cron_runs (id, cron_job_id, start_time, end_time, status, output, error, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        run.id,
        run.cronJobId,
        new Date(run.startTime),
        run.endTime ? new Date(run.endTime) : null,
        run.status,
        run.output ?? null,
        run.error ?? null,
        run.durationMs ?? null,
      ]
    );
  },

  async findRunsByJobId(cronJobId: string, limit = 20): Promise<CronRunRow[]> {
    return query<CronRunRow>(
      'SELECT * FROM cron_runs WHERE cron_job_id = $1 ORDER BY start_time DESC LIMIT $2',
      [cronJobId, limit]
    );
  },
};
