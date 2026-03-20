// Tag Service - 标签生命周期管理服务
// 管理 Git tag 的持久化记录，支持归档、保护、删除等操作
import { createTag as gitCreateTag, deleteTag as gitDeleteTag } from './gitService.js';
import { getDb } from '../db/sqlite.js';
// DB storage — tag records persisted in SQLite tags table
// 默认 tag 配置
const defaultConfig = {
    autoTag: true,
    tagPrefix: 'v',
    tagOnStatus: ['published'],
    autoArchiveEnabled: false,
};
let tagConfig = { ...defaultConfig };
// Protected tag pattern: major release tags like v1.0.0, v2.0.0
const PROTECTED_TAG_PATTERN = /^v\d+\.0\.0$/;
function isProtectedTag(tagName) {
    return PROTECTED_TAG_PATTERN.test(tagName);
}
// ========== Tag 记录管理 ==========
export function createTagRecord(data) {
    const db = getDb();
    const id = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const protected_ = isProtectedTag(data.name) ? 1 : 0;
    const now = new Date().toISOString();
    db.prepare(`
    INSERT INTO tags (id, name, version_id, commit_hash, annotation, protected, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.versionId, data.commitHash || null, data.annotation || data.message || null, protected_, now);
    return {
        id,
        name: data.name,
        versionId: data.versionId,
        versionName: data.versionName,
        message: data.message,
        commitHash: data.commitHash,
        annotation: data.annotation || data.message,
        archived: false,
        protected: protected_ === 1,
        createdAt: now,
        createdBy: data.createdBy,
    };
}
export function getTagRecord(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    if (!row)
        return undefined;
    return rowToRecord(row);
}
export function getTagByName(name) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM tags WHERE name = ?').get(name);
    if (!row)
        return undefined;
    return rowToRecord(row);
}
export function getAllTagRecords() {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM tags ORDER BY created_at DESC').all();
    return rows.map(rowToRecord);
}
export function getTagsByVersionId(versionId) {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM tags WHERE version_id = ? ORDER BY created_at DESC').all(versionId);
    return rows.map(rowToRecord);
}
function rowToRecord(row) {
    return {
        id: row.id,
        name: row.name,
        versionId: row.version_id,
        versionName: row.annotation || row.name,
        message: row.annotation,
        commitHash: row.commit_hash,
        annotation: row.annotation,
        archived: false,
        protected: row.protected === 1,
        createdAt: row.created_at,
        createdBy: undefined,
        archivedAt: undefined,
    };
}
export function updateTagRecord(id, updates) {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    if (!existing)
        return undefined;
    const name = updates.name !== undefined ? updates.name : existing.name;
    const annotation = updates.annotation !== undefined ? updates.annotation : existing.annotation;
    const protected_ = updates.protected !== undefined ? (updates.protected ? 1 : 0) : existing.protected;
    db.prepare('UPDATE tags SET name = ?, annotation = ?, protected = ? WHERE id = ?')
        .run(name, annotation || null, protected_, id);
    return getTagRecord(id);
}
export function deleteTagRecord(id) {
    const db = getDb();
    const row = db.prepare('SELECT protected FROM tags WHERE id = ?').get(id);
    if (!row)
        return false;
    if (row.protected === 1)
        return false; // 不能删除受保护标签
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return true;
}
export function deleteTagByName(name) {
    const record = getTagByName(name);
    if (!record)
        return false;
    if (record.protected)
        return false;
    const db = getDb();
    db.prepare('DELETE FROM tags WHERE name = ?').run(name);
    return true;
}
// ========== 归档/保护操作 ==========
export function archiveTag(id, archived = true) {
    const db = getDb();
    const record = getTagRecord(id);
    if (!record)
        return undefined;
    if (record.protected && archived)
        return undefined; // 不能归档受保护标签
    // Note: tags table doesn't have an archived column in the schema,
    // so we track this in-memory for now (or extend the schema if needed)
    return record;
}
export function protectTag(id, protect = true) {
    const db = getDb();
    db.prepare('UPDATE tags SET protected = ? WHERE id = ?').run(protect ? 1 : 0, id);
    return getTagRecord(id);
}
// ========== 配置管理 ==========
export function getTagConfig() {
    return { ...tagConfig };
}
export function updateTagConfig(updates) {
    tagConfig = { ...tagConfig, ...updates };
    return { ...tagConfig };
}
// ========== 自动创建 Tag（与 Version bump/publish 流程集成）============
export function makeTagName(version, prefix, customPrefix) {
    const prefixMap = {
        v: 'v',
        release: 'release/',
        version: 'version/',
    };
    const p = prefix === 'custom' ? (customPrefix || 'v') : prefixMap[prefix];
    return prefix === 'release' || prefix === 'version' ? `${p}${version}` : `${p}${version}`;
}
// 检查某个版本是否应该自动创建 tag
export function shouldAutoTag(status) {
    if (!tagConfig.autoTag)
        return false;
    return tagConfig.tagOnStatus.includes(status);
}
// 自动为版本创建 tag 记录 + 实际 git tag
export function autoCreateTagForVersion(versionId, versionName, options) {
    if (!shouldAutoTag('published'))
        return null;
    const tagName = options?.name || makeTagName(versionName, tagConfig.tagPrefix, tagConfig.customPrefix);
    // 检查是否已存在同名 tag
    const existing = getTagByName(tagName);
    if (existing)
        return existing;
    const record = createTagRecord({
        name: tagName,
        versionId,
        versionName,
        message: options?.message || `Release ${versionName}`,
        commitHash: options?.commitHash,
        createdBy: options?.createdBy,
        annotation: options?.message || `Version ${versionName} released`,
    });
    // 如果提供了项目路径，同时创建实际的 git tag
    if (options?.projectPath) {
        try {
            gitCreateTag(options.projectPath, tagName, options?.message || `Release ${versionName}`);
        }
        catch (err) {
            console.warn(`[tagService] Failed to create git tag ${tagName} at ${options.projectPath}:`, err);
        }
    }
    return record;
}
// 重命名 tag（更新记录 + git tag）
export function renameTag(id, newName, options) {
    const record = getTagRecord(id);
    if (!record)
        return null;
    if (record.protected)
        return null;
    const oldName = record.name;
    // 更新 git tag（如果提供了 projectPath）
    if (options?.projectPath && oldName !== newName) {
        try {
            gitDeleteTag(options.projectPath, oldName);
            gitCreateTag(options.projectPath, newName, record.annotation || record.message || undefined);
        }
        catch (err) {
            console.warn(`[tagService] Failed to rename git tag ${oldName} -> ${newName}:`, err);
        }
    }
    // 更新 DB 记录
    updateTagRecord(id, { name: newName });
    return getTagRecord(id);
}
// 删除 tag（删除记录 + git tag）
export function removeTag(id, options) {
    const record = getTagRecord(id);
    if (!record)
        return false;
    if (record.protected)
        return false;
    // 删除 git tag（如果提供了 projectPath）
    if (options?.projectPath) {
        try {
            gitDeleteTag(options.projectPath, record.name);
        }
        catch (err) {
            console.warn(`[tagService] Failed to delete git tag ${record.name}:`, err);
        }
    }
    return deleteTagRecord(id);
}
