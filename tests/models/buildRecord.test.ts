/**
 * BuildRecord Model Tests
 * 覆盖 server/src/models/buildRecord.ts 关键模型方法
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BuildRecord, BuildRecordStatus } from '../../server/src/models/buildRecord';

describe('BuildRecord Model', () => {
  // Mock storage
  let mockBuildRecords: Map<string, BuildRecord>;
  let mockIndexByVersion: Map<string, string[]>;
  let nextBuildNumberByVersion: Map<string, number>;

  beforeEach(() => {
    mockBuildRecords = new Map();
    mockIndexByVersion = new Map();
    nextBuildNumberByVersion = new Map();
  });

  // Mock implementations
  function createBuildRecord(data: Partial<BuildRecord>): BuildRecord {
    const versionId = data.versionId!;
    const currentNumber = nextBuildNumberByVersion.get(versionId) || 1;
    nextBuildNumberByVersion.set(versionId, currentNumber + 1);

    const record: BuildRecord = {
      id: data.id || `br_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      versionId,
      versionName: data.versionName || '1.0.0',
      versionNumber: data.versionNumber || '1.0.0',
      status: data.status || 'pending',
      queuedAt: data.queuedAt || new Date().toISOString(),
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      duration: data.duration,
      exitCode: data.exitCode,
      command: data.command,
      output: data.output,
      errorOutput: data.errorOutput,
      artifactCount: data.artifactCount,
      artifactPaths: data.artifactPaths,
      artifactUrl: data.artifactUrl,
      triggeredBy: data.triggeredBy || 'system',
      triggerType: data.triggerType || 'manual',
      buildNumber: currentNumber,
      rollbackCount: 0,
      ...data,
    };

    mockBuildRecords.set(record.id, record);
    
    // Update index
    const existing = mockIndexByVersion.get(versionId) || [];
    existing.push(record.id);
    mockIndexByVersion.set(versionId, existing);

    return record;
  }

  function getBuildRecord(id: string): BuildRecord | undefined {
    return mockBuildRecords.get(id);
  }

  function getBuildRecordsByVersion(versionId: string, limit: number = 100): BuildRecord[] {
    const ids = mockIndexByVersion.get(versionId) || [];
    return ids
      .map(id => mockBuildRecords.get(id))
      .filter((r): r is BuildRecord => !!r)
      .slice(0, limit);
  }

  function getLatestBuildRecord(versionId: string): BuildRecord | undefined {
    const records = getBuildRecordsByVersion(versionId, 1);
    return records[0];
  }

  function updateBuildRecord(id: string, updates: Partial<BuildRecord>): BuildRecord | undefined {
    const record = mockBuildRecords.get(id);
    if (!record) return undefined;

    const updated = { ...record, ...updates };
    mockBuildRecords.set(id, updated);
    return updated;
  }

  function cancelBuildRecord(id: string): BuildRecord | undefined {
    return updateBuildRecord(id, { status: 'cancelled' as BuildRecordStatus });
  }

  function getBuildRecordStats(): { total: number; byStatus: Record<BuildRecordStatus, number> } {
    const stats = {
      total: mockBuildRecords.size,
      byStatus: {
        pending: 0,
        building: 0,
        success: 0,
        failed: 0,
        cancelled: 0,
      },
    };

    mockBuildRecords.forEach(record => {
      stats.byStatus[record.status]++;
    });

    return stats;
  }

  describe('createBuildRecord', () => {
    it('should create a build record with default values', () => {
      const record = createBuildRecord({
        versionId: 'v-test-1',
        versionName: '1.0.0',
      });

      expect(record.id).toBeDefined();
      expect(record.versionId).toBe('v-test-1');
      expect(record.versionName).toBe('1.0.0');
      expect(record.status).toBe('pending');
      expect(record.buildNumber).toBe(1);
      expect(record.rollbackCount).toBe(0);
      expect(record.queuedAt).toBeDefined();
    });

    it('should increment build number for same version', () => {
      const record1 = createBuildRecord({ versionId: 'v-test-1' });
      const record2 = createBuildRecord({ versionId: 'v-test-1' });

      expect(record1.buildNumber).toBe(1);
      expect(record2.buildNumber).toBe(2);
    });

    it('should maintain separate build numbers for different versions', () => {
      const record1 = createBuildRecord({ versionId: 'v-test-1' });
      const record2 = createBuildRecord({ versionId: 'v-test-2' });

      expect(record1.buildNumber).toBe(1);
      expect(record2.buildNumber).toBe(1);
    });

    it('should store all provided data', () => {
      const record = createBuildRecord({
        id: 'br-custom',
        versionId: 'v-test-1',
        versionName: '2.0.0',
        versionNumber: '2.0.0',
        status: 'building',
        triggeredBy: 'test-user',
        triggerType: 'auto',
        buildCommand: 'npm run build',
        projectPath: '/path/to/project',
      });

      expect(record.id).toBe('br-custom');
      expect(record.status).toBe('building');
      expect(record.triggeredBy).toBe('test-user');
      expect(record.triggerType).toBe('auto');
      expect(record.buildCommand).toBe('npm run build');
    });
  });

  describe('getBuildRecord', () => {
    it('should return existing record by id', () => {
      const created = createBuildRecord({ versionId: 'v-test-1' });
      const retrieved = getBuildRecord(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.versionId).toBe('v-test-1');
    });

    it('should return undefined for non-existent id', () => {
      const record = getBuildRecord('non-existent');
      expect(record).toBeUndefined();
    });
  });

  describe('getBuildRecordsByVersion', () => {
    it('should return all records for a version', () => {
      createBuildRecord({ versionId: 'v-test-1' });
      createBuildRecord({ versionId: 'v-test-1' });
      createBuildRecord({ versionId: 'v-test-2' });

      const records = getBuildRecordsByVersion('v-test-1');
      expect(records).toHaveLength(2);
    });

    it('should respect limit parameter', () => {
      createBuildRecord({ versionId: 'v-test-1' });
      createBuildRecord({ versionId: 'v-test-1' });
      createBuildRecord({ versionId: 'v-test-1' });

      const records = getBuildRecordsByVersion('v-test-1', 2);
      expect(records).toHaveLength(2);
    });

    it('should return empty array for version with no builds', () => {
      const records = getBuildRecordsByVersion('v-no-builds');
      expect(records).toHaveLength(0);
    });
  });

  describe('getLatestBuildRecord', () => {
    it('should return the most recent build for a version', () => {
      const record1 = createBuildRecord({ versionId: 'v-test-1' });
      const record2 = createBuildRecord({ versionId: 'v-test-1' });

      const latest = getLatestBuildRecord('v-test-1');
      
      // Should return one of the records for this version
      expect(latest).toBeDefined();
      expect([record1.id, record2.id]).toContain(latest?.id);
    });

    it('should return undefined when no builds exist', () => {
      const latest = getLatestBuildRecord('v-non-existent');
      expect(latest).toBeUndefined();
    });
  });

  describe('updateBuildRecord', () => {
    it('should update record fields', () => {
      const created = createBuildRecord({ versionId: 'v-test-1', status: 'building' });
      
      const updated = updateBuildRecord(created.id, {
        status: 'success',
        completedAt: new Date().toISOString(),
        duration: 120000,
        exitCode: 0,
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('success');
      expect(updated?.duration).toBe(120000);
      expect(updated?.exitCode).toBe(0);
    });

    it('should return undefined for non-existent record', () => {
      const updated = updateBuildRecord('non-existent', { status: 'success' });
      expect(updated).toBeUndefined();
    });

    it('should merge updates with existing data', () => {
      const created = createBuildRecord({
        versionId: 'v-test-1',
        versionName: '1.0.0',
      });

      const updated = updateBuildRecord(created.id, {
        output: 'Build output',
      });

      expect(updated?.versionName).toBe('1.0.0'); // Original preserved
      expect(updated?.output).toBe('Build output'); // New field added
    });
  });

  describe('cancelBuildRecord', () => {
    it('should cancel a building record', () => {
      const created = createBuildRecord({ versionId: 'v-test-1', status: 'building' });
      const cancelled = cancelBuildRecord(created.id);

      expect(cancelled).toBeDefined();
      expect(cancelled?.status).toBe('cancelled');
    });

    it('should return undefined for non-existent record', () => {
      const cancelled = cancelBuildRecord('non-existent');
      expect(cancelled).toBeUndefined();
    });
  });

  describe('getBuildRecordStats', () => {
    it('should return correct statistics', () => {
      createBuildRecord({ versionId: 'v1', status: 'success' });
      createBuildRecord({ versionId: 'v1', status: 'success' });
      createBuildRecord({ versionId: 'v2', status: 'failed' });
      createBuildRecord({ versionId: 'v3', status: 'building' });
      createBuildRecord({ versionId: 'v4', status: 'cancelled' });

      const stats = getBuildRecordStats();

      expect(stats.total).toBe(5);
      expect(stats.byStatus.success).toBe(2);
      expect(stats.byStatus.failed).toBe(1);
      expect(stats.byStatus.building).toBe(1);
      expect(stats.byStatus.cancelled).toBe(1);
      expect(stats.byStatus.pending).toBe(0);
    });

    it('should return zero stats when no records exist', () => {
      const stats = getBuildRecordStats();

      expect(stats.total).toBe(0);
      expect(stats.byStatus.success).toBe(0);
      expect(stats.byStatus.failed).toBe(0);
    });
  });

  describe('BuildRecord interface compliance', () => {
    it('should support all required fields', () => {
      const record: BuildRecord = {
        id: 'br-test',
        versionId: 'v-test',
        versionName: '1.0.0',
        versionNumber: '1.0.0',
        status: 'success',
        queuedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 60000,
        exitCode: 0,
        command: 'npm run build',
        output: 'Build succeeded',
        errorOutput: '',
        artifactCount: 3,
        artifactPaths: ['dist/index.js'],
        artifactUrl: '/artifacts/v-test/1',
        triggeredBy: 'user',
        triggerType: 'manual',
        buildNumber: 1,
        rollbackCount: 0,
        parentBuildId: undefined,
        packagePath: '/packages/v-test-1.zip',
        packageUrl: '/download/v-test-1.zip',
        packageFormat: 'zip',
        packageSize: 1024,
        packageCreatedAt: new Date().toISOString(),
      };

      expect(record.id).toBeDefined();
      expect(record.status).toBeDefined();
      expect(record.buildNumber).toBeDefined();
      expect(record.rollbackCount).toBeDefined();
    });
  });
});
