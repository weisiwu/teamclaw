// Branch 分支服务 — PostgreSQL 持久化版
import { query, queryOne, execute } from '../db/pg.js';
import { BranchRecord, BranchConfig } from '../models/branch.js';

function toRecord(row: Record<string, unknown>): BranchRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    isMain: Boolean(row.is_main),
    isRemote: Boolean(row.is_remote),
    isProtected: Boolean(row.is_protected),
    createdAt: String(row.created_at),
    lastCommitAt: String(row.last_commit_at ?? ''),
    commitMessage: String(row.commit_message ?? ''),
    author: String(row.author ?? 'system'),
    versionId: row.version_id ? String(row.version_id) : undefined,
    baseBranch: row.base_branch ? String(row.base_branch) : undefined,
    description: row.description ? String(row.description) : undefined,
  };
}

// ========== 分支 CRUD ==========

export async function getAllBranches(): Promise<BranchRecord[]> {
  const rows = await query<Record<string, unknown>>(
    'SELECT * FROM branches ORDER BY is_main DESC, name ASC'
  );
  return rows.map(toRecord);
}

export async function getBranch(id: string): Promise<BranchRecord | undefined> {
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM branches WHERE id = $1', [id]
  );
  return row ? toRecord(row) : undefined;
}

export async function getBranchByName(name: string): Promise<BranchRecord | undefined> {
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM branches WHERE name = $1', [name]
  );
  return row ? toRecord(row) : undefined;
}

export async function getMainBranch(): Promise<BranchRecord | undefined> {
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM branches WHERE is_main = TRUE LIMIT 1'
  );
  return row ? toRecord(row) : undefined;
}

export async function createBranch(data: {
  name: string;
  author?: string;
  versionId?: string;
  baseBranch?: string;
  description?: string;
}): Promise<BranchRecord> {
  const existing = await getBranchByName(data.name);
  if (existing) {
    throw new Error(`Branch ${data.name} already exists`);
  }

  const id = generateId('branch');
  const now = new Date().toISOString();

  await execute(`
    INSERT INTO branches (id, name, is_main, is_remote, is_protected, is_current,
      created_at, last_commit_at, commit_message, author, version_id, base_branch, description)
    VALUES ($1, $2, FALSE, FALSE, FALSE, FALSE, $3, $4, $5, $6, $7, $8, $9)
  `, [
    id,
    data.name,
    now,
    now,
    `Created branch ${data.name}`,
    data.author || 'user',
    data.versionId ?? null,
    data.baseBranch ?? null,
    data.description ?? null,
  ]);

  return (await getBranch(id))!;
}

export async function updateBranch(id: string, updates: Partial<BranchRecord>): Promise<BranchRecord | undefined> {
  const branch = await getBranch(id);
  if (!branch) return undefined;

  if (updates.name && updates.name !== branch.name) {
    const existing = await getBranchByName(updates.name);
    if (existing && existing.id !== id) {
      throw new Error(`Branch ${updates.name} already exists`);
    }
  }

  const isMain = updates.isMain ?? branch.isMain;
  const isProtected = isMain ? true : (updates.isProtected ?? branch.isProtected);

  await execute(`
    UPDATE branches SET
      name = $1, is_main = $2, is_protected = $3,
      last_commit_at = $4, commit_message = $5, author = $6,
      version_id = $7, base_branch = $8, description = $9
    WHERE id = $10
  `, [
    updates.name ?? branch.name,
    isMain,
    isProtected,
    updates.lastCommitAt ?? branch.lastCommitAt,
    updates.commitMessage ?? branch.commitMessage,
    updates.author ?? branch.author,
    updates.versionId ?? branch.versionId ?? null,
    updates.baseBranch ?? branch.baseBranch ?? null,
    updates.description ?? branch.description ?? null,
    id,
  ]);

  return getBranch(id);
}

export async function deleteBranch(id: string): Promise<boolean> {
  const branch = await getBranch(id);
  if (!branch) return false;
  if (branch.isProtected) throw new Error('Cannot delete protected branch');
  if (branch.isMain) throw new Error('Cannot delete main branch');

  const count = await execute('DELETE FROM branches WHERE id = $1', [id]);
  return count > 0;
}

export async function setMainBranch(id: string): Promise<BranchRecord | undefined> {
  const branch = await getBranch(id);
  if (!branch) return undefined;

  await execute('UPDATE branches SET is_main = FALSE');
  await execute('UPDATE branches SET is_main = TRUE, is_protected = TRUE WHERE id = $1', [id]);
  return getBranch(id);
}

export async function setBranchProtection(id: string, protect: boolean): Promise<BranchRecord | undefined> {
  const branch = await getBranch(id);
  if (!branch) return undefined;
  if (branch.isMain && !protect) throw new Error('Main branch must always be protected');

  await execute('UPDATE branches SET is_protected = $1 WHERE id = $2', [protect, id]);
  return getBranch(id);
}

export async function renameBranch(id: string, newName: string): Promise<BranchRecord | undefined> {
  const branch = await getBranch(id);
  if (!branch) return undefined;
  if (branch.isProtected) throw new Error('Protected branch cannot be renamed');

  await execute('UPDATE branches SET name = $1 WHERE id = $2', [newName, id]);
  return getBranch(id);
}

export async function getBranchConfig(): Promise<BranchConfig> {
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM branch_config WHERE id = 1'
  );
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

export async function updateBranchConfig(updates: Partial<BranchConfig>): Promise<BranchConfig> {
  const current = await getBranchConfig();
  const updated = { ...current, ...updates };
  await execute(`
    UPDATE branch_config SET
      default_branch = $1,
      protected_branches = $2,
      allow_force_push = $3,
      auto_cleanup_merged = $4,
      updated_at = NOW()
    WHERE id = 1
  `, [
    updated.defaultBranch,
    JSON.stringify(updated.protectedBranches),
    updated.allowForcePush,
    updated.autoCleanupMerged,
  ]);
  return updated;
}

export async function checkoutBranch(id: string): Promise<BranchRecord | undefined> {
  const branch = await getBranch(id);
  if (!branch) return undefined;

  await execute('UPDATE branches SET is_current = FALSE');
  await execute('UPDATE branches SET is_current = TRUE, last_commit_at = NOW() WHERE id = $1', [id]);
  return getBranch(id);
}

export async function getBranchStats() {
  const totalRow = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM branches');
  const mainRow = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM branches WHERE is_main = TRUE");
  const protectedRow = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM branches WHERE is_protected = TRUE");
  const remoteRow = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM branches WHERE is_remote = TRUE");
  return {
    total: parseInt(totalRow?.count ?? '0', 10),
    main: parseInt(mainRow?.count ?? '0', 10),
    protected: parseInt(protectedRow?.count ?? '0', 10),
    remote: parseInt(remoteRow?.count ?? '0', 10),
  };
}
