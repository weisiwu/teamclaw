// Version changelog/summary data model for version tracking
export interface VersionSummary {
  id: string;
  versionId: string;
  content: string;
  features: string[];
  changes: string[];
  fixes: string[];
  breaking: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage
const summaries = new Map<string, VersionSummary>();

// Sample data
const sampleSummaries: VersionSummary[] = [
  {
    id: 'sum-001',
    versionId: 'v1',
    content: '初始版本发布，包含基础功能框架。',
    features: ['用户认证', '基础首页'],
    changes: [],
    fixes: [],
    breaking: [],
    createdBy: '系统',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'sum-002',
    versionId: 'v2',
    content: '新增完整的用户管理功能，支持 CRUD 操作。',
    features: ['用户管理', '角色权限', '用户列表', '搜索筛选'],
    changes: ['优化认证流程', '更新依赖版本'],
    fixes: ['修复登录超时问题', '修复列表分页bug'],
    breaking: [],
    createdBy: '系统',
    createdAt: '2026-03-10T14:00:00Z',
    updatedAt: '2026-03-10T14:00:00Z',
  },
];

sampleSummaries.forEach(s => summaries.set(s.versionId, s));

export const VersionSummaryModel = {
  findAll(): VersionSummary[] {
    return Array.from(summaries.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  findByVersionId(versionId: string): VersionSummary | undefined {
    return summaries.get(versionId);
  },

  create(data: Omit<VersionSummary, 'id' | 'createdAt' | 'updatedAt'>): VersionSummary {
    const now = new Date().toISOString();
    const summary: VersionSummary = {
      ...data,
      id: `sum-${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    summaries.set(data.versionId, summary);
    return summary;
  },

  update(versionId: string, data: Partial<Omit<VersionSummary, 'id' | 'versionId' | 'createdAt'>>): VersionSummary | undefined {
    const existing = summaries.get(versionId);
    if (!existing) return undefined;

    const updated: VersionSummary = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    summaries.set(versionId, updated);
    return updated;
  },

  upsert(data: Omit<VersionSummary, 'id' | 'createdAt' | 'updatedAt'>): VersionSummary {
    const existing = summaries.get(data.versionId);
    if (existing) {
      return this.update(data.versionId, data)!;
    }
    return this.create(data);
  },

  delete(versionId: string): boolean {
    return summaries.delete(versionId);
  },
};
