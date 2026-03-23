import { useMutation, useQuery } from "@tanstack/react-query";
import { Version, TagLifecycleRecord, BatchTagResponse } from "./types";

// ========== Tag 生命周期管理 ==========

const TAG_STORAGE_KEY = "teamclaw_version_tags";

// 从 localStorage 获取所有 Tag 记录
function getStoredTags(): TagLifecycleRecord[] {
  const stored = localStorage.getItem(TAG_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// 保存 Tag 记录到 localStorage
function saveTags(tags: TagLifecycleRecord[]): void {
  localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(tags));
}

// 创建 Tag 记录
export function createTagRecord(version: Version, tagName: string): TagLifecycleRecord {
  const tags = getStoredTags();
  const newTag: TagLifecycleRecord = {
    id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: tagName,
    versionId: version.id,
    version: version.version,
    archived: false,
    protected: false,
    createdAt: new Date().toISOString(),
  };
  tags.push(newTag);
  saveTags(tags);
  return newTag;
}

// 归档/取消归档 Tag
export function archiveTag(tagId: string, archive: boolean = true): TagLifecycleRecord | null {
  const tags = getStoredTags();
  const tagIndex = tags.findIndex(t => t.id === tagId);
  if (tagIndex === -1) return null;

  if (tags[tagIndex].protected && archive) {
    console.warn(`[Tag] Cannot archive protected tag: ${tags[tagIndex].name}`);
    return null;
  }

  tags[tagIndex].archived = archive;
  tags[tagIndex].archivedAt = archive ? new Date().toISOString() : undefined;
  saveTags(tags);
  return tags[tagIndex];
}

// 设置/取消保护 Tag
export function setTagProtection(tagId: string, protect: boolean = true): TagLifecycleRecord | null {
  const tags = getStoredTags();
  const tagIndex = tags.findIndex(t => t.id === tagId);
  if (tagIndex === -1) return null;

  tags[tagIndex].protected = protect;
  saveTags(tags);
  return tags[tagIndex];
}

// 删除 Tag（带保护检查）
export function deleteTagRecord(tagId: string): boolean {
  const tags = getStoredTags();
  const tag = tags.find(t => t.id === tagId);

  if (!tag) return false;
  if (tag.protected) {
    console.warn(`[Tag] Cannot delete protected tag: ${tag.name}`);
    return false;
  }

  const filtered = tags.filter(t => t.id !== tagId);
  saveTags(filtered);
  return true;
}

// 重命名 Tag
export function renameTagRecord(tagId: string, newName: string): TagLifecycleRecord | null {
  const tags = getStoredTags();
  const tagIndex = tags.findIndex(t => t.id === tagId);
  if (tagIndex === -1) return null;

  const tag = tags[tagIndex];
  if (tag.protected) {
    console.warn(`[Tag] Cannot rename protected tag: ${tag.name}`);
    return null;
  }

  const existing = tags.find(t => t.name === newName && t.id !== tagId);
  if (existing) {
    console.warn(`[Tag] Tag name already exists: ${newName}`);
    return null;
  }

  tags[tagIndex].name = newName;
  saveTags(tags);
  return tags[tagIndex];
}

// 获取所有 Tag 记录
export function getAllTags(): TagLifecycleRecord[] {
  return getStoredTags();
}

// 获取版本关联的 Tags
export function getVersionTags(versionId: string): TagLifecycleRecord[] {
  const tags = getStoredTags();
  return tags.filter(t => t.versionId === versionId);
}

// ========== 批量操作 ==========

export async function batchCreateTags(
  versions: Version[],
  prefix: string = 'v'
): Promise<BatchTagResponse> {
  const results: BatchTagResponse['results'] = [];
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const version of versions) {
    try {
      const tagName = version.version.startsWith('v') ? version.version : `${prefix}${version.version}`;
      createTagRecord(version, tagName);
      results.push({ versionId: version.id, success: true, tagName });
      totalSuccess++;
    } catch (error) {
      results.push({ versionId: version.id, success: false, error: String(error) });
      totalFailed++;
    }
  }

  return {
    success: totalFailed === 0,
    results,
    totalSuccess,
    totalFailed,
  };
}

export async function batchArchiveTags(
  versionIds: string[],
  archive: boolean = true
): Promise<{ success: boolean; archived: number; failed: number }> {
  const tags = getStoredTags();
  let archived = 0;
  let failed = 0;

  for (const tag of tags) {
    if (versionIds.includes(tag.versionId)) {
      if (archiveTag(tag.id, archive)) {
        archived++;
      } else {
        failed++;
      }
    }
  }

  return { success: failed === 0, archived, failed };
}

export async function batchDeleteTags(versionIds: string[]): Promise<{ success: boolean; deleted: number; failed: number }> {
  const tags = getStoredTags();
  let deleted = 0;
  let failed = 0;

  for (const tag of tags) {
    if (versionIds.includes(tag.versionId)) {
      if (deleteTagRecord(tag.id)) {
        deleted++;
      } else {
        failed++;
      }
    }
  }

  return { success: failed === 0, deleted, failed };
}

// ========== Tag 生命周期 Hooks ==========

export function useAllTags() {
  return useQuery<TagLifecycleRecord[]>({
    queryKey: ["allTags"],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/tags');
        const json = await res.json();
        if ((json.code === 200 || json.code === 0) && json.data?.data) {
          return json.data.data.map((t: TagLifecycleRecord & { versionId?: string; version?: string }) => ({
            id: t.name,
            name: t.name,
            versionId: t.versionId || '',
            version: t.version || t.name,
            archived: false,
            protected: t.protected || false,
            createdAt: t.date || t.createdAt || new Date().toISOString(),
            commit: t.commit,
            date: t.date,
            annotation: t.annotation,
            hasRecord: t.hasRecord,
          }));
        }
        return getAllTags();
      } catch {
        return getAllTags();
      }
    },
  });
}

export function useVersionTags(versionId: string) {
  return useQuery<TagLifecycleRecord[]>({
    queryKey: ["versionTags", versionId],
    queryFn: () => getVersionTags(versionId),
  });
}

export function useArchiveTag() {
  return useMutation({
    mutationFn: ({ tagId, archive }: { tagId: string; archive: boolean }) =>
      Promise.resolve(archiveTag(tagId, archive)),
  });
}

export function useTagProtection() {
  return useMutation({
    mutationFn: ({ tagId, protect }: { tagId: string; protect: boolean }) =>
      Promise.resolve(setTagProtection(tagId, protect)),
  });
}

export function useDeleteTag() {
  return useMutation({
    mutationFn: (tagId: string) => Promise.resolve(deleteTagRecord(tagId)),
  });
}

export function useRenameTag() {
  return useMutation({
    mutationFn: ({ tagId, name }: { tagId: string; name: string }) =>
      Promise.resolve(renameTagRecord(tagId, name)),
  });
}

export function useBatchCreateTags() {
  return useMutation({
    mutationFn: ({ versions, prefix }: { versions: Version[]; prefix?: string }) =>
      batchCreateTags(versions, prefix),
  });
}
