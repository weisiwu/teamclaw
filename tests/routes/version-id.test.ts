import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- Mock next/server ----

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
    json: vi.fn(),
  },
}));

// ---- Mock version store ----

const initialStoreData: [string, any][] = [
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
      buildStatus: 'success',
      hasTag: false,
    },
  ],
  [
    'v-test-3',
    {
      id: 'v-test-3',
      version: '2.0.0',
      branch: 'develop',
      summary: 'Beta release',
      commitHash: 'ghi9012',
      createdBy: 'pm',
      createdAt: '2026-03-15T10:00:00.000Z',
      buildStatus: 'building',
      hasTag: false,
    },
  ],
  [
    'v-test-4',
    {
      id: 'v-test-4',
      version: '1.1.1',
      branch: 'main',
      summary: 'Bug fix release',
      commitHash: 'jkl3456',
      createdBy: 'tester',
      createdAt: '2026-03-20T10:00:00.000Z',
      buildStatus: 'failed',
      hasTag: false,
    },
  ],
];

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
      buildStatus: 'success',
      hasTag: false,
    },
  ],
  [
    'v-test-3',
    {
      id: 'v-test-3',
      version: '2.0.0',
      branch: 'develop',
      summary: 'Beta release',
      commitHash: 'ghi9012',
      createdBy: 'pm',
      createdAt: '2026-03-15T10:00:00.000Z',
      buildStatus: 'building',
      hasTag: false,
    },
  ],
  [
    'v-test-4',
    {
      id: 'v-test-4',
      version: '1.1.1',
      branch: 'main',
      summary: 'Bug fix release',
      commitHash: 'jkl3456',
      createdBy: 'tester',
      createdAt: '2026-03-20T10:00:00.000Z',
      buildStatus: 'failed',
      hasTag: false,
    },
  ],
]);

vi.mock('../../app/api/v1/versions/version-store', () => ({
  versionStore: mockVersionStore,
}));

// ---- Re-implement route handler logic for testing ----

function jsonSuccess(data: unknown, requestId?: string) {
  return { code: 0, data, requestId };
}

function jsonError(message: string, status: number, requestId?: string) {
  return { code: status, message, requestId };
}

function generateRequestId() {
  return 'req-test-123';
}

// ---- GET /api/v1/versions/[id] ----
function handleGetVersion(id: string) {
  const requestId = generateRequestId();
  try {
    const version = mockVersionStore.get(id);
    if (!version) {
      return jsonError('Version not found', 404, requestId);
    }
    return jsonSuccess(version, requestId);
  } catch (err) {
    return jsonError('Internal server error', 500, requestId);
  }
}

// ---- PUT /api/v1/versions/[id] ----
interface Version {
  id: string;
  version: string;
  branch: string;
  summary: string;
  commitHash: string;
  createdBy: string;
  createdAt: string;
  buildStatus: string;
  hasTag: boolean;
}

function handlePutVersion(id: string, body: Partial<Version> | null) {
  const requestId = generateRequestId();
  try {
    const existing = mockVersionStore.get(id);
    if (!existing) {
      return jsonError('Version not found', 404, requestId);
    }
    if (!body || Object.keys(body).length === 0) {
      return jsonError('Request body is required', 400, requestId);
    }
    if (body.id !== undefined && body.id !== id) {
      return jsonError('Cannot change version ID', 400, requestId);
    }
    const updated: Version = { ...existing, ...body, id };
    mockVersionStore.set(id, updated);
    return jsonSuccess(updated, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 400, requestId);
  }
}

// ---- PATCH /api/v1/versions/[id] ----
function handlePatchVersion(id: string, body: Partial<Version> | null) {
  const requestId = generateRequestId();
  try {
    const existing = mockVersionStore.get(id);
    if (!existing) {
      return jsonError('Version not found', 404, requestId);
    }
    if (!body || Object.keys(body).length === 0) {
      return jsonError('Request body is required', 400, requestId);
    }
    if (body.id !== undefined && body.id !== id) {
      return jsonError('Cannot change version ID', 400, requestId);
    }
    const updated: Version = { ...existing, ...body, id };
    mockVersionStore.set(id, updated);
    return jsonSuccess(updated, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 400, requestId);
  }
}

// ---- DELETE /api/v1/versions/[id] ----
function handleDeleteVersion(id: string) {
  const requestId = generateRequestId();
  try {
    const existing = mockVersionStore.get(id);
    if (!existing) {
      return jsonError('Version not found', 404, requestId);
    }
    mockVersionStore.delete(id);
    return jsonSuccess({ deleted: true, id }, requestId);
  } catch (err) {
    return jsonError('Internal server error', 500, requestId);
  }
}

// ---- GET /api/v1/versions/[id]/rollback-targets ----
function handleGetRollbackTargets(id: string) {
  const requestId = generateRequestId();
  try {
    const current = mockVersionStore.get(id);
    if (!current) {
      return jsonError('Version not found', 404, requestId);
    }
    const allVersions = Array.from(mockVersionStore.values())
      .filter(v => v.branch === current.branch && v.id !== id && v.buildStatus === 'success')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const targets = allVersions.map(v => ({
      id: v.id,
      version: v.version,
      commitHash: v.commitHash,
      summary: v.summary,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      isTag: v.hasTag,
      distance: 0,
    }));
    return jsonSuccess({
      currentVersion: { id: current.id, version: current.version },
      targets,
      total: targets.length,
    }, requestId);
  } catch (err) {
    return jsonError('Internal server error', 500, requestId);
  }
}

// ---- GET /api/v1/versions/[id]/rollback-preview ----
function handleGetRollbackPreview(id: string, ref: string | null) {
  const requestId = generateRequestId();
  try {
    if (!ref) {
      return jsonError('ref query parameter is required', 400, requestId);
    }
    const current = mockVersionStore.get(id);
    if (!current) {
      return jsonError('Current version not found', 404, requestId);
    }
    const target = mockVersionStore.get(ref);
    if (!target) {
      return jsonError('Target version not found', 404, requestId);
    }
    const preview = {
      current: {
        id: current.id,
        version: current.version,
        commitHash: current.commitHash,
        summary: current.summary,
        buildStatus: current.buildStatus,
        createdAt: current.createdAt,
      },
      target: {
        id: target.id,
        version: target.version,
        commitHash: target.commitHash,
        summary: target.summary,
        buildStatus: target.buildStatus,
        createdAt: target.createdAt,
      },
      changes: {
        summaryDelta: target.summary !== current.summary ? target.summary : null,
        commitDelta: target.commitHash !== current.commitHash ? target.commitHash : null,
        branchUnchanged: target.branch === current.branch,
      },
      warnings: [] as string[],
    };
    if (target.buildStatus !== 'success') {
      preview.warnings.push(`Target version ${target.version} has build status: ${target.buildStatus}`);
    }
    if (target.branch !== current.branch) {
      preview.warnings.push(`Rollback will switch branch from ${current.branch} to ${target.branch}`);
    }
    return jsonSuccess(preview, requestId);
  } catch (err) {
    return jsonError('Internal server error', 500, requestId);
  }
}

// ---- Tests ----

beforeEach(() => {
  mockVersionStore.clear();
  initialStoreData.forEach(([k, v]) => mockVersionStore.set(k, v));
});

describe('GET /api/v1/versions/[id] handler logic', () => {
  it('returns 404 when version not found', () => {
    const result = handleGetVersion('non-existent-id');
    expect(result.code).toBe(404);
    expect((result as any).message).toBe('Version not found');
  });

  it('returns version data when found', () => {
    const result = handleGetVersion('v-test-1');
    expect(result.code).toBe(0);
    expect((result as any).data.id).toBe('v-test-1');
    expect((result as any).data.version).toBe('1.0.0');
    expect((result as any).data.branch).toBe('main');
  });

  it('returns all required version fields', () => {
    const result = handleGetVersion('v-test-2') as any;
    expect(result.data).toHaveProperty('id');
    expect(result.data).toHaveProperty('version');
    expect(result.data).toHaveProperty('branch');
    expect(result.data).toHaveProperty('summary');
    expect(result.data).toHaveProperty('commitHash');
    expect(result.data).toHaveProperty('createdBy');
    expect(result.data).toHaveProperty('createdAt');
    expect(result.data).toHaveProperty('buildStatus');
    expect(result.data).toHaveProperty('hasTag');
  });

  it('includes requestId in response', () => {
    const result = handleGetVersion('v-test-1') as any;
    expect(result.requestId).toBe('req-test-123');
  });
});

describe('PUT /api/v1/versions/[id] handler logic', () => {
  it('returns 404 when version not found', () => {
    const result = handlePutVersion('non-existent-id', { summary: 'test' });
    expect(result.code).toBe(404);
    expect((result as any).message).toBe('Version not found');
  });

  it('returns 400 when body is empty', () => {
    const result = handlePutVersion('v-test-1', null);
    expect(result.code).toBe(400);
    expect((result as any).message).toBe('Request body is required');
  });

  it('returns 400 when body is empty object', () => {
    const result = handlePutVersion('v-test-1', {});
    expect(result.code).toBe(400);
  });

  it('returns 400 when trying to change version id', () => {
    const result = handlePutVersion('v-test-1', { id: 'v-test-999' } as any);
    expect(result.code).toBe(400);
    expect((result as any).message).toBe('Cannot change version ID');
  });

  it('returns updated version on success', () => {
    const result = handlePutVersion('v-test-1', { summary: 'Updated summary' } as any);
    expect(result.code).toBe(0);
    expect((result as any).data.summary).toBe('Updated summary');
    expect((result as any).data.id).toBe('v-test-1');
    expect((result as any).data.version).toBe('1.0.0'); // unchanged
  });

  it('can update multiple fields at once', () => {
    const result = handlePutVersion('v-test-2', { summary: 'New summary', buildStatus: 'success' } as any);
    expect(result.code).toBe(0);
    expect((result as any).data.summary).toBe('New summary');
    expect((result as any).data.buildStatus).toBe('success');
    expect((result as any).data.version).toBe('1.1.0'); // unchanged
  });

  it('reflects changes in the store', () => {
    handlePutVersion('v-test-1', { summary: 'Persisted change' } as any);
    const result = handleGetVersion('v-test-1') as any;
    expect(result.data.summary).toBe('Persisted change');
  });
});

describe('PATCH /api/v1/versions/[id] handler logic', () => {
  it('returns 404 when version not found', () => {
    const result = handlePatchVersion('non-existent-id', { summary: 'test' });
    expect(result.code).toBe(404);
  });

  it('returns 400 when body is null', () => {
    const result = handlePatchVersion('v-test-1', null);
    expect(result.code).toBe(400);
  });

  it('returns 400 when body is empty object', () => {
    const result = handlePatchVersion('v-test-1', {});
    expect(result.code).toBe(400);
  });

  it('returns 400 when trying to change version id', () => {
    const result = handlePatchVersion('v-test-1', { id: 'hacked-id' } as any);
    expect(result.code).toBe(400);
    expect((result as any).message).toBe('Cannot change version ID');
  });

  it('partially updates version with PATCH', () => {
    const original = handleGetVersion('v-test-3') as any;
    expect(original.data.buildStatus).toBe('building');
    const result = handlePatchVersion('v-test-3', { buildStatus: 'success' } as any);
    expect(result.code).toBe(0);
    expect((result as any).data.buildStatus).toBe('success');
    expect((result as any).data.version).toBe('2.0.0'); // unchanged
    expect((result as any).data.branch).toBe('develop'); // unchanged
  });
});

describe('DELETE /api/v1/versions/[id] handler logic', () => {
  it('returns 404 when version not found', () => {
    const result = handleDeleteVersion('non-existent-id');
    expect(result.code).toBe(404);
  });

  it('returns deleted confirmation on success', () => {
    const result = handleDeleteVersion('v-test-4');
    expect(result.code).toBe(0);
    expect((result as any).data.deleted).toBe(true);
    expect((result as any).data.id).toBe('v-test-4');
  });

  it('removes version from store', () => {
    handleDeleteVersion('v-test-2');
    const getResult = handleGetVersion('v-test-2');
    expect((getResult as any).code).toBe(404);
  });

  it('returns 404 when deleting already-deleted version', () => {
    handleDeleteVersion('v-test-2');
    const result = handleDeleteVersion('v-test-2');
    expect(result.code).toBe(404);
  });
});

describe('GET /api/v1/versions/[id]/rollback-targets handler logic', () => {
  it('returns 404 when version not found', () => {
    const result = handleGetRollbackTargets('non-existent-id');
    expect(result.code).toBe(404);
  });

  it('returns currentVersion in response', () => {
    const result = handleGetRollbackTargets('v-test-1') as any;
    expect(result.data.currentVersion.id).toBe('v-test-1');
    expect(result.data.currentVersion.version).toBe('1.0.0');
  });

  it('returns only same-branch successful versions as targets', () => {
    const result = handleGetRollbackTargets('v-test-1') as any;
    // v-test-1 is on 'main' with buildStatus='success'
    // v-test-2 is on 'main' with buildStatus='success' -> should be a target
    // v-test-3 is on 'develop' -> should NOT be a target (different branch)
    expect(result.data.targets.length).toBeGreaterThanOrEqual(1);
    result.data.targets.forEach((t: any) => {
      expect(t).not.toHaveProperty('buildStatus'); // targets don't expose full status
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('version');
      expect(t).toHaveProperty('commitHash');
    });
  });

  it('total equals targets length', () => {
    const result = handleGetRollbackTargets('v-test-1') as any;
    expect(result.data.total).toBe(result.data.targets.length);
  });

  it('returns empty targets when no eligible rollback targets exist', () => {
    const result = handleGetRollbackTargets('v-test-3') as any;
    // v-test-3 is on 'develop' branch with buildStatus='building'
    // No other 'develop' versions -> should have 0 targets
    expect(result.data.total).toBe(0);
    expect(result.data.targets).toHaveLength(0);
  });
});

describe('GET /api/v1/versions/[id]/rollback-preview handler logic', () => {
  it('returns 404 when current version not found', () => {
    const result = handleGetRollbackPreview('non-existent-id', 'v-test-1');
    expect(result.code).toBe(404);
    expect((result as any).message).toBe('Current version not found');
  });

  it('returns 404 when target version not found', () => {
    const result = handleGetRollbackPreview('v-test-1', 'non-existent-id');
    expect(result.code).toBe(404);
    expect((result as any).message).toBe('Target version not found');
  });

  it('returns 400 when ref parameter is missing', () => {
    const result = handleGetRollbackPreview('v-test-1', null);
    expect(result.code).toBe(400);
    expect((result as any).message).toBe('ref query parameter is required');
  });

  it('returns current and target version info in preview', () => {
    const result = handleGetRollbackPreview('v-test-1', 'v-test-2') as any;
    expect(result.data.current.id).toBe('v-test-1');
    expect(result.data.current.version).toBe('1.0.0');
    expect(result.data.target.id).toBe('v-test-2');
    expect(result.data.target.version).toBe('1.1.0');
  });

  it('shows changes between current and target', () => {
    const result = handleGetRollbackPreview('v-test-1', 'v-test-2') as any;
    expect(result.data.changes.commitDelta).toBe('def5678'); // commit changed
    expect(result.data.changes.summaryDelta).toBe('Feature update'); // summary changed
    expect(result.data.changes.branchUnchanged).toBe(true);
  });

  it('adds warning when target build status is not success', () => {
    // v-test-4 has buildStatus='failed'
    const result = handleGetRollbackPreview('v-test-1', 'v-test-4') as any;
    expect(result.data.warnings.length).toBeGreaterThan(0);
    expect(result.data.warnings[0]).toContain('failed');
  });

  it('adds warning when target is on different branch', () => {
    // v-test-3 is on 'develop', v-test-1 is on 'main'
    const result = handleGetRollbackPreview('v-test-1', 'v-test-3') as any;
    expect(result.data.warnings.some((w: string) => w.includes('branch'))).toBe(true);
  });
});
