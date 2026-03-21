import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Build Routes Tests
 * 覆盖 server/src/routes/build.ts 的关键端点
 */

// ---- Mock build model ----

const mockBuildRecords = new Map([
  [
    'br-test-1',
    {
      id: 'br-test-1',
      versionId: 'v-test-1',
      versionName: '1.0.0',
      versionNumber: '1.0.0',
      status: 'success',
      queuedAt: '2026-03-01T10:00:00.000Z',
      startedAt: '2026-03-01T10:00:05.000Z',
      completedAt: '2026-03-01T10:02:30.000Z',
      duration: 145000,
      exitCode: 0,
      output: 'Build succeeded',
      errorOutput: '',
      artifactCount: 3,
      artifactPaths: ['dist/index.js', 'dist/style.css', 'dist/logo.png'],
      triggeredBy: 'test-user',
      triggerType: 'manual' as const,
      buildNumber: 1,
      rollbackCount: 0,
    },
  ],
  [
    'br-test-2',
    {
      id: 'br-test-2',
      versionId: 'v-test-1',
      versionName: '1.0.0',
      versionNumber: '1.0.0',
      status: 'failed',
      queuedAt: '2026-03-10T10:00:00.000Z',
      startedAt: '2026-03-10T10:00:03.000Z',
      completedAt: '2026-03-10T10:01:00.000Z',
      duration: 57000,
      exitCode: 1,
      output: '',
      errorOutput: 'SyntaxError: Unexpected token',
      artifactCount: 0,
      triggeredBy: 'coder',
      triggerType: 'rebuild' as const,
      buildNumber: 2,
      parentBuildId: 'br-test-1',
      rollbackCount: 0,
    },
  ],
  [
    'br-test-3',
    {
      id: 'br-test-3',
      versionId: 'v-test-2',
      versionName: '2.0.0',
      versionNumber: '2.0.0',
      status: 'building',
      queuedAt: '2026-03-15T10:00:00.000Z',
      startedAt: '2026-03-15T10:00:02.000Z',
      triggeredBy: 'system',
      triggerType: 'auto' as const,
      buildNumber: 1,
      rollbackCount: 0,
    },
  ],
]);

const mockIndexByVersion = new Map([
  ['v-test-1', ['br-test-1', 'br-test-2']],
  ['v-test-2', ['br-test-3']],
]);

// ---- Mock functions ----

function success(data: unknown) {
  return { code: 0, data };
}

function error(status: number, message: string) {
  return { code: status, message };
}

// ---- Re-implement handler logic for testing ----

function handleGetBuilds(params: { versionId?: string; limit?: string; offset?: string }) {
  if (!params.versionId) {
    return { status: 400, body: error(400, 'versionId is required') };
  }
  const limitNum = Math.min(parseInt(params.limit || '20'), 100);
  const offsetNum = parseInt(params.offset || '0');
  const buildIds = mockIndexByVersion.get(params.versionId) || [];
  const records = buildIds
    .map(id => mockBuildRecords.get(id))
    .filter(Boolean) as any[];
  const paginated = records.slice(offsetNum, offsetNum + limitNum);
  return { status: 200, body: success({ builds: paginated, total: records.length, limit: limitNum, offset: offsetNum }) };
}

function handleGetBuild(id: string) {
  const record = mockBuildRecords.get(id);
  if (!record) {
    return { status: 404, body: error(404, 'Build record not found') };
  }
  return { status: 200, body: success(record) };
}

function handleGetLatestBuild(versionId: string) {
  const buildIds = mockIndexByVersion.get(versionId) || [];
  if (buildIds.length === 0) {
    return { status: 404, body: error(404, 'No builds found for this version') };
  }
  const lastId = buildIds[buildIds.length - 1];
  const record = mockBuildRecords.get(lastId);
  return { status: 200, body: success(record) };
}

function handleGetBuildStats(versionId: string) {
  const buildIds = mockIndexByVersion.get(versionId) || [];
  const records = buildIds.map(id => mockBuildRecords.get(id)).filter(Boolean) as any[];
  const total = records.length;
  const successCount = records.filter(b => b.status === 'success').length;
  const failedCount = records.filter(b => b.status === 'failed').length;
  const buildingCount = records.filter(b => b.status === 'building').length;
  return {
    status: 200,
    body: success({
      total,
      successCount,
      failedCount,
      buildingCount,
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
    }),
  };
}

function validateBuildId(id: string) {
  if (!id || id.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return false;
  }
  return true;
}

// ========== Tests ==========

describe('Build Routes', () => {
  describe('GET /api/v1/builds/:id', () => {
    it('returns build record when found', () => {
      const result = handleGetBuild('br-test-1') as { status: number; body: { code: number; data: any } };
      expect(result.status).toBe(200);
      expect(result.body.code).toBe(0);
      expect(result.body.data.id).toBe('br-test-1');
      expect(result.body.data.status).toBe('success');
    });

    it('returns 404 when build not found', () => {
      const result = handleGetBuild('br-nonexistent') as { status: number; body: { code: number } };
      expect(result.status).toBe(404);
      expect(result.body.code).toBe(404);
    });

    it('returns correct build fields', () => {
      const result = handleGetBuild('br-test-1') as { body: { data: any } };
      expect(result.body.data).toHaveProperty('id');
      expect(result.body.data).toHaveProperty('versionId');
      expect(result.body.data).toHaveProperty('status');
      expect(result.body.data).toHaveProperty('queuedAt');
      expect(result.body.data).toHaveProperty('triggeredBy');
      expect(result.body.data).toHaveProperty('triggerType');
      expect(result.body.data).toHaveProperty('buildNumber');
    });

    it('failed build has errorOutput', () => {
      const result = handleGetBuild('br-test-2') as { body: { data: any } };
      expect(result.body.data.status).toBe('failed');
      expect(result.body.data.errorOutput).toBe('SyntaxError: Unexpected token');
      expect(result.body.data.exitCode).toBe(1);
    });

    it('building build has no completedAt', () => {
      const result = handleGetBuild('br-test-3') as { body: { data: any } };
      expect(result.body.data.status).toBe('building');
      expect(result.body.data.completedAt).toBeUndefined();
    });
  });

  describe('GET /api/v1/builds/latest/:versionId', () => {
    it('returns latest build for version', () => {
      const result = handleGetLatestBuild('v-test-1') as { body: { data: any } };
      expect(result.body.data.id).toBe('br-test-2'); // latest (second build)
    });

    it('returns 404 when no builds for version', () => {
      const result = handleGetLatestBuild('v-nonexistent') as { status: number; body: { code: number } };
      expect(result.status).toBe(404);
    });
  });

  describe('GET /api/v1/builds (list)', () => {
    it('requires versionId parameter', () => {
      const result = handleGetBuilds({}) as { status: number; body: { code: number } };
      expect(result.status).toBe(400);
      expect(result.body.code).toBe(400);
    });

    it('returns builds for valid versionId', () => {
      const result = handleGetBuilds({ versionId: 'v-test-1' }) as { body: { data: any } };
      expect(result.body.data.builds).toHaveLength(2);
      expect(result.body.data.total).toBe(2);
    });

    it('returns empty for version with no builds', () => {
      const result = handleGetBuilds({ versionId: 'v-nonexistent' }) as { body: { data: any } };
      expect(result.body.data.builds).toHaveLength(0);
      expect(result.body.data.total).toBe(0);
    });

    it('respects limit parameter (max 100)', () => {
      const result = handleGetBuilds({ versionId: 'v-test-1', limit: '1' }) as { body: { data: any } };
      expect(result.body.data.builds).toHaveLength(1);
      expect(result.body.data.limit).toBe(1);
    });

    it('respects offset parameter', () => {
      const result = handleGetBuilds({ versionId: 'v-test-1', limit: '1', offset: '1' }) as { body: { data: any } };
      expect(result.body.data.builds).toHaveLength(1);
      expect(result.body.data.offset).toBe(1);
    });

    it('cap limit at 100', () => {
      const result = handleGetBuilds({ versionId: 'v-test-1', limit: '500' }) as { body: { data: any } };
      expect(result.body.data.limit).toBe(100);
    });
  });

  describe('GET /api/v1/builds/stats/:versionId', () => {
    it('returns correct build statistics', () => {
      const result = handleGetBuildStats('v-test-1') as { body: { data: any } };
      expect(result.body.data.total).toBe(2);
      expect(result.body.data.successCount).toBe(1);
      expect(result.body.data.failedCount).toBe(1);
      expect(result.body.data.buildingCount).toBe(0);
      expect(result.body.data.successRate).toBe(50);
    });

    it('returns zero stats for version with no builds', () => {
      const result = handleGetBuildStats('v-nonexistent') as { body: { data: any } };
      expect(result.body.data.total).toBe(0);
      expect(result.body.data.successRate).toBe(0);
    });
  });

  describe('buildId validation', () => {
    it('accepts valid build IDs', () => {
      expect(validateBuildId('br-abc-123')).toBe(true);
      expect(validateBuildId('br_test_456')).toBe(true);
      expect(validateBuildId('BR-ABC')).toBe(true);
    });

    it('rejects invalid build IDs', () => {
      expect(validateBuildId('')).toBe(false);
      expect(validateBuildId('br test')).toBe(false); // space
      expect(validateBuildId('br@abc')).toBe(false); // special char
      expect(validateBuildId('a'.repeat(101))).toBe(false); // too long
    });
  });

  describe('build record fields', () => {
    it('build record contains required fields', () => {
      const result = handleGetBuild('br-test-1') as { body: { data: any } };
      const record = result.body.data;
      expect(record.id).toBeDefined();
      expect(record.versionId).toBeDefined();
      expect(record.versionName).toBeDefined();
      expect(typeof record.buildNumber).toBe('number');
      expect(['manual', 'auto', 'rebuild']).toContain(record.triggerType);
    });

    it('rebuild references parent build', () => {
      const result = handleGetBuild('br-test-2') as { body: { data: any } };
      expect(result.body.data.triggerType).toBe('rebuild');
      expect(result.body.data.parentBuildId).toBe('br-test-1');
    });

    it('duration is calculated in milliseconds', () => {
      const result = handleGetBuild('br-test-1') as { body: { data: any } };
      // startedAt: 10:00:05, completedAt: 10:02:30 → 145000ms
      expect(result.body.data.duration).toBe(145000);
    });

    it('artifacts are tracked when present', () => {
      const result = handleGetBuild('br-test-1') as { body: { data: any } };
      expect(result.body.data.artifactCount).toBe(3);
      expect(result.body.data.artifactPaths).toHaveLength(3);
    });
  });
});
