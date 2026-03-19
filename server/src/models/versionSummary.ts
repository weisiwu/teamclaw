/**
 * VersionSummary Model — In-memory + JSON file persistence
 */

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

const summaries = new Map<string, VersionSummary>();
const indexByVersion = new Map<string, string>(); // versionId -> summaryId

function persist() {
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'summaries.json'),
      JSON.stringify(Array.from(summaries.values()))
    );
  } catch {
    // Ignore
  }
}

function load() {
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(process.cwd(), 'data', 'summaries.json');
    if (fs.existsSync(file)) {
      const data: VersionSummary[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
      data.forEach(s => {
        summaries.set(s.id, s);
        indexByVersion.set(s.versionId, s.id);
      });
    }
  } catch {
    // Start fresh
  }
}

load();

export const VersionSummaryModel = {
  create(data: Omit<VersionSummary, 'id' | 'generatedAt'>): VersionSummary {
    const id = `sum_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const summary: VersionSummary = {
      ...data,
      id,
      generatedAt: new Date().toISOString(),
    };
    summaries.set(id, summary);
    indexByVersion.set(data.versionId, id);
    persist();
    return summary;
  },

  findById(id: string): VersionSummary | undefined {
    return summaries.get(id);
  },

  findByVersionId(versionId: string): VersionSummary | undefined {
    const id = indexByVersion.get(versionId);
    return id ? summaries.get(id) : undefined;
  },

  update(versionId: string, data: {
    content?: string;
    features?: string[];
    fixes?: string[];
    changes?: string[];
    breaking?: string[];
  }): VersionSummary | undefined {
    const existing = this.findByVersionId(versionId);
    if (!existing) return undefined;

    const updated: VersionSummary = {
      ...existing,
      ...data,
      // Rebuild changes_detail from categorized items
      changes_detail: [
        ...(data.features || existing.features).map(d => ({ type: 'feature' as const, description: d })),
        ...(data.fixes || existing.fixes).map(d => ({ type: 'fix' as const, description: d })),
        ...(data.changes || existing.changes).map(d => ({ type: 'improvement' as const, description: d })),
        ...(data.breaking || existing.breaking).map(d => ({ type: 'breaking' as const, description: d })),
      ],
      generatedAt: new Date().toISOString(),
      generatedBy: 'manual',
    };

    summaries.set(existing.id, updated);
    indexByVersion.set(versionId, existing.id);
    persist();
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
    const id = indexByVersion.get(versionId);
    if (!id) return false;
    summaries.delete(id);
    indexByVersion.delete(versionId);
    persist();
    return true;
  },
};
