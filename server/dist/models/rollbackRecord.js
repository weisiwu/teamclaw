// Rollback 记录数据模型
// 持久化存储版本回退历史
import { getDb } from '../db/sqlite.js';
function rowToRecord(row) {
    return {
        id: row.id,
        versionId: row.version_id,
        versionName: row.version_name,
        targetRef: row.target_ref,
        targetType: row.target_type,
        mode: row.mode,
        previousRef: row.previous_ref,
        newBranch: row.new_branch,
        backupCreated: Boolean(row.backup_created),
        message: row.message,
        success: Boolean(row.success),
        error: row.error,
        performedBy: row.performed_by,
        performedAt: row.performed_at,
        createdAt: row.created_at,
    };
}
export const RollbackRecordModel = {
    /**
     * Find all rollback records for a version
     */
    findByVersionId(versionId) {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM rollback_history WHERE version_id = ? ORDER BY created_at DESC').all(versionId);
        return rows.map(rowToRecord);
    },
    /**
     * Find a single rollback record by ID
     */
    findById(id) {
        const db = getDb();
        const row = db.prepare('SELECT * FROM rollback_history WHERE id = ?').get(id);
        return row ? rowToRecord(row) : null;
    },
    /**
     * Create a new rollback record
     */
    create(data) {
        const db = getDb();
        db.prepare(`
      INSERT INTO rollback_history (
        id, version_id, version_name, target_ref, target_type, mode,
        previous_ref, new_branch, backup_created, message, success,
        error, performed_by, performed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.id, data.versionId, data.versionName, data.targetRef, data.targetType, data.mode, data.previousRef ?? null, data.newBranch ?? null, data.backupCreated ? 1 : 0, data.message ?? null, data.success ? 1 : 0, data.error ?? null, data.performedBy ?? 'developer', data.performedAt);
        return {
            ...data,
            createdAt: new Date().toISOString(),
        };
    },
    /**
     * Get recent rollback records across all versions
     */
    findRecent(limit = 20) {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM rollback_history ORDER BY created_at DESC LIMIT ?').all(limit);
        return rows.map(rowToRecord);
    },
};
