// Tag Service - 标签生命周期管理服务
// 管理 Git tag 的持久化记录，支持归档、保护、删除等操作

import { TagRecord, TagConfig } from '../models/tag.js';
import { createTag as gitCreateTag, deleteTag as gitDeleteTag } from './gitService.js';

// 内存存储（接入真实 DB 时替换为数据库查询）
const tagStore = new Map<string, TagRecord>();

// 默认 tag 配置
const defaultConfig: TagConfig = {
  autoTag: true,
  tagPrefix: 'v',
  tagOnStatus: ['published'],
  autoArchiveEnabled: false,
};

let tagConfig: TagConfig = { ...defaultConfig };

// ========== Tag 记录管理 ==========

export function createTagRecord(data: Omit<TagRecord, 'id' | 'createdAt' | 'archived' | 'protected'>): TagRecord {
  const id = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const record: TagRecord = {
    ...data,
    id,
    archived: false,
    protected: false,
    createdAt: new Date().toISOString(),
  };
  tagStore.set(id, record);
  return record;
}

export function getTagRecord(id: string): TagRecord | undefined {
  return tagStore.get(id);
}

export function getTagByName(name: string): TagRecord | undefined {
  for (const record of tagStore.values()) {
    if (record.name === name) return record;
  }
  return undefined;
}

export function getAllTagRecords(): TagRecord[] {
  return Array.from(tagStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getTagsByVersionId(versionId: string): TagRecord[] {
  return Array.from(tagStore.values())
    .filter(t => t.versionId === versionId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateTagRecord(id: string, updates: Partial<TagRecord>): TagRecord | undefined {
  const record = tagStore.get(id);
  if (!record) return undefined;
  const updated = { ...record, ...updates };
  tagStore.set(id, updated);
  return updated;
}

export function deleteTagRecord(id: string): boolean {
  const record = tagStore.get(id);
  if (!record) return false;
  if (record.protected) return false; // 不能删除受保护标签
  return tagStore.delete(id);
}

export function deleteTagByName(name: string): boolean {
  const record = getTagByName(name);
  if (!record) return false;
  if (record.protected) return false;
  return tagStore.delete(record.id);
}

// ========== 归档/保护操作 ==========

export function archiveTag(id: string, archived: boolean = true): TagRecord | undefined {
  const record = tagStore.get(id);
  if (!record) return undefined;
  if (record.protected && archived) return undefined; // 不能归档受保护标签
  record.archived = archived;
  record.archivedAt = archived ? new Date().toISOString() : undefined;
  tagStore.set(id, record);
  return record;
}

export function protectTag(id: string, protect: boolean = true): TagRecord | undefined {
  const record = tagStore.get(id);
  if (!record) return undefined;
  record.protected = protect;
  tagStore.set(id, record);
  return record;
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
  const record = tagStore.get(id);
  if (!record) return null;
  if (record.protected) return null;

  const oldName = record.name;

  // 更新 git tag（如果提供了 projectPath）
  if (options?.projectPath && oldName !== newName) {
    try {
      gitDeleteTag(options.projectPath, oldName);
      gitCreateTag(options.projectPath, newName, record.annotation || record.message);
    } catch (err) {
      console.warn(`[tagService] Failed to rename git tag ${oldName} -> ${newName}:`, err);
    }
  }

  // 更新记录
  record.name = newName;
  record.annotation = record.annotation || record.message;
  tagStore.set(id, record);
  return record;
}

// 删除 tag（删除记录 + git tag）
export function removeTag(
  id: string,
  options?: { projectPath?: string }
): boolean {
  const record = tagStore.get(id);
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

  return tagStore.delete(id);
}
