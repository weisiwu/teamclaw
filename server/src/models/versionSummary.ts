/**
 * VersionSummary Model — SQLite persistence (migrated from in-memory)
 */

import { getDb } from '../db/sqlite.js';

export interface VersionChange {
  type: 'feature' | 'fix' | 'improvement' | 'breaking' | 'docs' | 'refactor' | 'other';
  description: string;
  files?: string[];
}

export interface VersionSummary {
  id: string;
  versionId: string;
  title: string;
  content: string;
  features: string[];
  fixes: string[];
  changes: string[];
  breaking: string[];
  changes_detail: VersionChange[];
  generatedAt: string;
  generatedBy: string; // 'AI' | 'manual' | 'system'
  branchName?: string;
}

function rowToSummary(row: Record<string, unknown>): VersionSummary {
  return {
    id: row.id as string,
    versionId: row.version_id as string,
    title: (row.title as string) || '',
    content: (row.content as string) || '',
    features: row.features ? JSON.parse(row.features as string) : [],
    fixes: row.fixes ? JSON.parse(row.fixes as string) : [],
    changes: row.changes ? JSON.parse(row.changes as string) : [],
    breaking: row.breaking ? JSON.parse(row.breaking as string) : [],
    changes_detail: row.changes_detail ? JSON.parse(row.changes_detail as string) : [],
    generatedAt: row.generated_at as string,
    generatedBy: row.generated_by as string,
    branchName: row.branch_name as string | undefined,
  };
}

export const VersionSummaryModel = {
  create(data: Omit<VersionSummary, 'id' | 'generatedAt'>): VersionSummary {
    const db = getDb();
    const id = `sum_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const generatedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO version_summaries (id, version_id, title, content, features, fixes, changes, breaking, changes_detail, generated_at, generated_by, branch_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.versionId,
      data.title,
      data.content,
      JSON.stringify(data.features),
      JSON.stringify(data.fixes),
      JSON.stringify(data.changes),
      JSON.stringify(data.breaking),
      JSON.stringify(data.changes_detail),
      generatedAt,
      data.generatedBy,
      data.branchName || null
    );

    return { id, ...data, generatedAt, generatedBy: data.generatedBy };
  },

  findById(id: string): VersionSummary | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM version_summaries WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? rowToSummary(row) : undefined;
  },

  findByVersionId(versionId: string): VersionSummary | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM version_summaries WHERE version_id = ?').get(versionId) as Record<string, unknown> | undefined;
    return row ? rowToSummary(row) : undefined;
  },

  update(versionId: string, data: {
    content?: string;
    features?: string[];
    fixes?: string[];
    changes?: string[];
    breaking?: string[];
  }): VersionSummary | undefined {
    const db = getDb();
    const existing = this.findByVersionId(versionId);
    if (!existing) return undefined;

    const updated: VersionSummary = {
      ...existing,
      ...data,
      changes_detail: [
        ...(data.features || existing.features).map(d => ({ type: 'feature' as const, description: d })),
        ...(data.fixes || existing.fixes).map(d => ({ type: 'fix' as const, description: d })),
        ...(data.changes || existing.changes).map(d => ({ type: 'improvement' as const, description: d })),
        ...(data.breaking || existing.breaking).map(d => ({ type: 'breaking' as const, description: d })),
      ],
      generatedAt: new Date().toISOString(),
      generatedBy: 'manual',
    };

    db.prepare(`
      UPDATE version_summaries
      SET title=?, content=?, features=?, fixes=?, changes=?, breaking=?, changes_detail=?, generated_at=?, generated_by=?
      WHERE version_id=?
    `).run(
      updated.title,
      updated.content,
      JSON.stringify(updated.features),
      JSON.stringify(updated.fixes),
      JSON.stringify(updated.changes),
      JSON.stringify(updated.breaking),
      JSON.stringify(updated.changes_detail),
      updated.generatedAt,
      updated.generatedBy,
      versionId
    );

    return updated;
  },

  upsert(data: {
    versionId: string;
    content: string;
    features?: string[];
    fixes?: string[];
    changes?: string[];
    breaking?: string[];
    createdBy?: string;
    title?: string;
  }): VersionSummary {
    const existing = this.findByVersionId(data.versionId);
    if (existing) {
      return this.update(data.versionId, {
        content: data.content,
        features: data.features,
        fixes: data.fixes,
        changes: data.changes,
        breaking: data.breaking,
      })!;
    }
    return this.create({
      versionId: data.versionId,
      title: data.title || '',
      content: data.content,
      features: data.features || [],
      fixes: data.fixes || [],
      changes: data.changes || [],
      breaking: data.breaking || [],
      changes_detail: [
        ...(data.features || []).map(d => ({ type: 'feature' as const, description: d })),
        ...(data.fixes || []).map(d => ({ type: 'fix' as const, description: d })),
        ...(data.changes || []).map(d => ({ type: 'improvement' as const, description: d })),
        ...(data.breaking || []).map(d => ({ type: 'breaking' as const, description: d })),
      ],
      generatedBy: data.createdBy || 'AI',
    });
  },

  delete(versionId: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM version_summaries WHERE version_id = ?').run(versionId);
    return info.changes > 0;
  },
};
