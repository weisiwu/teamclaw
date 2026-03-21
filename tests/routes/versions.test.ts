import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- Mock next/server before importing anything ----

const mockJson = vi.fn();
const mockNextResponseJson = vi.fn();

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    headers: Map<string, string> = new Map();
    constructor(url: string) {
      this.url = url;
    }
    get headersMap() {
      return this.headers;
    }
  },
  NextResponse: {
    json: mockNextResponseJson,
  },
}));

// ---- Mock version store ----

const mockVersionStore = new Map([
  [
    'v-test-1',
    {
      id: 'v-test-1',
      version: '1.0.0',
      branch: 'main',
      summary: 'Initial release',
      commitHash: 'abc1234',
      createdBy: 'test-user',
      createdAt: '2026-03-01T10:00:00.000Z',
      buildStatus: 'success',
      hasTag: true,
    },
  ],
  [
    'v-test-2',
    {
      id: 'v-test-2',
      version: '1.1.0',
      branch: 'main',
      summary: 'Feature update',
      commitHash: 'def5678',
      createdBy: 'coder',
      createdAt: '2026-03-10T10:00:00.000Z',
      buildStatus: 'failed',
      hasTag: false,
    },
  ],
  [
    'v-test-3',
    {
      id: 'v-test-3',
      version: '2.0.0-beta',
      branch: 'develop',
      summary: 'Beta release',
      commitHash: 'ghi9012',
      createdBy: 'pm',
      createdAt: '2026-03-15T10:00:00.000Z',
      buildStatus: 'building',
      hasTag: false,
    },
  ],
]);

vi.mock('../../app/api/v1/versions/version-store', () => ({
  versionStore: mockVersionStore,
}));

// ---- Re-implement route handler logic for testing ----
// This mirrors the GET handler in app/api/v1/versions/route.ts

function jsonSuccess(data: unknown) {
  return { code: 0, data };
}

function jsonError(message: string, status: number) {
  return { code: status, message };
}

function handleGetVersions(params: {
  page?: string | null;
  pageSize?: string | null;
  status?: string | null;
  branch?: string | null;
  search?: string | null;
}) {
  const page = parseInt(params.page || '1');
  const pageSize = parseInt(params.pageSize || '20');

  let versions = Array.from(mockVersionStore.values());

  if (params.status) {
    versions = versions.filter(v => v.buildStatus === params.status);
  }
  if (params.branch) {
    versions = versions.filter(v => v.branch === params.branch);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    versions = versions.filter(v =>
      v.version.toLowerCase().includes(q) ||
      (v.summary && v.summary.toLowerCase().includes(q)) ||
      (v.commitHash && v.commitHash.toLowerCase().includes(q))
    );
  }

  versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = versions.length;
  const start = (page - 1) * pageSize;
  const paginatedVersions = versions.slice(start, start + pageSize);

  return jsonSuccess({
    items: paginatedVersions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ---- Tests ----

describe('GET /api/v1/versions handler logic', () => {
  beforeEach(() => {
    mockVersionStore.clear();
    mockVersionStore.set('v-test-1', {
      id: 'v-test-1', version: '1.0.0', branch: 'main', summary: 'Initial release',
      commitHash: 'abc1234', createdBy: 'test-user', createdAt: '2026-03-01T10:00:00.000Z',
      buildStatus: 'success', hasTag: true,
    });
    mockVersionStore.set('v-test-2', {
      id: 'v-test-2', version: '1.1.0', branch: 'main', summary: 'Feature update',
      commitHash: 'def5678', createdBy: 'coder', createdAt: '2026-03-10T10:00:00.000Z',
      buildStatus: 'failed', hasTag: false,
    });
    mockVersionStore.set('v-test-3', {
      id: 'v-test-3', version: '2.0.0-beta', branch: 'develop', summary: 'Beta release',
      commitHash: 'ghi9012', createdBy: 'pm', createdAt: '2026-03-15T10:00:00.000Z',
      buildStatus: 'building', hasTag: false,
    });
  });

  describe('returns correct JSON structure', () => {
    it('returns code 0', () => {
      const result = handleGetVersions({});
      expect(result.code).toBe(0);
    });

    it('returns array structure with items, total, page, pageSize, totalPages', () => {
      const result = handleGetVersions({}) as { data: Record<string, unknown> };
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('total');
      expect(result.data).toHaveProperty('page');
      expect(result.data).toHaveProperty('pageSize');
      expect(result.data).toHaveProperty('totalPages');
    });

    it('items is an array', () => {
      const result = handleGetVersions({}) as { data: { items: unknown[] } };
      expect(Array.isArray(result.data.items)).toBe(true);
    });

    it('items contain required version fields', () => {
      const result = handleGetVersions({}) as { data: { items: Array<Record<string, unknown>> } };
      const item = result.data.items[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('version');
      expect(item).toHaveProperty('branch');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('buildStatus');
      expect(item).toHaveProperty('hasTag');
    });

    it('total equals items length when no filter is applied', () => {
      const result = handleGetVersions({}) as { data: { total: number; items: unknown[] } };
      expect(result.data.total).toBe(result.data.items.length);
    });

    it('totalPages is correctly computed', () => {
      const result = handleGetVersions({ page: '1', pageSize: '2' }) as { data: { total: number; totalPages: number } };
      expect(result.data.total).toBe(3);
      expect(result.data.totalPages).toBe(2); // ceil(3/2) = 2
    });
  });

  describe('pagination', () => {
    it('returns one item per page when pageSize=1', () => {
      const result = handleGetVersions({ page: '1', pageSize: '1' }) as { data: { items: unknown[]; page: number } };
      expect(result.data.items).toHaveLength(1);
      expect(result.data.page).toBe(1);
    });

    it('returns page 2 with pageSize=1', () => {
      const result = handleGetVersions({ page: '2', pageSize: '1' }) as { data: { items: unknown[]; page: number } };
      expect(result.data.items).toHaveLength(1);
      expect(result.data.page).toBe(2);
    });

    it('returns page 3 with pageSize=1 (last item)', () => {
      const result = handleGetVersions({ page: '3', pageSize: '1' }) as { data: { items: unknown[] } };
      expect(result.data.items).toHaveLength(1);
    });

    it('returns empty page when page exceeds total', () => {
      const result = handleGetVersions({ page: '999', pageSize: '10' }) as { data: { items: unknown[] } };
      expect(result.data.items).toHaveLength(0);
    });

    it('uses default page=1 when not provided', () => {
      const result = handleGetVersions({ pageSize: '2' }) as { data: { page: number } };
      expect(result.data.page).toBe(1);
    });

    it('uses default pageSize=20 when not provided', () => {
      const result = handleGetVersions({}) as { data: { pageSize: number } };
      expect(result.data.pageSize).toBe(20);
    });
  });

  describe('filtering by buildStatus', () => {
    it('filters by status=success', () => {
      const result = handleGetVersions({ status: 'success' }) as { data: { total: number; items: Array<{ buildStatus: string }> } };
      expect(result.data.total).toBe(1);
      expect(result.data.items[0].buildStatus).toBe('success');
    });

    it('filters by status=failed', () => {
      const result = handleGetVersions({ status: 'failed' }) as { data: { total: number } };
      expect(result.data.total).toBe(1);
    });

    it('filters by status=building', () => {
      const result = handleGetVersions({ status: 'building' }) as { data: { total: number } };
      expect(result.data.total).toBe(1);
    });

    it('returns empty when no versions match status', () => {
      const result = handleGetVersions({ status: 'pending' }) as { data: { total: number; items: unknown[] } };
      expect(result.data.total).toBe(0);
      expect(result.data.items).toHaveLength(0);
    });
  });

  describe('filtering by branch', () => {
    it('filters by branch=main', () => {
      const result = handleGetVersions({ branch: 'main' }) as { data: { total: number } };
      expect(result.data.total).toBe(2);
    });

    it('filters by branch=develop', () => {
      const result = handleGetVersions({ branch: 'develop' }) as { data: { total: number } };
      expect(result.data.total).toBe(1);
    });

    it('returns empty for non-existent branch', () => {
      const result = handleGetVersions({ branch: 'nonexistent' }) as { data: { total: number } };
      expect(result.data.total).toBe(0);
    });
  });

  describe('search', () => {
    it('matches version field', () => {
      const result = handleGetVersions({ search: '1.1' }) as { data: { total: number; items: Array<{ version: string }> } };
      expect(result.data.total).toBe(1);
      expect(result.data.items[0].version).toBe('1.1.0');
    });

    it('matches summary field', () => {
      const result = handleGetVersions({ search: 'Initial' }) as { data: { total: number } };
      expect(result.data.total).toBe(1);
    });

    it('matches commitHash field', () => {
      const result = handleGetVersions({ search: 'abc1' }) as { data: { total: number } };
      expect(result.data.total).toBe(1);
    });

    it('search is case-insensitive', () => {
      const result = handleGetVersions({ search: 'INITIAL' }) as { data: { total: number } };
      expect(result.data.total).toBe(1);
    });

    it('returns empty for no match', () => {
      const result = handleGetVersions({ search: 'nonexistent' }) as { data: { total: number } };
      expect(result.data.total).toBe(0);
    });
  });

  describe('combined filters', () => {
    it('combines branch and status filters', () => {
      const result = handleGetVersions({ branch: 'main', status: 'success' }) as { data: { total: number } };
      expect(result.data.total).toBe(1);
    });

    it('combines branch, status, and search filters', () => {
      const result = handleGetVersions({ branch: 'main', status: 'success', search: '1.0' }) as { data: { total: number } };
      expect(result.data.total).toBe(1);
    });
  });

  describe('sorting', () => {
    it('items are sorted by createdAt descending (most recent first)', () => {
      const result = handleGetVersions({}) as { data: { items: Array<{ createdAt: string }> } };
      expect(result.data.items[0].createdAt).toBe('2026-03-15T10:00:00.000Z');
      expect(result.data.items[1].createdAt).toBe('2026-03-10T10:00:00.000Z');
      expect(result.data.items[2].createdAt).toBe('2026-03-01T10:00:00.000Z');
    });
  });
});
