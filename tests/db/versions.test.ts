import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Use a temp DB file per test suite to avoid conflicts
const TMP_DB = path.join(os.tmpdir(), `teamclaw-test-${Date.now()}.db`);

let db: DatabaseSync;

function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(TMP_DB);
    db.exec(`
      CREATE TABLE IF NOT EXISTS versions (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        branch TEXT NOT NULL DEFAULT 'main',
        summary TEXT,
        commit_hash TEXT,
        created_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        build_status TEXT DEFAULT 'pending',
        has_tag INTEGER DEFAULT 0
      );
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL,
        commit_hash TEXT,
        author TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }
  return db;
}

beforeEach(() => {
  const database = getDb();
  database.exec('DELETE FROM versions');
  database.exec('DELETE FROM tags');
});

afterEach(() => {
  if (db) {
    try { db.close(); } catch { /* ignore */ }
    db = undefined as unknown as DatabaseSync;
  }
  try { fs.unlinkSync(TMP_DB); } catch { /* ignore */ }
  try { fs.unlinkSync(`${TMP_DB}-wal`); } catch { /* ignore */ }
  try { fs.unlinkSync(`${TMP_DB}-shm`); } catch { /* ignore */ }
});

// ---- Version CRUD helpers ----

interface VersionRow {
  id: string;
  version: string;
  branch: string;
  summary: string | null;
  commit_hash: string | null;
  created_by: string | null;
  created_at: string;
  build_status: string;
  has_tag: number;
}

function createVersion(db: DatabaseSync, data: {
  id: string;
  version: string;
  branch?: string;
  summary?: string;
  commitHash?: string;
  createdBy?: string;
  buildStatus?: string;
  hasTag?: boolean;
}): void {
  db.prepare(`
    INSERT INTO versions (id, version, branch, summary, commit_hash, created_by, build_status, has_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id,
    data.version,
    data.branch ?? 'main',
    data.summary ?? null,
    data.commitHash ?? null,
    data.createdBy ?? null,
    data.buildStatus ?? 'pending',
    data.hasTag ? 1 : 0,
  );
}

function getVersion(db: DatabaseSync, id: string): VersionRow | undefined {
  return db.prepare('SELECT * FROM versions WHERE id = ?').get(id) as VersionRow | undefined;
}

function getAllVersions(db: DatabaseSync, filters?: {
  branch?: string;
  buildStatus?: string;
  search?: string;
}): VersionRow[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.branch) {
    conditions.push('branch = ?');
    params.push(filters.branch);
  }
  if (filters?.buildStatus) {
    conditions.push('build_status = ?');
    params.push(filters.buildStatus);
  }
  if (filters?.search) {
    conditions.push('(version LIKE ? OR summary LIKE ? OR commit_hash LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM versions ${where} ORDER BY created_at DESC`).all(...params) as VersionRow[];
}

function updateVersion(db: DatabaseSync, id: string, updates: {
  summary?: string;
  buildStatus?: string;
  hasTag?: boolean;
}): boolean {
  const setClauses: string[] = [];
  const params: (string | number)[] = [];

  if (updates.summary !== undefined) {
    setClauses.push('summary = ?');
    params.push(updates.summary);
  }
  if (updates.buildStatus !== undefined) {
    setClauses.push('build_status = ?');
    params.push(updates.buildStatus);
  }
  if (updates.hasTag !== undefined) {
    setClauses.push('has_tag = ?');
    params.push(updates.hasTag ? 1 : 0);
  }

  if (setClauses.length === 0) return false;

  params.push(id);
  const result = db.prepare(`UPDATE versions SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
  return result.changes > 0;
}

function deleteVersion(db: DatabaseSync, id: string): boolean {
  const result = db.prepare('DELETE FROM versions WHERE id = ?').run(id);
  return result.changes > 0;
}

// ---- Tests ----

describe('Version CRUD', () => {
  describe('createVersion', () => {
    it('inserts a version record and retrieves it via getVersion', () => {
      const database = getDb();
      createVersion(database, {
        id: 'v-001',
        version: '1.0.0',
        branch: 'main',
        summary: 'First release',
        commitHash: 'a1b2c3d',
        createdBy: 'dev',
        buildStatus: 'success',
        hasTag: true,
      });

      const row = getVersion(database, 'v-001');
      expect(row).toBeDefined();
      expect(row!.version).toBe('1.0.0');
      expect(row!.branch).toBe('main');
      expect(row!.summary).toBe('First release');
      expect(row!.commit_hash).toBe('a1b2c3d');
      expect(row!.created_by).toBe('dev');
      expect(row!.build_status).toBe('success');
      expect(row!.has_tag).toBe(1);
    });

    it('uses default values when optional fields are omitted', () => {
      const database = getDb();
      createVersion(database, { id: 'v-002', version: '2.0.0' });

      const row = getVersion(database, 'v-002');
      expect(row!.branch).toBe('main');
      expect(row!.build_status).toBe('pending');
      expect(row!.has_tag).toBe(0);
    });

    it('throws on duplicate id primary key constraint', () => {
      const database = getDb();
      createVersion(database, { id: 'dup-1', version: '1.0.0' });
      expect(() => createVersion(database, { id: 'dup-1', version: '2.0.0' })).toThrow();
    });
  });

  describe('getVersion', () => {
    it('returns undefined for non-existent id', () => {
      const database = getDb();
      expect(getVersion(database, 'nonexistent')).toBeUndefined();
    });

    it('retrieves a version created earlier in the same test', () => {
      const database = getDb();
      createVersion(database, { id: 'v-003', version: '3.0.0', branch: 'develop' });
      const row = getVersion(database, 'v-003');
      expect(row!.version).toBe('3.0.0');
      expect(row!.branch).toBe('develop');
    });
  });

  describe('getAllVersions', () => {
    it('returns all versions ordered by created_at desc', () => {
      const database = getDb();
      // Insert with distinct timestamps so order is deterministic
      database.prepare(`INSERT INTO versions (id, version, branch, created_at) VALUES (?, ?, ?, ?)`).run('v-old', '1.0.0', 'main', '2026-01-01T00:00:00.000Z');
      database.prepare(`INSERT INTO versions (id, version, branch, created_at) VALUES (?, ?, ?, ?)`).run('v-new', '2.0.0', 'main', '2026-03-01T00:00:00.000Z');

      const rows = getAllVersions(database);
      expect(rows).toHaveLength(2);
      // Most recent first
      expect(rows[0].id).toBe('v-new');
      expect(rows[1].id).toBe('v-old');
    });

    it('filters by branch', () => {
      const database = getDb();
      createVersion(database, { id: 'v-x', version: '1.0.0', branch: 'main' });
      createVersion(database, { id: 'v-y', version: '2.0.0', branch: 'develop' });

      const rows = getAllVersions(database, { branch: 'develop' });
      expect(rows).toHaveLength(1);
      expect(rows[0].branch).toBe('develop');
    });

    it('filters by buildStatus', () => {
      const database = getDb();
      createVersion(database, { id: 'v-s', version: '1.0.0', buildStatus: 'success' });
      createVersion(database, { id: 'v-f', version: '2.0.0', buildStatus: 'failed' });

      const rows = getAllVersions(database, { buildStatus: 'success' });
      expect(rows).toHaveLength(1);
      expect(rows[0].build_status).toBe('success');
    });

    it('searches across version, summary, and commit_hash', () => {
      const database = getDb();
      createVersion(database, { id: 'v-1', version: '1.0.0', summary: 'Initial release', commitHash: 'abc000' });
      createVersion(database, { id: 'v-2', version: '2.0.0', summary: 'Bug fixes', commitHash: 'def111' });

      const byVersion = getAllVersions(database, { search: '1.0' });
      expect(byVersion).toHaveLength(1);
      expect(byVersion[0].id).toBe('v-1');

      const bySummary = getAllVersions(database, { search: 'Bug' });
      expect(bySummary).toHaveLength(1);
      expect(bySummary[0].id).toBe('v-2');

      const byHash = getAllVersions(database, { search: 'abc0' });
      expect(byHash).toHaveLength(1);
      expect(byHash[0].id).toBe('v-1');
    });

    it('returns empty array when no versions exist', () => {
      const database = getDb();
      const rows = getAllVersions(database);
      expect(rows).toHaveLength(0);
    });
  });

  describe('updateVersion', () => {
    it('updates summary field', () => {
      const database = getDb();
      createVersion(database, { id: 'v-u1', version: '1.0.0', summary: 'Old summary' });

      const updated = updateVersion(database, 'v-u1', { summary: 'New summary' });
      expect(updated).toBe(true);
      expect(getVersion(database, 'v-u1')!.summary).toBe('New summary');
    });

    it('updates buildStatus field', () => {
      const database = getDb();
      createVersion(database, { id: 'v-u2', version: '1.0.0', buildStatus: 'pending' });

      const updated = updateVersion(database, 'v-u2', { buildStatus: 'success' });
      expect(updated).toBe(true);
      expect(getVersion(database, 'v-u2')!.build_status).toBe('success');
    });

    it('updates hasTag field', () => {
      const database = getDb();
      createVersion(database, { id: 'v-u3', version: '1.0.0', hasTag: false });

      const updated = updateVersion(database, 'v-u3', { hasTag: true });
      expect(updated).toBe(true);
      expect(getVersion(database, 'v-u3')!.has_tag).toBe(1);
    });

    it('returns false when no updates provided', () => {
      const database = getDb();
      createVersion(database, { id: 'v-u4', version: '1.0.0' });
      expect(updateVersion(database, 'v-u4', {})).toBe(false);
    });

    it('returns false for non-existent id', () => {
      const database = getDb();
      expect(updateVersion(database, 'nonexistent', { summary: 'New' })).toBe(false);
    });

    it('updates multiple fields at once', () => {
      const database = getDb();
      createVersion(database, { id: 'v-u5', version: '1.0.0', buildStatus: 'pending', hasTag: false });

      const updated = updateVersion(database, 'v-u5', { buildStatus: 'success', hasTag: true });
      expect(updated).toBe(true);
      const row = getVersion(database, 'v-u5');
      expect(row!.build_status).toBe('success');
      expect(row!.has_tag).toBe(1);
    });
  });

  describe('deleteVersion', () => {
    it('deletes an existing version', () => {
      const database = getDb();
      createVersion(database, { id: 'v-d1', version: '1.0.0' });

      const deleted = deleteVersion(database, 'v-d1');
      expect(deleted).toBe(true);
      expect(getVersion(database, 'v-d1')).toBeUndefined();
    });

    it('returns false when version does not exist', () => {
      const database = getDb();
      expect(deleteVersion(database, 'nonexistent')).toBe(false);
    });

    it('only deletes the specified version, not others', () => {
      const database = getDb();
      createVersion(database, { id: 'v-keep', version: '1.0.0' });
      createVersion(database, { id: 'v-del', version: '2.0.0' });

      deleteVersion(database, 'v-del');

      const rows = getAllVersions(database);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('v-keep');
    });
  });
});
