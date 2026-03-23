/**
 * Screenshot Model — PostgreSQL persistence
 */
import { query, queryOne, execute } from '../db/pg.js';
export const ScreenshotModel = {
    async create(data) {
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
    async findById(id) {
        const row = await queryOne('SELECT * FROM screenshots WHERE id = $1', [id]);
        if (!row)
            return undefined;
        return {
            id: row.id,
            versionId: row.version_id,
            messageId: row.message_id,
            messageContent: row.message_content,
            senderName: row.sender_name,
            senderAvatar: row.sender_avatar,
            screenshotUrl: row.screenshot_url,
            thumbnailUrl: row.thumbnail_url,
            branchName: row.branch_name,
            fileSize: row.file_size,
            mimeType: row.mime_type,
            createdAt: row.created_at,
            createdBy: row.created_by,
        };
    },
    async findByVersionId(versionId) {
        const rows = await query('SELECT * FROM screenshots WHERE version_id = $1 ORDER BY created_at DESC', [versionId]);
        return rows.map(row => ({
            id: row.id,
            versionId: row.version_id,
            messageId: row.message_id,
            messageContent: row.message_content,
            senderName: row.sender_name,
            senderAvatar: row.sender_avatar,
            screenshotUrl: row.screenshot_url,
            thumbnailUrl: row.thumbnail_url,
            branchName: row.branch_name,
            fileSize: row.file_size,
            mimeType: row.mime_type,
            createdAt: row.created_at,
            createdBy: row.created_by,
        }));
    },
    async update(id, data) {
        const existing = await ScreenshotModel.findById(id);
        if (!existing)
            return undefined;
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
    async delete(id) {
        const count = await execute('DELETE FROM screenshots WHERE id = $1', [id]);
        return count > 0;
    },
    async deleteByVersionId(versionId) {
        return execute('DELETE FROM screenshots WHERE version_id = $1', [versionId]);
    },
    async getAllScreenshots() {
        const rows = await query('SELECT * FROM screenshots ORDER BY created_at DESC');
        return rows.map(row => ({
            id: row.id,
            versionId: row.version_id,
            messageId: row.message_id,
            messageContent: row.message_content,
            senderName: row.sender_name,
            senderAvatar: row.sender_avatar,
            screenshotUrl: row.screenshot_url,
            thumbnailUrl: row.thumbnail_url,
            branchName: row.branch_name,
            fileSize: row.file_size,
            mimeType: row.mime_type,
            createdAt: row.created_at,
            createdBy: row.created_by,
        }));
    },
};
