import { getDb } from '../db/sqlite.js';
function rowToEvent(row) {
    return {
        id: row.id,
        versionId: row.version_id,
        eventType: row.event_type,
        title: row.title,
        description: row.description ?? undefined,
        actor: row.actor,
        actorId: row.actor_id ?? undefined,
        screenshotId: row.screenshot_id ?? undefined,
        changelogId: row.changelog_id ?? undefined,
        buildId: row.build_id ?? undefined,
        taskId: row.task_id ?? undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        createdAt: row.created_at,
    };
}
function makeId() {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
export const VersionChangeEventModel = {
    /**
     * Create a new change event record
     */
    create(data) {
        const db = getDb();
        const id = makeId();
        db.prepare(`
      INSERT INTO version_change_events (
        id, version_id, event_type, title, description,
        actor, actor_id, screenshot_id, changelog_id, build_id, task_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.versionId, data.type, data.title, data.description ?? null, data.actor ?? 'system', data.actorId ?? null, data.screenshotId ?? null, data.changelogId ?? null, data.buildId ?? null, data.taskId ?? null, data.metadata ? JSON.stringify(data.metadata) : null);
        return this.findById(id);
    },
    findById(id) {
        const db = getDb();
        const row = db.prepare('SELECT * FROM version_change_events WHERE id = ?').get(id);
        return row ? rowToEvent(row) : undefined;
    },
    /**
     * Get all events for a version, newest first
     */
    findByVersionId(versionId) {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM version_change_events WHERE version_id = ? ORDER BY created_at DESC').all(versionId);
        return rows.map(rowToEvent);
    },
    /**
     * Get events with associated screenshot data
     */
    findByVersionIdWithScreenshots(versionId) {
        const db = getDb();
        const rows = db.prepare(`
      SELECT e.*, s.screenshot_url, s.message_content, s.sender_name, s.thumbnail_url
      FROM version_change_events e
      LEFT JOIN screenshots s ON e.screenshot_id = s.id
      WHERE e.version_id = ?
      ORDER BY e.created_at DESC
    `).all(versionId);
        return rows;
    },
    /**
     * Delete an event (only manual_note events should be deletable)
     */
    delete(id) {
        const db = getDb();
        const result = db.prepare('DELETE FROM version_change_events WHERE id = ?').run(id);
        return result.changes > 0;
    },
    /**
     * Count events for a version
     */
    countByVersionId(versionId) {
        const db = getDb();
        const row = db.prepare('SELECT COUNT(*) as count FROM version_change_events WHERE version_id = ?').get(versionId);
        return row.count;
    },
};
