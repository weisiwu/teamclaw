import { query, queryOne, execute } from '../db/pg.js';
import { generateId } from '../utils/generateId.js';

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
  return generateId('evt');
}

export const VersionChangeEventModel = {
  /**
   * Create a new change event record
   */
  async create(data: {
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
  }): Promise<VersionChangeEvent> {
    const id = makeId();
    await execute(
      `INSERT INTO version_change_events (
        id, version_id, event_type, title, description,
        actor, actor_id, screenshot_id, changelog_id, build_id, task_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
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
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
    return (await this.findById(id))!;
  },

  async findById(id: string): Promise<VersionChangeEvent | undefined> {
    const row = await queryOne<DbRow>('SELECT * FROM version_change_events WHERE id = $1', [id]);
    return row ? rowToEvent(row) : undefined;
  },

  /**
   * Get all events for a version, newest first
   */
  async findByVersionId(versionId: string): Promise<VersionChangeEvent[]> {
    const rows = await query<DbRow>(
      'SELECT * FROM version_change_events WHERE version_id = $1 ORDER BY created_at DESC',
      [versionId]
    );
    return rows.map(rowToEvent);
  },

  /**
   * Get events with associated screenshot data
   */
  async findByVersionIdWithScreenshots(versionId: string) {
    const rows = await query(
      `SELECT e.*, s.screenshot_url, s.message_content, s.sender_name, s.thumbnail_url
      FROM version_change_events e
      LEFT JOIN screenshots s ON e.screenshot_id = s.id
      WHERE e.version_id = $1
      ORDER BY e.created_at DESC`,
      [versionId]
    );
    return rows;
  },

  /**
   * Delete an event (only manual_note events should be deletable)
   */
  async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM version_change_events WHERE id = $1', [id]);
    return result > 0;
  },

  /**
   * Count events for a version
   */
  async countByVersionId(versionId: string): Promise<number> {
    const row = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM version_change_events WHERE version_id = $1',
      [versionId]
    );
    return row?.count ?? 0;
  },
};
