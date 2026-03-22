// Branch 分支服务 — SQLite 持久化版 (iter-49)
import { getDb } from '../db/sqlite.js';
import { BranchRecord, BranchConfig } from '../models/branch.js';

function toRecord(row: Record<string, unknown>): BranchRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    isMain: Boolean(row.is_main),
    isRemote: Boolean(row.is_remote),
    isProtected: Boolean(row.is_protected),
    createdAt: String(row.created_at),
    lastCommitAt: String(row.last_commit_at),
    commitMessage: String(row.commit_message ?? ''),
    author: String(row.author ?? 'system'),
    versionId: row.version_id ? String(row.version_id) : undefined,
    baseBranch: row.base_branch ? String(row.base_branch) : undefined,
    description: row.description ? String(row.description) : undefined,
  };
}

// ========== 分支 CRUD ==========

export function getAllBranches(): BranchRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM branches
    ORDER BY is_main DESC, name ASC
  `).all() as Record<string, unknown>[];
  return rows.map(toRecord);
}

export function getBranch(id: string): BranchRecord | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM branches WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? toRecord(row) : undefined;
}

export function getBranchByName(name: string): BranchRecord | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM branches WHERE name = ?').get(name) as Record<string, unknown> | undefined;
  return row ? toRecord(row) : undefined;
}

export function getMainBranch(): BranchRecord | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM branches WHERE is_main = 1 LIMIT 1').get() as Record<string, unknown> | undefined;
  return row ? toRecord(row) : undefined;
}

export function createBranch(data: {
  name: string;
  author?: string;
  versionId?: string;
  baseBranch?: string;
  description?: string;
}): BranchRecord {
  const db = getDb();
  const existing = getBranchByName(data.name);
  if (existing) {
    throw new Error(`Branch ${data.name} already exists`);
  }

  const id = `branch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO branches (id, name, is_main, is_remote, is_protected, is_current,
      created_at, last_commit_at, commit_message, author, version_id, base_branch, description)
    VALUES (?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    now,
    now,
    `Created branch ${data.name}`,
    data.author || 'user',
    data.versionId ?? null,
    data.baseBranch ?? null,
    data.description ?? null
  );

  return getBranch(id)!;
}

export function updateBranch(id: string, updates: Partial<BranchRecord>): BranchRecord | undefined {
  const db = getDb();
  const branch = getBranch(id);
  if (!branch) return undefined;

  if (updates.name && updates.name !== branch.name) {
    const existing = getBranchByName(updates.name);
    if (existing && existing.id !== id) {
      throw new Error(`Branch ${updates.name} already exists`);
    }
  }

  const isMain = updates.isMain ?? branch.isMain;
  const isProtected = isMain ? true : (updates.isProtected ?? branch.isProtected);

  db.prepare(`
    UPDATE branches SET
      name = ?, is_main = ?, is_protected = ?,
      last_commit_at = ?, commit_message = ?, author = ?,
      version_id = ?, base_branch = ?, description = ?
    WHERE id = ?
  `).run(
    updates.name ?? branch.name,
    isMain ? 1 : 0,
    isProtected ? 1 : 0,
    updates.lastCommitAt ?? branch.lastCommitAt,
    updates.commitMessage ?? branch.commitMessage,
    updates.author ?? branch.author,
    updates.versionId ?? branch.versionId ?? null,
    updates.baseBranch ?? branch.baseBranch ?? null,
    updates.description ?? branch.description ?? null,
    id
  );

  return getBranch(id);
}

export function deleteBranch(id: string): boolean {
  const db = getDb();
  const branch = getBranch(id);
  if (!branch) return false;
  if (branch.isProtected) throw new Error('Cannot delete protected branch');
  if (branch.isMain) throw new Error('Cannot delete main branch');

  const result = db.prepare('DELETE FROM branches WHERE id = ?').run(id);
  return result.changes > 0;
}

export function setMainBranch(id: string): BranchRecord | undefined {
  const db = getDb();
  const branch = getBranch(id);
  if (!branch) return undefined;

  db.prepare('UPDATE branches SET is_main = 0').run();
  db.prepare('UPDATE branches SET is_main = 1, is_protected = 1 WHERE id = ?').run(id);
  return getBranch(id);
}

export function setBranchProtection(id: string, protect: boolean): BranchRecord | undefined {
  const db = getDb();
  const branch = getBranch(id);
  if (!branch) return undefined;
  if (branch.isMain && !protect) throw new Error('Main branch must always be protected');

  db.prepare('UPDATE branches SET is_protected = ? WHERE id = ?').run(protect ? 1 : 0, id);
  return getBranch(id);
}

export function renameBranch(id: string, newName: string): BranchRecord | undefined {
  const db = getDb();
  const branch = getBranch(id);
  if (!branch) return undefined;
  if (branch.isProtected) throw new Error('Protected branch cannot be renamed');

  db.prepare('UPDATE branches SET name = ? WHERE id = ?').run(newName, id);
  return getBranch(id);
}

export function getBranchConfig(): BranchConfig {
  const db = getDb();
  const row = db.prepare('SELECT * FROM branch_config WHERE id = 1').get() as Record<string, unknown> | undefined;
  if (!row) {
    return { defaultBranch: 'main', protectedBranches: ['main', 'master', 'release/*'], allowForcePush: false, autoCleanupMerged: false };
  }
  return {
    defaultBranch: String(row.default_branch),
    protectedBranches: JSON.parse(String(row.protected_branches)),
    allowForcePush: Boolean(row.allow_force_push),
    autoCleanupMerged: Boolean(row.auto_cleanup_merged),
  };
}

export function updateBranchConfig(updates: Partial<BranchConfig>): BranchConfig {
  const db = getDb();
  const current = getBranchConfig();
  const updated = { ...current, ...updates };
  db.prepare(`
    UPDATE branch_config SET
      default_branch = ?,
      protected_branches = ?,
      allow_force_push = ?,
      auto_cleanup_merged = ?,
      updated_at = datetime('now')
    WHERE id = 1
  `).run(
    updated.defaultBranch,
    JSON.stringify(updated.protectedBranches),
    updated.allowForcePush ? 1 : 0,
    updated.autoCleanupMerged ? 1 : 0
  );
  return updated;
}

export function checkoutBranch(id: string): BranchRecord | undefined {
  const db = getDb();
  const branch = getBranch(id);
  if (!branch) return undefined;

  db.prepare('UPDATE branches SET is_current = 1 WHERE id = ?').run(id);
  db.prepare('UPDATE branches SET is_current = 0 WHERE id != ?').run(id);
  db.prepare('UPDATE branches SET last_commit_at = ? WHERE id = ?').run(new Date().toISOString(), id);
  return getBranch(id);
}

export function getBranchStats() {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) as c FROM branches').get() as { c: number }).c;
  const main = (db.prepare('SELECT COUNT(*) as c FROM branches WHERE is_main = 1').get() as { c: number }).c;
  const protected_ = (db.prepare('SELECT COUNT(*) as c FROM branches WHERE is_protected = 1').get() as { c: number }).c;
  const remote = (db.prepare('SELECT COUNT(*) as c FROM branches WHERE is_remote = 1').get() as { c: number }).c;
  return { total, main, protected: protected_, remote };
}
