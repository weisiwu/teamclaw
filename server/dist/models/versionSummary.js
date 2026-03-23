/**
 * VersionSummary Model — PostgreSQL persistence
 */
import { query, queryOne, execute } from '../db/pg.js';
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
    async create(data) {
        const id = `sum_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const generatedAt = new Date().toISOString();
        await execute(`
      INSERT INTO version_summaries (id, version_id, title, content, features, fixes, changes, breaking, changes_detail, generated_at, generated_by, branch_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
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
            data.branchName || null,
        ]);
        return { id, ...data, generatedAt, generatedBy: data.generatedBy };
    },
    async findById(id) {
        const row = await queryOne('SELECT * FROM version_summaries WHERE id = $1', [id]);
        return row ? rowToSummary(row) : undefined;
    },
    async findByVersionId(versionId) {
        const row = await queryOne('SELECT * FROM version_summaries WHERE version_id = $1', [versionId]);
        return row ? rowToSummary(row) : undefined;
    },
    async findAll() {
        const rows = await query('SELECT * FROM version_summaries ORDER BY generated_at DESC');
        return rows.map(rowToSummary);
    },
    async update(versionId, data) {
        const existing = await this.findByVersionId(versionId);
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
        await execute(`
      UPDATE version_summaries
      SET title=$1, content=$2, features=$3, fixes=$4, changes=$5, breaking=$6, changes_detail=$7, generated_at=$8, generated_by=$9
      WHERE version_id=$10
    `, [
            updated.title,
            updated.content,
            JSON.stringify(updated.features),
            JSON.stringify(updated.fixes),
            JSON.stringify(updated.changes),
            JSON.stringify(updated.breaking),
            JSON.stringify(updated.changes_detail),
            updated.generatedAt,
            updated.generatedBy,
            versionId,
        ]);
        return updated;
    },
    async upsert(data) {
        const existing = await this.findByVersionId(data.versionId);
        if (existing) {
            return (await this.update(data.versionId, {
                content: data.content,
                features: data.features,
                fixes: data.fixes,
                changes: data.changes,
                breaking: data.breaking,
            }));
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
    async delete(versionId) {
        const count = await execute('DELETE FROM version_summaries WHERE version_id = $1', [versionId]);
        return count > 0;
    },
};
