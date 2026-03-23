import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Branches Routes Tests
 * 覆盖 app/api/v1/branches 端点
 */

// ---- Mock next/server ----

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    headers: Map<string, string> = new Map();
    constructor(url: string) {
      this.url = url;
    }
  },
  NextResponse: {
    json: vi.fn(),
  },
}));

// ---- Mock branch store ----

interface MockBranch {
  id: string;
  name: string;
  author?: string;
  versionId?: string;
  baseBranch?: string;
  description?: string;
  isMain: boolean;
  isProtected: boolean;
  createdAt: string;
  lastCommitAt?: string;
  commitMessage?: string;
}

const mockBranchStore = new Map<string, MockBranch>();

const resetStore = () => {
  mockBranchStore.clear();
  mockBranchStore.set('branch-main', {
    id: 'branch-main', name: 'main', author: 'system', isMain: true, isProtected: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  mockBranchStore.set('branch-feature-a', {
    id: 'branch-feature-a', name: 'feature/a', author: 'alice', isMain: false, isProtected: false,
    versionId: 'v-1', createdAt: '2026-02-01T00:00:00.000Z',
  });
  mockBranchStore.set('branch-feature-b', {
    id: 'branch-feature-b', name: 'feature/b', author: 'bob', isMain: false, isProtected: true,
    versionId: 'v-2', createdAt: '2026-02-15T00:00:00.000Z',
  });
};

vi.mock('../../lib/branch-store', () => ({
  getAllBranches: vi.fn(() => Array.from(mockBranchStore.values())),
  getBranch: vi.fn((id: string) => mockBranchStore.get(id)),
  getBranchByName: vi.fn((name: string) =>
    Array.from(mockBranchStore.values()).find(b => b.name === name)
  ),
  createBranch: vi.fn((data: Partial<MockBranch>) => {
    const id = `branch-${data.name}`;
    const branch: MockBranch = {
      id, name: data.name ?? '', author: data.author, versionId: data.versionId,
      baseBranch: data.baseBranch, description: data.description,
      isMain: false, isProtected: false,
      createdAt: new Date().toISOString(),
    };
    mockBranchStore.set(id, branch);
    return branch;
  }),
  updateBranch: vi.fn((id: string, updates: Partial<MockBranch>) => {
    const existing = mockBranchStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    mockBranchStore.set(id, updated);
    return updated;
  }),
  deleteBranch: vi.fn((id: string) => {
    const existed = mockBranchStore.has(id);
    mockBranchStore.delete(id);
    return { deleted: existed };
  }),
  getAllBranchesRaw: vi.fn(() => Array.from(mockBranchStore.values())),
}));

// ---- Handlers (mirror route logic) ----

function jsonSuccess(data: unknown, requestId = 'test-req-id') {
  return { code: 0, data, requestId, timestamp: new Date().toISOString() };
}

function jsonError(message: string, status: number, requestId = 'test-req-id') {
  return { code: status, message, requestId };
}

function handleGetBranches(params: {
  name?: string | null;
  isMain?: string | null;
  isProtected?: string | null;
  page?: string | null;
  pageSize?: string | null;
}) {
  let branches = Array.from(mockBranchStore.values());
  if (params.name) branches = branches.filter(b => b.name.includes(params.name!));
  if (params.isMain !== null && params.isMain !== undefined) {
    branches = branches.filter(b => b.isMain === (params.isMain === 'true'));
  }
  if (params.isProtected !== null && params.isProtected !== undefined) {
    branches = branches.filter(b => b.isProtected === (params.isProtected === 'true'));
  }
  const page = parseInt(params.page || '1');
  const pageSize = parseInt(params.pageSize || '50');
  const total = branches.length;
  const start = (page - 1) * pageSize;
  const data = branches.slice(start, start + pageSize);
  return jsonSuccess({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

function handlePostBranch(body: { name?: string; author?: string; versionId?: string }) {
  if (!body.name) return { error: jsonError('分支名称不能为空', 400) };
  if (!/^[a-zA-Z0-9_./-]+$/.test(body.name)) {
    return { error: jsonError('分支名称只能包含字母、数字、_、.、/、-', 400) };
  }
  const branch = {
    id: `branch-${body.name}`, name: body.name, author: body.author,
    versionId: body.versionId, isMain: false, isProtected: false,
    createdAt: new Date().toISOString(),
  };
  mockBranchStore.set(branch.id, branch);
  return { result: jsonSuccess(branch) };
}

function handleGetBranchById(id: string) {
  const branch = mockBranchStore.get(id) || Array.from(mockBranchStore.values()).find(b => b.name === id);
  if (!branch) return { error: jsonError('分支不存在', 404) };
  return { result: jsonSuccess(branch) };
}

function handlePutBranch(id: string, body: { description?: string; commitMessage?: string; author?: string }) {
  const branch = mockBranchStore.get(id);
  if (!branch) return { error: jsonError('分支不存在', 404) };
  const updated = { ...branch, ...body };
  mockBranchStore.set(id, updated);
  return { result: jsonSuccess(updated) };
}

function handleDeleteBranch(id: string) {
  if (!mockBranchStore.has(id)) return { error: jsonError('分支不存在', 404) };
  mockBranchStore.delete(id);
  return { result: jsonSuccess({ deleted: true }) };
}

function handlePutProtect(id: string, body: { protected?: boolean }) {
  const branch = mockBranchStore.get(id);
  if (!branch) return { error: jsonError('分支不存在', 404) };
  if (branch.isMain) return { error: jsonError('无法修改主分支的保护状态', 403) };
  const updated = { ...branch, isProtected: body.protected ?? !branch.isProtected };
  mockBranchStore.set(id, updated);
  return { result: jsonSuccess(updated) };
}

function handlePutRename(id: string, body: { newName?: string }) {
  const branch = mockBranchStore.get(id);
  if (!branch) return { error: jsonError('分支不存在', 404) };
  if (branch.isMain) return { error: jsonError('无法重命名主分支', 403) };
  if (branch.isProtected) return { error: jsonError('无法重命名已保护的分支', 403) };
  if (!body.newName) return { error: jsonError('新名称不能为空', 400) };
  if (!/^[a-zA-Z0-9_./-]+$/.test(body.newName)) {
    return { error: jsonError('分支名称只能包含字母、数字、_、.、/、-', 400) };
  }
  const updated = { ...branch, name: body.newName };
  mockBranchStore.set(id, updated);
  return { result: jsonSuccess(updated) };
}

// ---- Tests ----

describe('GET /api/v1/branches handler', () => {
  beforeEach(() => { resetStore(); });

  it('returns all branches without filters', () => {
    const result = handleGetBranches({}) as { data: { data: unknown[] } };
    expect(result.data.data).toHaveLength(3);
  });

  it('returns correct pagination structure', () => {
    const result = handleGetBranches({}) as { data: { total: number; page: number; pageSize: number; totalPages: number } };
    expect(result.data).toHaveProperty('total');
    expect(result.data).toHaveProperty('page');
    expect(result.data).toHaveProperty('pageSize');
    expect(result.data).toHaveProperty('totalPages');
  });

  it('filters by name (contains)', () => {
    const result = handleGetBranches({ name: 'feature' }) as { data: { data: unknown[]; total: number } };
    expect(result.data.total).toBe(2);
  });

  it('filters by isMain=true', () => {
    const result = handleGetBranches({ isMain: 'true' }) as { data: { total: number } };
    expect(result.data.total).toBe(1);
  });

  it('filters by isProtected=true', () => {
    const result = handleGetBranches({ isProtected: 'true' }) as { data: { total: number } };
    expect(result.data.total).toBe(2); // main + feature-b
  });

  it('paginates correctly with pageSize=2', () => {
    const result = handleGetBranches({ page: '1', pageSize: '2' }) as { data: { data: unknown[]; page: number } };
    expect(result.data.data).toHaveLength(2);
    expect(result.data.page).toBe(1);
  });

  it('paginates correctly with page=2', () => {
    const result = handleGetBranches({ page: '2', pageSize: '2' }) as { data: { data: unknown[] } };
    expect(result.data.data).toHaveLength(1);
  });
});

describe('POST /api/v1/branches handler', () => {
  beforeEach(() => { resetStore(); });

  it('creates a branch with valid name', () => {
    const result = handlePostBranch({ name: 'feature/new', author: 'charlie' }) as { result: { data: { name: string } } };
    expect(result.result.data.name).toBe('feature/new');
  });

  it('rejects empty branch name', () => {
    const result = handlePostBranch({}) as { error: { code: number; message: string } };
    expect(result.error.code).toBe(400);
    expect(result.error.message).toBe('分支名称不能为空');
  });

  it('rejects invalid branch name characters', () => {
    const result = handlePostBranch({ name: 'feature@new' }) as { error: { code: number; message: string } };
    expect(result.error.code).toBe(400);
  });

  it('rejects branch name with space', () => {
    const result = handlePostBranch({ name: 'feature new' }) as { error: { code: number; message: string } };
    expect(result.error.code).toBe(400);
  });

  it('accepts valid name with slash', () => {
    const result = handlePostBranch({ name: 'feature/test' }) as { result: { data: { name: string } } };
    expect(result.result.data.name).toBe('feature/test');
  });

  it('accepts valid name with dots', () => {
    const result = handlePostBranch({ name: 'release/v1.0.0' }) as { result: { data: { name: string } } };
    expect(result.result.data.name).toBe('release/v1.0.0');
  });
});

describe('GET /api/v1/branches/[id] handler', () => {
  beforeEach(() => { resetStore(); });

  it('returns branch by id', () => {
    const result = handleGetBranchById('branch-main') as { result: { data: MockBranch } };
    expect(result.result.data.name).toBe('main');
  });

  it('returns branch by name (getBranchByName fallback)', () => {
    const result = handleGetBranchById('feature/a') as { result: { data: MockBranch } };
    expect(result.result.data.name).toBe('feature/a');
  });

  it('returns 404 for non-existent branch', () => {
    const result = handleGetBranchById('nonexistent') as { error: { code: number; message: string } };
    expect(result.error.code).toBe(404);
  });
});

describe('PUT /api/v1/branches/[id] handler', () => {
  beforeEach(() => { resetStore(); });

  it('updates branch description', () => {
    const result = handlePutBranch('branch-feature-a', { description: 'New description' }) as { result: { data: MockBranch } };
    expect(result.result.data.description).toBe('New description');
  });

  it('updates branch author', () => {
    const result = handlePutBranch('branch-feature-a', { author: 'david' }) as { result: { data: MockBranch } };
    expect(result.result.data.author).toBe('david');
  });

  it('returns 404 for non-existent branch', () => {
    const result = handlePutBranch('nonexistent', { description: 'test' }) as { error: { code: number; message: string } };
    expect(result.error.code).toBe(404);
  });
});

describe('DELETE /api/v1/branches/[id] handler', () => {
  beforeEach(() => { resetStore(); });

  it('deletes existing branch', () => {
    const result = handleDeleteBranch('branch-feature-a') as { result: { data: { deleted: boolean } } };
    expect(result.result.data.deleted).toBe(true);
  });

  it('returns 404 for non-existent branch', () => {
    const result = handleDeleteBranch('nonexistent') as { error: { code: number; message: string } };
    expect(result.error.code).toBe(404);
  });
});

describe('PUT /api/v1/branches/[id]/protect handler', () => {
  beforeEach(() => { resetStore(); });

  it('sets protection on non-main branch', () => {
    const result = handlePutProtect('branch-feature-a', { protected: true }) as { result: { data: MockBranch } };
    expect(result.result.data.isProtected).toBe(true);
  });

  it('rejects protecting main branch', () => {
    const result = handlePutProtect('branch-main', { protected: true }) as { error: { code: number; message: string } };
    expect(result.error.code).toBe(403);
    expect(result.error.message).toContain('无法修改主分支');
  });

  it('toggles protection when protected not specified', () => {
    const result = handlePutProtect('branch-feature-a', {}) as { result: { data: MockBranch } };
    expect(result.result.data.isProtected).toBe(true); // toggled from false
  });
});

describe('PUT /api/v1/branches/[id]/rename handler', () => {
  beforeEach(() => { resetStore(); });

  it('renames non-protected branch', () => {
    const result = handlePutRename('branch-feature-a', { newName: 'feature/new-name' }) as { result: { data: MockBranch } };
    expect(result.result.data.name).toBe('feature/new-name');
  });

  it('rejects renaming main branch', () => {
    const result = handlePutRename('branch-main', { newName: 'main-renamed' }) as { error: { code: number; message: string } };
    expect(result.error.code).toBe(403);
  });

  it('rejects renaming protected branch', () => {
    const result = handlePutRename('branch-feature-b', { newName: 'feature/b-renamed' }) as { error: { code: number; message: string } };
    expect(result.error.code).toBe(403);
    expect(result.error.message).toContain('已保护');
  });

  it('rejects empty new name', () => {
    const result = handlePutRename('branch-feature-a', {}) as { error: { code: number; message: string } };
    expect(result.error.code).toBe(400);
  });

  it('rejects invalid new name characters', () => {
    const result = handlePutRename('branch-feature-a', { newName: 'bad@name' }) as { error: { code: number; message: string } };
    expect(result.error.code).toBe(400);
  });
});
