import { getDb } from '../db/sqlite.js';

export type ChangeEventType =
  | 'version_created'
  | 'version_published'
  | 'version_rollback'
  | 'version_archived'
  | 'screenshot_linked'
  | 'screenshot_removed'
  | 'changelog_generated'
  | 'changelog_updated'
  | 'bump_executed'
  | 'tag_created'
  | 'build_triggered'
  | 'build_completed'
  | 'manual_note';

export interface VersionChangeEvent {
  id: string;
  versionId: string;
  eventType: ChangeEventType;
  title: string;
  description?: string;
  actor: string;
  actorId?: string;
  screenshotId?: string;
  changelogId?: string;
  buildId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface DbRow {
  id: string;
  version_id: string;
  event_type: string;
  title: string;
  description: string | null;
  actor: string;
  actor_id: string | null;
  screenshot_id: string | null;
  changelog_id: string | null;
  build_id: string | null;
  task_id: string | null;
  metadata: string | null;
  created_at: string;
}

function rowToEvent(row: DbRow): VersionChangeEvent {
  return {
    id: row.id,
    versionId: row.version_id,
    eventType: row.event_type as ChangeEventType,
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

function makeId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const VersionChangeEventModel = {
  /**
   * Create a new change event record
   */
  create(data: {
    versionId: string;
    type: ChangeEventType;
    title: string;
    description?: string;
    actor?: string;
    actorId?: string;
    screenshotId?: string;
    changelogId?: string;
    buildId?: string;
    taskId?: string;
    metadata?: Record<string, unknown>;
  }): VersionChangeEvent {
    const db = getDb();
    const id = makeId();
    db.prepare(`
      INSERT INTO version_change_events (
        id, version_id, event_type, title, description,
        actor, actor_id, screenshot_id, changelog_id, build_id, task_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.versionId,
      data.type,
      data.title,
      data.description ?? null,
      data.actor ?? 'system',
      data.actorId ?? null,
      data.screenshotId ?? null,
      data.changelogId ?? null,
      data.buildId ?? null,
      data.taskId ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null
    );
    return this.findById(id)!;
  },

  findById(id: string): VersionChangeEvent | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM version_change_events WHERE id = ?').get(id) as DbRow | undefined;
    return row ? rowToEvent(row) : undefined;
  },

  /**
   * Get all events for a version, newest first
   */
  findByVersionId(versionId: string): VersionChangeEvent[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM version_change_events WHERE version_id = ? ORDER BY created_at DESC'
    ).all(versionId) as DbRow[];
    return rows.map(rowToEvent);
  },

  /**
   * Get events with associated screenshot data
   */
  findByVersionIdWithScreenshots(versionId: string) {
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
  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM version_change_events WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * Count events for a version
   */
  countByVersionId(versionId: string): number {
    const db = getDb();
    const row = db.prepare(
      'SELECT COUNT(*) as count FROM version_change_events WHERE version_id = ?'
    ).get(versionId) as { count: number };
    return row.count;
  },
};
