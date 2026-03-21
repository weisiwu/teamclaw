/**
 * Screenshot Model — SQLite persistence
 * Migrated from in-memory + JSON file to SQLite for proper change tracking integration.
 */
import { getDb } from '../db/sqlite.js';
// Run one-time migration from JSON file to SQLite
let migrated = false;
function migrateFromJson() {
    if (migrated)
        return;
    migrated = true;
    try {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(process.cwd(), 'data');
        const jsonFile = path.join(dataDir, 'screenshots.json');
        if (!fs.existsSync(jsonFile))
            return;
        const db = getDb();
        // Check if we already have data in SQLite
        const count = db.prepare('SELECT COUNT(*) as c FROM screenshots').get();
        if (count.c > 0) {
            // Already migrated, just remove the JSON file marker
            console.log('[Screenshot] SQLite already has data, skipping JSON migration');
            return;
        }
        const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
        console.log(`[Screenshot] Migrating ${jsonData.length} screenshots from JSON to SQLite`);
        const insert = db.prepare(`
      INSERT OR IGNORE INTO screenshots (
        id, version_id, message_id, message_content, sender_name, sender_avatar,
        screenshot_url, thumbnail_url, branch_name, file_size, mime_type,
        created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const insertMany = db.transaction((items) => {
            for (const s of items) {
                insert.run(s.id, s.versionId, s.messageId ?? null, s.messageContent ?? null, s.senderName ?? null, s.senderAvatar ?? null, s.screenshotUrl, s.thumbnailUrl ?? null, s.branchName ?? null, s.fileSize ?? null, s.mimeType ?? null, s.createdAt, s.createdBy ?? 'system');
            }
        });
        insertMany(jsonData);
        console.log(`[Screenshot] Migration complete`);
    }
    catch (err) {
        console.error('[Screenshot] Migration error:', err);
    }
}
migrateFromJson();
export const ScreenshotModel = {
    create(data) {
        const db = getDb();
        const id = `scr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const createdAt = new Date().toISOString();
        db.prepare(`
      INSERT INTO screenshots (
        id, version_id, message_id, message_content, sender_name, sender_avatar,
        screenshot_url, thumbnail_url, branch_name, file_size, mime_type,
        created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.versionId, data.messageId ?? null, data.messageContent ?? null, data.senderName ?? null, data.senderAvatar ?? null, data.screenshotUrl, data.thumbnailUrl ?? null, data.branchName ?? null, data.fileSize ?? null, data.mimeType ?? null, createdAt, data.createdBy ?? 'system');
        return { id, createdAt, ...data };
    },
    findById(id) {
        const db = getDb();
        const row = db.prepare('SELECT * FROM screenshots WHERE id = ?').get(id);
        if (!row)
            return undefined;
        return {
            id: row.id,
            versionId: row.version_id,
            messageId: row.message_id ?? undefined,
            messageContent: row.message_content ?? undefined,
            senderName: row.sender_name ?? undefined,
            senderAvatar: row.sender_avatar ?? undefined,
            screenshotUrl: row.screenshot_url,
            thumbnailUrl: row.thumbnail_url ?? undefined,
            branchName: row.branch_name ?? undefined,
            fileSize: row.file_size ?? undefined,
            mimeType: row.mime_type ?? undefined,
            createdAt: row.created_at,
            createdBy: row.created_by,
        };
    },
    findByVersionId(versionId) {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM screenshots WHERE version_id = ? ORDER BY created_at DESC').all(versionId);
        return rows.map(row => ({
            id: row.id,
            versionId: row.version_id,
            messageId: row.message_id ?? undefined,
            messageContent: row.message_content ?? undefined,
            senderName: row.sender_name ?? undefined,
            senderAvatar: row.sender_avatar ?? undefined,
            screenshotUrl: row.screenshot_url,
            thumbnailUrl: row.thumbnail_url ?? undefined,
            branchName: row.branch_name ?? undefined,
            fileSize: row.file_size ?? undefined,
            mimeType: row.mime_type ?? undefined,
            createdAt: row.created_at,
            createdBy: row.created_by,
        }));
    },
    update(id, data) {
        const existing = ScreenshotModel.findById(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...data };
        const db = getDb();
        db.prepare(`
      UPDATE screenshots SET
        message_id = ?, message_content = ?, sender_name = ?, sender_avatar = ?,
        screenshot_url = ?, thumbnail_url = ?, branch_name = ?,
        file_size = ?, mime_type = ?
      WHERE id = ?
    `).run(updated.messageId ?? null, updated.messageContent ?? null, updated.senderName ?? null, updated.senderAvatar ?? null, updated.screenshotUrl, updated.thumbnailUrl ?? null, updated.branchName ?? null, updated.fileSize ?? null, updated.mimeType ?? null, id);
        return updated;
    },
    delete(id) {
        const db = getDb();
        const result = db.prepare('DELETE FROM screenshots WHERE id = ?').run(id);
        return result.changes > 0;
    },
    deleteByVersionId(versionId) {
        const db = getDb();
        const result = db.prepare('DELETE FROM screenshots WHERE version_id = ?').run(versionId);
        return result.changes;
    },
    getAllScreenshots() {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM screenshots ORDER BY created_at DESC').all();
        return rows.map(row => ({
            id: row.id,
            versionId: row.version_id,
            messageId: row.message_id ?? undefined,
            messageContent: row.message_content ?? undefined,
            senderName: row.sender_name ?? undefined,
            senderAvatar: row.sender_avatar ?? undefined,
            screenshotUrl: row.screenshot_url,
            thumbnailUrl: row.thumbnail_url ?? undefined,
            branchName: row.branch_name ?? undefined,
            fileSize: row.file_size ?? undefined,
            mimeType: row.mime_type ?? undefined,
            createdAt: row.created_at,
            createdBy: row.created_by,
        }));
    },
};
