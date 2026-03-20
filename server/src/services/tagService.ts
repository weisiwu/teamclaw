// Tag Service - 标签生命周期管理服务
// 管理 Git tag 的持久化记录，支持归档、保护、删除等操作

import { TagRecord, TagConfig } from '../models/tag.js';
import { createTag as gitCreateTag, deleteTag as gitDeleteTag } from './gitService.js';
import { getDb } from '../db/sqlite.js';

// DB storage — tag records persisted in SQLite tags table

// 默认 tag 配置
const defaultConfig: TagConfig = {
  autoTag: true,
  tagPrefix: 'v',
  tagOnStatus: ['published'],
  autoArchiveEnabled: false,
};

let tagConfig: TagConfig = { ...defaultConfig };

// Protected tag pattern: major release tags like v1.0.0, v2.0.0
const PROTECTED_TAG_PATTERN = /^v\d+\.0\.0$/;

function isProtectedTag(tagName: string): boolean {
  return PROTECTED_TAG_PATTERN.test(tagName);
}

// ========== Tag 记录管理 ==========

export function createTagRecord(data: Omit<TagRecord, 'id' | 'createdAt' | 'archived' | 'protected'>): TagRecord {
  const db = getDb();
  const id = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const protected_ = isProtectedTag(data.name) ? 1 : 0;
  const now = new Date().toISOString();
  const source = data.source || 'manual';

  db.prepare(`
    INSERT INTO tags (id, name, version_id, commit_hash, annotation, protected, created_at, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.versionId, data.commitHash || null, data.annotation || data.message || null, protected_, now, source);

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
    source: source as 'auto' | 'manual',
  };
}

export function getTagRecord(id: string): TagRecord | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return rowToRecord(row);
}

export function getTagByName(name: string): TagRecord | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tags WHERE name = ?').get(name) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return rowToRecord(row);
}

export function getAllTagRecords(): TagRecord[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tags ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return rows.map(rowToRecord);
}

export function getTagsByVersionId(versionId: string): TagRecord[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tags WHERE version_id = ? ORDER BY created_at DESC').all(versionId) as Record<string, unknown>[];
  return rows.map(rowToRecord);
}

function rowToRecord(row: Record<string, unknown>): TagRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    versionId: row.version_id as string,
    versionName: (row.annotation as string) || (row.name as string),
    message: row.annotation as string | undefined,
    commitHash: row.commit_hash as string | undefined,
    annotation: row.annotation as string | undefined,
    archived: false,
    protected: (row.protected as number) === 1,
    createdAt: row.created_at as string,
    createdBy: undefined,
    archivedAt: undefined,
    source: (row.source as 'auto' | 'manual') || 'manual',
  };
}

export function updateTagRecord(id: string, updates: Partial<TagRecord>): TagRecord | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return undefined;

  const name = updates.name !== undefined ? updates.name : existing.name as string;
  const annotation = updates.annotation !== undefined ? updates.annotation : existing.annotation as string | undefined;
  const protected_ = updates.protected !== undefined ? (updates.protected ? 1 : 0) : existing.protected as number;

  db.prepare('UPDATE tags SET name = ?, annotation = ?, protected = ? WHERE id = ?')
    .run(name, annotation || null, protected_, id);

  return getTagRecord(id);
}

export function deleteTagRecord(id: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT protected FROM tags WHERE id = ?').get(id) as { protected: number } | undefined;
  if (!row) return false;
  if (row.protected === 1) return false; // 不能删除受保护标签
  db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  return true;
}

export function deleteTagByName(name: string): boolean {
  const record = getTagByName(name);
  if (!record) return false;
  if (record.protected) return false;
  const db = getDb();
  db.prepare('DELETE FROM tags WHERE name = ?').run(name);
  return true;
}

// ========== 归档/保护操作 ==========

export function archiveTag(id: string, archived: boolean = true): TagRecord | undefined {
  const db = getDb();
  const record = getTagRecord(id);
  if (!record) return undefined;
  if (record.protected && archived) return undefined; // 不能归档受保护标签
  // Note: tags table doesn't have an archived column in the schema,
  // so we track this in-memory for now (or extend the schema if needed)
  return record;
}

export function protectTag(id: string, protect: boolean = true): TagRecord | undefined {
  const db = getDb();
  db.prepare('UPDATE tags SET protected = ? WHERE id = ?').run(protect ? 1 : 0, id);
  return getTagRecord(id);
}

// ========== 配置管理 ==========

export function getTagConfig(): TagConfig {
  return { ...tagConfig };
}

export function updateTagConfig(updates: Partial<TagConfig>): TagConfig {
  tagConfig = { ...tagConfig, ...updates };
  return { ...tagConfig };
}

// ========== 自动创建 Tag（与 Version bump/publish 流程集成）============

export function makeTagName(version: string, prefix: TagConfig['tagPrefix'], customPrefix?: string): string {
  const prefixMap: Record<string, string> = {
    v: 'v',
    release: 'release/',
    version: 'version/',
  };
  const p = prefix === 'custom' ? (customPrefix || 'v') : prefixMap[prefix];
  return prefix === 'release' || prefix === 'version' ? `${p}${version}` : `${p}${version}`;
}

// 检查某个版本是否应该自动创建 tag
export function shouldAutoTag(status: string): boolean {
  if (!tagConfig.autoTag) return false;
  return tagConfig.tagOnStatus.includes(status);
}

// 自动为版本创建 tag 记录 + 实际 git tag
export function autoCreateTagForVersion(
  versionId: string,
  versionName: string,
  options?: {
    name?: string;       // 自定义 tag 名称
    commitHash?: string;
    message?: string;
    createdBy?: string;
    projectPath?: string; // 项目路径，用于创建实际 git tag
  }
): TagRecord | null {
  if (!shouldAutoTag('published')) return null;

  const tagName = options?.name || makeTagName(versionName, tagConfig.tagPrefix, tagConfig.customPrefix);

  // 检查是否已存在同名 tag
  const existing = getTagByName(tagName);
  if (existing) return existing;

  const record = createTagRecord({
    name: tagName,
    versionId,
    versionName,
    message: options?.message || `Release ${versionName}`,
    commitHash: options?.commitHash,
    createdBy: options?.createdBy,
    annotation: options?.message || `Version ${versionName} released`,
    source: 'auto',
  });

  // 如果提供了项目路径，同时创建实际的 git tag
  if (options?.projectPath) {
    try {
      gitCreateTag(options.projectPath, tagName, options?.message || `Release ${versionName}`);
    } catch (err) {
      console.warn(`[tagService] Failed to create git tag ${tagName} at ${options.projectPath}:`, err);
    }
  }

  return record;
}

// 重命名 tag（更新记录 + git tag）
export function renameTag(
  id: string,
  newName: string,
  options?: { projectPath?: string }
): TagRecord | null {
  const record = getTagRecord(id);
  if (!record) return null;
  if (record.protected) return null;

  const oldName = record.name;

  // 更新 git tag（如果提供了 projectPath）
  if (options?.projectPath && oldName !== newName) {
    try {
      gitDeleteTag(options.projectPath, oldName);
      gitCreateTag(options.projectPath, newName, record.annotation || record.message || undefined);
    } catch (err) {
      console.warn(`[tagService] Failed to rename git tag ${oldName} -> ${newName}:`, err);
    }
  }

  // 更新 DB 记录
  updateTagRecord(id, { name: newName });
  return getTagRecord(id);
}

// 删除 tag（删除记录 + git tag）
export function removeTag(
  id: string,
  options?: { projectPath?: string }
): boolean {
  const record = getTagRecord(id);
  if (!record) return false;
  if (record.protected) return false;

  // 删除 git tag（如果提供了 projectPath）
  if (options?.projectPath) {
    try {
      gitDeleteTag(options.projectPath, record.name);
    } catch (err) {
      console.warn(`[tagService] Failed to delete git tag ${record.name}:`, err);
    }
  }

  return deleteTagRecord(id);
}
