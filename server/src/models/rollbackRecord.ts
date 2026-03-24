// Rollback 记录数据模型
// 持久化存储版本回退历史

import { query, queryOne, execute } from '../db/pg.js';

export interface RollbackRecord {
  id: string;             // 唯一 ID (rb_xxx)
  versionId: string;      // 关联的版本 ID
  versionName: string;    // 版本号，如 v1.0.0
  targetRef: string;      // 回退目标（tag/branch/commit）
  targetType: "tag" | "branch" | "commit";
  mode: "revert" | "checkout";
  previousRef?: string;   // 回退前的引用
  newBranch?: string;     // 如果创建了新分支，记录分支名
  backupCreated: boolean; // 是否创建了备份分支
  message?: string;       // 回退说明
  success: boolean;       // 是否成功
  error?: string;         // 失败原因
  performedBy?: string;   // 执行人
  performedAt: string;    // 执行时间
  createdAt: string;      // 创建时间
}

function rowToRecord(row: Record<string, unknown>): RollbackRecord {
  return {
    id: row.id as string,
    versionId: row.version_id as string,
    versionName: row.version_name as string,
    targetRef: row.target_ref as string,
    targetType: row.target_type as RollbackRecord['targetType'],
    mode: row.mode as RollbackRecord['mode'],
    previousRef: row.previous_ref as string | undefined,
    newBranch: row.new_branch as string | undefined,
    backupCreated: Boolean(row.backup_created),
    message: row.message as string | undefined,
    success: Boolean(row.success),
    error: row.error as string | undefined,
    performedBy: row.performed_by as string | undefined,
    performedAt: row.performed_at as string,
    createdAt: row.created_at as string,
  };
}

export const RollbackRecordModel = {
  /**
   * Find all rollback records for a version
   */
  async findByVersionId(versionId: string): Promise<RollbackRecord[]> {
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM rollback_history WHERE version_id = $1 ORDER BY created_at DESC',
      [versionId]
    );
    return rows.map(rowToRecord);
  },

  /**
   * Find a single rollback record by ID
   */
  async findById(id: string): Promise<RollbackRecord | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM rollback_history WHERE id = $1',
      [id]
    );
    return row ? rowToRecord(row) : null;
  },

  /**
   * Create a new rollback record
   */
  async create(data: Omit<RollbackRecord, 'createdAt'>): Promise<RollbackRecord> {
    await execute(
      `INSERT INTO rollback_history (
        id, version_id, version_name, target_ref, target_type, mode,
        previous_ref, new_branch, backup_created, message, success,
        error, performed_by, performed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        data.id,
        data.versionId,
        data.versionName,
        data.targetRef,
        data.targetType,
        data.mode,
        data.previousRef ?? null,
        data.newBranch ?? null,
        data.backupCreated ? 1 : 0,
        data.message ?? null,
        data.success ? 1 : 0,
        data.error ?? null,
        data.performedBy ?? 'developer',
        data.performedAt
      ]
    );
    return {
      ...data,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Get recent rollback records across all versions
   */
  async findRecent(limit = 20): Promise<RollbackRecord[]> {
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM rollback_history ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return rows.map(rowToRecord);
  },
};
