/**
 * Screenshot Model — PostgreSQL persistence
 */

import { query, queryOne, execute } from '../db/pg.js';

export interface Screenshot {
  id: string;
  versionId: string;
  messageId?: string;
  messageContent?: string;
  senderName?: string;
  senderAvatar?: string;
  screenshotUrl: string;
  thumbnailUrl?: string;
  branchName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  createdBy?: string;
}

export const ScreenshotModel = {
  async create(data: Omit<Screenshot, 'id' | 'createdAt'>): Promise<Screenshot> {
    const id = `scr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date().toISOString();

    await execute(`
      INSERT INTO screenshots (
        id, version_id, message_id, message_content, sender_name, sender_avatar,
        screenshot_url, thumbnail_url, branch_name, file_size, mime_type,
        created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      id,
      data.versionId,
      data.messageId ?? null,
      data.messageContent ?? null,
      data.senderName ?? null,
      data.senderAvatar ?? null,
      data.screenshotUrl,
      data.thumbnailUrl ?? null,
      data.branchName ?? null,
      data.fileSize ?? null,
      data.mimeType ?? null,
      createdAt,
      data.createdBy ?? 'system',
    ]);

    return { id, createdAt, ...data };
  },

  async findById(id: string): Promise<Screenshot | undefined> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM screenshots WHERE id = $1', [id]
    );
    if (!row) return undefined;
    return {
      id: row.id as string,
      versionId: row.version_id as string,
      messageId: row.message_id as string | undefined,
      messageContent: row.message_content as string | undefined,
      senderName: row.sender_name as string | undefined,
      senderAvatar: row.sender_avatar as string | undefined,
      screenshotUrl: row.screenshot_url as string,
      thumbnailUrl: row.thumbnail_url as string | undefined,
      branchName: row.branch_name as string | undefined,
      fileSize: row.file_size as number | undefined,
      mimeType: row.mime_type as string | undefined,
      createdAt: row.created_at as string,
      createdBy: row.created_by as string | undefined,
    };
  },

  async findByVersionId(versionId: string): Promise<Screenshot[]> {
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM screenshots WHERE version_id = $1 ORDER BY created_at DESC',
      [versionId]
    );
    return rows.map(row => ({
      id: row.id as string,
      versionId: row.version_id as string,
      messageId: row.message_id as string | undefined,
      messageContent: row.message_content as string | undefined,
      senderName: row.sender_name as string | undefined,
      senderAvatar: row.sender_avatar as string | undefined,
      screenshotUrl: row.screenshot_url as string,
      thumbnailUrl: row.thumbnail_url as string | undefined,
      branchName: row.branch_name as string | undefined,
      fileSize: row.file_size as number | undefined,
      mimeType: row.mime_type as string | undefined,
      createdAt: row.created_at as string,
      createdBy: row.created_by as string | undefined,
    }));
  },

  async update(id: string, data: Partial<Screenshot>): Promise<Screenshot | undefined> {
    const existing = await ScreenshotModel.findById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };

    await execute(`
      UPDATE screenshots SET
        message_id = $1, message_content = $2, sender_name = $3, sender_avatar = $4,
        screenshot_url = $5, thumbnail_url = $6, branch_name = $7,
        file_size = $8, mime_type = $9
      WHERE id = $10
    `, [
      updated.messageId ?? null,
      updated.messageContent ?? null,
      updated.senderName ?? null,
      updated.senderAvatar ?? null,
      updated.screenshotUrl,
      updated.thumbnailUrl ?? null,
      updated.branchName ?? null,
      updated.fileSize ?? null,
      updated.mimeType ?? null,
      id,
    ]);

    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const count = await execute('DELETE FROM screenshots WHERE id = $1', [id]);
    return count > 0;
  },

  async deleteByVersionId(versionId: string): Promise<number> {
    return execute('DELETE FROM screenshots WHERE version_id = $1', [versionId]);
  },

  async getAllScreenshots(): Promise<Screenshot[]> {
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM screenshots ORDER BY created_at DESC'
    );
    return rows.map(row => ({
      id: row.id as string,
      versionId: row.version_id as string,
      messageId: row.message_id as string | undefined,
      messageContent: row.message_content as string | undefined,
      senderName: row.sender_name as string | undefined,
      senderAvatar: row.sender_avatar as string | undefined,
      screenshotUrl: row.screenshot_url as string,
      thumbnailUrl: row.thumbnail_url as string | undefined,
      branchName: row.branch_name as string | undefined,
      fileSize: row.file_size as number | undefined,
      mimeType: row.mime_type as string | undefined,
      createdAt: row.created_at as string,
      createdBy: row.created_by as string | undefined,
    }));
  },
};
