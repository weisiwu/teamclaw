/**
 * VersionSummary Model — SQLite persistence (migrated from in-memory)
 */
import { getDb } from '../db/sqlite.js';
function rowToSummary(row) {
    return {
        id: row.id,
        versionId: row.version_id,
        title: row.title || '',
        content: row.content || '',
        features: row.features ? JSON.parse(row.features) : [],
        fixes: row.fixes ? JSON.parse(row.fixes) : [],
        changes: row.changes ? JSON.parse(row.changes) : [],
        breaking: row.breaking ? JSON.parse(row.breaking) : [],
        changes_detail: row.changes_detail ? JSON.parse(row.changes_detail) : [],
        generatedAt: row.generated_at,
        generatedBy: row.generated_by,
        branchName: row.branch_name,
    };
}
export const VersionSummaryModel = {
    create(data) {
        const db = getDb();
        const id = `sum_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const generatedAt = new Date().toISOString();
        db.prepare(`
      INSERT INTO version_summaries (id, version_id, title, content, features, fixes, changes, breaking, changes_detail, generated_at, generated_by, branch_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.versionId, data.title, data.content, JSON.stringify(data.features), JSON.stringify(data.fixes), JSON.stringify(data.changes), JSON.stringify(data.breaking), JSON.stringify(data.changes_detail), generatedAt, data.generatedBy, data.branchName || null);
        return { id, ...data, generatedAt, generatedBy: data.generatedBy };
    },
    findById(id) {
        const db = getDb();
        const row = db.prepare('SELECT * FROM version_summaries WHERE id = ?').get(id);
        return row ? rowToSummary(row) : undefined;
    },
    findByVersionId(versionId) {
        const db = getDb();
        const row = db.prepare('SELECT * FROM version_summaries WHERE version_id = ?').get(versionId);
        return row ? rowToSummary(row) : undefined;
    },
    update(versionId, data) {
        const db = getDb();
        const existing = this.findByVersionId(versionId);
        if (!existing)
            return undefined;
        const updated = {
            ...existing,
            ...data,
            changes_detail: [
                ...(data.features || existing.features).map(d => ({ type: 'feature', description: d })),
                ...(data.fixes || existing.fixes).map(d => ({ type: 'fix', description: d })),
                ...(data.changes || existing.changes).map(d => ({ type: 'improvement', description: d })),
                ...(data.breaking || existing.breaking).map(d => ({ type: 'breaking', description: d })),
            ],
            generatedAt: new Date().toISOString(),
            generatedBy: 'manual',
        };
        db.prepare(`
      UPDATE version_summaries
      SET title=?, content=?, features=?, fixes=?, changes=?, breaking=?, changes_detail=?, generated_at=?, generated_by=?
      WHERE version_id=?
    `).run(updated.title, updated.content, JSON.stringify(updated.features), JSON.stringify(updated.fixes), JSON.stringify(updated.changes), JSON.stringify(updated.breaking), JSON.stringify(updated.changes_detail), updated.generatedAt, updated.generatedBy, versionId);
        return updated;
    },
    upsert(data) {
        const existing = this.findByVersionId(data.versionId);
        if (existing) {
            return this.update(data.versionId, {
                content: data.content,
                features: data.features,
                fixes: data.fixes,
                changes: data.changes,
                breaking: data.breaking,
            });
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
                ...(data.features || []).map(d => ({ type: 'feature', description: d })),
                ...(data.fixes || []).map(d => ({ type: 'fix', description: d })),
                ...(data.changes || []).map(d => ({ type: 'improvement', description: d })),
                ...(data.breaking || []).map(d => ({ type: 'breaking', description: d })),
            ],
            generatedBy: data.createdBy || 'AI',
        });
    },
    delete(versionId) {
        const db = getDb();
        const info = db.prepare('DELETE FROM version_summaries WHERE version_id = ?').run(versionId);
        return info.changes > 0;
    },
};
