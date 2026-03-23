/**
 * Version Repository — PostgreSQL CRUD
 */

import { query, queryOne, execute } from '../pg.js';

export interface VersionRow {
  id: string;
  version: string;
  branch: string;
  project_id: string | null;
  summary: string | null;
  commit_hash: string | null;
  git_tag: string | null;
  git_tag_created_at: Date | null;
  created_by: string | null;
  created_at: Date;
  build_status: string;
  tag_created: boolean;
  rollback_count: number;
  last_rollback_at: Date | null;
  title: string | null;
  description: string | null;
  status: string | null;
  project_path: string | null;
}

export const versionRepo = {
  async findById(id: string): Promise<VersionRow | null> {
    return queryOne<VersionRow>('SELECT * FROM versions WHERE id = $1', [id]);
  },

  async findAll(limit = 100, offset = 0): Promise<VersionRow[]> {
    return query<VersionRow>('SELECT * FROM versions ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
  },

  async findByStatus(status: string): Promise<VersionRow[]> {
    return query<VersionRow>('SELECT * FROM versions WHERE status = $1 ORDER BY created_at DESC', [status]);
  },

  async create(data: {
    id: string;
    version: string;
    branch?: string;
    projectId?: string;
    summary?: string;
    commitHash?: string;
    gitTag?: string;
    gitTagCreatedAt?: string;
    createdBy?: string;
    buildStatus?: string;
    title?: string;
    description?: string;
    status?: string;
    projectPath?: string;
  }): Promise<number> {
    return execute(`
      INSERT INTO versions (id, version, branch, project_id, summary, commit_hash, git_tag, git_tag_created_at, created_by, build_status, title, description, status, project_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      data.id,
      data.version,
      data.branch ?? 'main',
      data.projectId ?? null,
      data.summary ?? null,
      data.commitHash ?? null,
      data.gitTag ?? null,
      data.gitTagCreatedAt ? new Date(data.gitTagCreatedAt) : null,
      data.createdBy ?? 'system',
      data.buildStatus ?? 'pending',
      data.title ?? null,
      data.description ?? null,
      data.status ?? 'draft',
      data.projectPath ?? null,
    ]);
  },

  async update(id: string, data: Partial<{
    version: string;
    branch: string;
    summary: string;
    commitHash: string;
    gitTag: string;
    gitTagCreatedAt: string;
    buildStatus: string;
    tagCreated: boolean;
    rollbackCount: number;
    lastRollbackAt: string;
    title: string;
    description: string;
    status: string;
    projectPath: string;
  }>): Promise<number> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (data.version !== undefined) { sets.push(`version = $${idx++}`); vals.push(data.version); }
    if (data.branch !== undefined) { sets.push(`branch = $${idx++}`); vals.push(data.branch); }
    if (data.summary !== undefined) { sets.push(`summary = $${idx++}`); vals.push(data.summary); }
    if (data.commitHash !== undefined) { sets.push(`commit_hash = $${idx++}`); vals.push(data.commitHash); }
    if (data.gitTag !== undefined) { sets.push(`git_tag = $${idx++}`); vals.push(data.gitTag); }
    if (data.gitTagCreatedAt !== undefined) { sets.push(`git_tag_created_at = $${idx++}`); vals.push(new Date(data.gitTagCreatedAt)); }
    if (data.buildStatus !== undefined) { sets.push(`build_status = $${idx++}`); vals.push(data.buildStatus); }
    if (data.tagCreated !== undefined) { sets.push(`tag_created = $${idx++}`); vals.push(data.tagCreated); }
    if (data.rollbackCount !== undefined) { sets.push(`rollback_count = $${idx++}`); vals.push(data.rollbackCount); }
    if (data.lastRollbackAt !== undefined) { sets.push(`last_rollback_at = $${idx++}`); vals.push(new Date(data.lastRollbackAt)); }
    if (data.title !== undefined) { sets.push(`title = $${idx++}`); vals.push(data.title); }
    if (data.description !== undefined) { sets.push(`description = $${idx++}`); vals.push(data.description); }
    if (data.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(data.status); }
    if (data.projectPath !== undefined) { sets.push(`project_path = $${idx++}`); vals.push(data.projectPath); }

    if (sets.length === 0) return 0;
    vals.push(id);
    return execute(`UPDATE versions SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
  },

  async delete(id: string): Promise<number> {
    return execute('DELETE FROM versions WHERE id = $1', [id]);
  },

  async count(filters?: { status?: string; branch?: string }): Promise<number> {
    let sql = 'SELECT COUNT(*) as c FROM versions WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;
    if (filters?.status) { sql += ` AND status = $${idx++}`; params.push(filters.status); }
    if (filters?.branch) { sql += ` AND branch = $${idx++}`; params.push(filters.branch); }
    const row = await queryOne<{ c: number }>(sql, params);
    return row?.c ?? 0;
  },

  async search(params: {
    q?: string;
    status?: string;
    buildStatus?: string;
    branch?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<VersionRow[]> {
    const conditions: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (params.q) {
      conditions.push(`(version ILIKE $${idx} OR title ILIKE $${idx} OR description ILIKE $${idx})`);
      vals.push(`%${params.q}%`);
      idx++;
    }
    if (params.status) { conditions.push(`status = $${idx++}`); vals.push(params.status); }
    if (params.buildStatus) { conditions.push(`build_status = $${idx++}`); vals.push(params.buildStatus); }
    if (params.branch) { conditions.push(`branch = $${idx++}`); vals.push(params.branch); }
    if (params.dateFrom) { conditions.push(`created_at >= $${idx++}`); vals.push(new Date(params.dateFrom)); }
    if (params.dateTo) { conditions.push(`created_at <= $${idx++}`); vals.push(new Date(params.dateTo)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    vals.push(params.limit ?? 20);
    vals.push(params.offset ?? 0);
    return query<VersionRow>(
      `SELECT * FROM versions ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      vals
    );
  },
};
