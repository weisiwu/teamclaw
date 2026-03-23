/**
 * Task Repository — PostgreSQL CRUD (migrated from in-memory Map)
 */
import { query, queryOne, execute } from '../pg.js';
export const taskRepo = {
    async upsert(task) {
        const existing = await this.findById(task.taskId);
        if (existing) {
            const sets = [];
            const vals = [];
            let idx = 1;
            if (task.status !== undefined) {
                sets.push(`status = $${idx++}`);
                vals.push(task.status);
            }
            if (task.title !== undefined) {
                sets.push(`title = $${idx++}`);
                vals.push(task.title);
            }
            if (task.description !== undefined) {
                sets.push(`description = $${idx++}`);
                vals.push(task.description);
            }
            if (task.priority !== undefined) {
                sets.push(`priority = $${idx++}`);
                vals.push(task.priority);
            }
            if (task.assignedAgent !== undefined) {
                sets.push(`assigned_agent = $${idx++}`);
                vals.push(task.assignedAgent);
            }
            if (task.startedAt !== undefined) {
                sets.push(`started_at = $${idx++}`);
                vals.push(new Date(task.startedAt));
            }
            if (task.completedAt !== undefined) {
                sets.push(`completed_at = $${idx++}`);
                vals.push(new Date(task.completedAt));
            }
            if (task.progress !== undefined) {
                sets.push(`progress = $${idx++}`);
                vals.push(task.progress);
            }
            if (task.lastHeartbeat !== undefined) {
                sets.push(`last_heartbeat = $${idx++}`);
                vals.push(new Date(task.lastHeartbeat));
            }
            if (task.retryCount !== undefined) {
                sets.push(`retry_count = $${idx++}`);
                vals.push(task.retryCount);
            }
            if (task.result !== undefined) {
                sets.push(`result = $${idx++}`);
                vals.push(task.result);
            }
            sets.push(`updated_at = NOW()`);
            if (sets.length === 0)
                return 0;
            vals.push(task.taskId);
            return execute(`UPDATE tasks SET ${sets.join(', ')} WHERE task_id = $${idx}`, vals);
        }
        return execute(`
      INSERT INTO tasks (task_id, title, description, status, priority, assigned_agent, parent_task_id,
        session_id, created_by, started_at, completed_at, context_snapshot, tags,
        max_retries, retry_count, progress, last_heartbeat, result, version_id,
        subtask_ids, depends_on, blocking_tasks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `, [
            task.taskId,
            task.title,
            task.description ?? '',
            task.status ?? 'pending',
            task.priority ?? 'normal',
            task.assignedAgent ?? null,
            task.parentTaskId ?? null,
            task.sessionId ?? '',
            task.createdBy ?? 'system',
            task.startedAt ? new Date(task.startedAt) : null,
            task.completedAt ? new Date(task.completedAt) : null,
            task.contextSnapshot ? JSON.stringify(task.contextSnapshot) : null,
            task.tags ?? [],
            task.maxRetries ?? 3,
            task.retryCount ?? 0,
            task.progress ?? 0,
            task.lastHeartbeat ? new Date(task.lastHeartbeat) : null,
            task.result ?? null,
            task.versionId ?? null,
            task.subtaskIds ?? [],
            task.dependsOn ?? [],
            task.blockingTasks ?? [],
        ]);
    },
    async findById(taskId) {
        return queryOne('SELECT * FROM tasks WHERE task_id = $1', [taskId]);
    },
    async findAll() {
        return query('SELECT * FROM tasks ORDER BY created_at DESC');
    },
    async findBySession(sessionId) {
        return query('SELECT * FROM tasks WHERE session_id = $1 ORDER BY created_at DESC', [sessionId]);
    },
    async findByStatus(status) {
        return query('SELECT * FROM tasks WHERE status = $1 ORDER BY created_at DESC', [status]);
    },
    async delete(taskId) {
        return execute('DELETE FROM tasks WHERE task_id = $1', [taskId]);
    },
    async count() {
        const row = await queryOne('SELECT COUNT(*) as count FROM tasks');
        return parseInt(row?.count ?? '0', 10);
    },
    async countByStatus() {
        const rows = await query('SELECT status, COUNT(*) as count FROM tasks GROUP BY status');
        const result = {};
        for (const r of rows)
            result[r.status] = parseInt(r.count, 10);
        return result;
    },
};
