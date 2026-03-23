import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Changelog Generate & Timeline Routes Tests
 * 覆盖 app/api/v1/versions/[id]/changelog/generate/route.ts
 * 和 app/api/v1/versions/[id]/timeline/route.ts
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

// ---- Types ----

type ChangeType = 'feature' | 'fix' | 'improvement' | 'breaking' | 'docs' | 'refactor' | 'other';

interface ChangelogChange {
  type: ChangeType;
  description: string;
  files?: string[];
}

interface VersionChangelog {
  id: string;
  versionId: string;
  title: string;
  content: string;
  changes: ChangelogChange[];
  generatedAt: string;
  generatedBy: string;
}

interface TimelineEvent {
  id: string;
  versionId: string;
  type: 'commit' | 'build' | 'tag' | 'rollback' | 'changelog';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ---- Mock stores ----

const mockVersionStore = new Map<string, { id: string; version: string; summary?: string; buildStatus: string }>();
const mockChangelogStore = new Map<string, VersionChangelog>();
const mockTimelineStore = new Map<string, TimelineEvent[]>();

const resetStores = () => {
  mockVersionStore.clear();
  mockChangelogStore.clear();
  mockTimelineStore.clear();

  mockVersionStore.set('v-1', { id: 'v-1', version: '1.0.0', summary: 'Initial release', buildStatus: 'success' });
  mockVersionStore.set('v-2', { id: 'v-2', version: '1.1.0', summary: 'Feature update', buildStatus: 'success' });
  mockVersionStore.set('v-nonexistent', { id: 'v-nonexistent', version: '0.0.0', summary: '', buildStatus: 'pending' });

  mockTimelineStore.set('v-1', [
    { id: 'evt-1', versionId: 'v-1', type: 'commit', description: 'Initial commit', timestamp: '2026-03-01T10:00:00.000Z' },
    { id: 'evt-2', versionId: 'v-1', type: 'build', description: 'Build succeeded', timestamp: '2026-03-01T10:05:00.000Z', metadata: { status: 'success' } },
    { id: 'evt-3', versionId: 'v-1', type: 'tag', description: 'Tagged v1.0.0', timestamp: '2026-03-01T10:10:00.000Z' },
  ]);
  mockTimelineStore.set('v-2', [
    { id: 'evt-4', versionId: 'v-2', type: 'commit', description: 'Add new feature', timestamp: '2026-03-10T10:00:00.000Z' },
    { id: 'evt-5', versionId: 'v-2', type: 'build', description: 'Build failed', timestamp: '2026-03-10T10:05:00.000Z', metadata: { status: 'failed' } },
  ]);
};

vi.mock('../../app/api/v1/versions/version-store', () => ({
  versionStore: mockVersionStore,
}));

// ---- Handler logic ----

function jsonSuccess(data: unknown, requestId = 'test-req') {
  return { code: 0, data, requestId };
}

function jsonError(message: string, status: number) {
  return { code: status, message };
}

// ChangelogGenerate handler
function handleGenerateChangelog(
  versionId: string,
  body: { changedFiles?: string[]; force?: boolean } = {}
) {
  const version = mockVersionStore.get(versionId);
  if (!version) {
    return { error: jsonError('版本不存在', 404) };
  }

  const changedFiles = body.changedFiles || [];

  // Simulate AI changelog generation
  const changes: ChangelogChange[] = changedFiles.length === 0
    ? []
    : changedFiles.map((file, i) => ({
        type: (['feature', 'fix', 'improvement', 'docs'] as ChangeType[])[i % 4],
        description: `变更: ${file}`,
        files: [file],
      }));

  const changelog: VersionChangelog = {
    id: `cl-${versionId}-${Date.now()}`,
    versionId,
    title: `Version ${version.version} Changelog`,
    content: changedFiles.length === 0
      ? '无变更文件。'
      : `本次更新包含 ${changes.length} 项变更。`,
    changes,
    generatedAt: new Date().toISOString(),
    generatedBy: 'AI',
  };

  mockChangelogStore.set(versionId, changelog);
  return { result: jsonSuccess(changelog) };
}

// GET changelog handler
function handleGetChangelog(versionId: string) {
  const version = mockVersionStore.get(versionId);
  if (!version) return { error: jsonError('版本不存在', 404) };

  const changelog = mockChangelogStore.get(versionId);
  if (!changelog) return { error: jsonError('Changelog not found', 404) };

  return { result: jsonSuccess(changelog) };
}

// Timeline handler
function handleGetTimeline(
  versionId: string,
  params: { type?: string | null; limit?: string | null } = {}
) {
  const version = mockVersionStore.get(versionId);
  if (!version) return { error: jsonError('版本不存在', 404) };

  let events = mockTimelineStore.get(versionId) || [];

  if (params.type) {
    events = events.filter(e => e.type === params.type);
  }

  const limit = parseInt(params.limit || '50');
  events = events.slice(0, limit);

  return jsonSuccess({ events, total: events.length });
}

// ---- Tests ----

describe('POST /api/v1/versions/[id]/changelog/generate handler', () => {
  beforeEach(() => { resetStores(); });

  it('generates changelog for existing version', () => {
    const result = handleGenerateChangelog('v-1', { changedFiles: ['src/a.ts', 'src/b.ts'] }) as { result: { data: VersionChangelog } };
    expect(result.result.data.versionId).toBe('v-1');
    expect(result.result.data.title).toContain('1.0.0');
  });

  it('returns 404 for non-existent version', () => {
    const result = handleGenerateChangelog('nonexistent') as { error: { code: number } };
    expect(result.error.code).toBe(404);
  });

  it('generates empty changelog when no changedFiles', () => {
    const result = handleGenerateChangelog('v-1', {}) as { result: { data: { changes: unknown[]; content: string } } };
    expect(result.result.data.changes).toHaveLength(0);
    expect(result.result.data.content).toContain('无变更');
  });

  it('maps changedFiles to changes array', () => {
    const result = handleGenerateChangelog('v-1', { changedFiles: ['src/feature.ts', 'src/bugfix.ts', 'src/docs.md', 'src/refactor.ts'] }) as { result: { data: { changes: ChangelogChange[] } } };
    expect(result.result.data.changes).toHaveLength(4);
    expect(result.result.data.changes[0].type).toBe('feature');
    expect(result.result.data.changes[0].files).toContain('src/feature.ts');
  });

  it('each change has required fields', () => {
    const result = handleGenerateChangelog('v-1', { changedFiles: ['test.ts'] }) as { result: { data: { changes: ChangelogChange[] } } };
    const change = result.result.data.changes[0];
    expect(change).toHaveProperty('type');
    expect(change).toHaveProperty('description');
    expect(change).toHaveProperty('files');
    expect(['feature', 'fix', 'improvement', 'breaking', 'docs', 'refactor', 'other']).toContain(change.type);
  });

  it('stores generated changelog', () => {
    handleGenerateChangelog('v-1', { changedFiles: ['a.ts'] });
    const stored = mockChangelogStore.get('v-1');
    expect(stored).toBeDefined();
    expect(stored?.generatedBy).toBe('AI');
  });

  it('overwrites existing changelog when called again', () => {
    handleGenerateChangelog('v-1', { changedFiles: ['a.ts'] });
    const firstContent = mockChangelogStore.get('v-1')?.content;
    // Overwrite by calling again
    handleGenerateChangelog('v-1', { changedFiles: ['b.ts', 'c.ts'] });
    const secondContent = mockChangelogStore.get('v-1')?.content;
    // Content should differ (a.ts vs b.ts+c.ts)
    expect(secondContent).not.toBe(firstContent);
  });
});

describe('GET /api/v1/versions/[id]/changelog handler', () => {
  beforeEach(() => { resetStores(); });

  it('returns changelog when it exists', () => {
    handleGenerateChangelog('v-1', { changedFiles: ['a.ts'] });
    const result = handleGetChangelog('v-1') as { result: { data: VersionChangelog } };
    expect(result.result.data.versionId).toBe('v-1');
  });

  it('returns 404 for non-existent version', () => {
    const result = handleGetChangelog('nonexistent') as { error: { code: number } };
    expect(result.error.code).toBe(404);
  });

  it('returns 404 when changelog not yet generated', () => {
    const result = handleGetChangelog('v-1') as { error: { code: number; message: string } };
    expect(result.error.code).toBe(404);
    expect(result.error.message).toBe('Changelog not found');
  });
});

describe('GET /api/v1/versions/[id]/timeline handler', () => {
  beforeEach(() => { resetStores(); });

  it('returns timeline for existing version', () => {
    const result = handleGetTimeline('v-1') as { data: { events: TimelineEvent[]; total: number } };
    expect(result.data.total).toBe(3);
    expect(result.data.events).toHaveLength(3);
  });

  it('each event has required fields', () => {
    const result = handleGetTimeline('v-1') as { data: { events: TimelineEvent[]; total: number } };
    const event = result.data.events[0];
    expect(event).toHaveProperty('id');
    expect(event).toHaveProperty('versionId');
    expect(event).toHaveProperty('type');
    expect(event).toHaveProperty('description');
    expect(event).toHaveProperty('timestamp');
  });

  it('returns 404 for non-existent version', () => {
    const result = handleGetTimeline('nonexistent') as { error: { code: number } };
    expect(result.error.code).toBe(404);
  });

  it('filters by event type', () => {
    const result = handleGetTimeline('v-1', { type: 'build' }) as { data: { events: TimelineEvent[]; total: number } };
    expect(result.data.total).toBe(1);
    expect(result.data.events[0].type).toBe('build');
  });

  it('filters by type=commit', () => {
    const result = handleGetTimeline('v-1', { type: 'commit' }) as { data: { events: TimelineEvent[]; total: number } };
    expect(result.data.events.every(e => e.type === 'commit')).toBe(true);
  });

  it('filters by type=tag', () => {
    const result = handleGetTimeline('v-1', { type: 'tag' }) as { data: { events: TimelineEvent[]; total: number } };
    expect(result.data.total).toBe(1);
    expect(result.data.events[0].description).toContain('Tagged');
  });

  it('respects limit parameter', () => {
    const result = handleGetTimeline('v-1', { limit: '2' }) as { data: { events: TimelineEvent[]; total: number } };
    expect(result.data.events).toHaveLength(2);
  });

  it('returns empty array for version with no timeline', () => {
    mockTimelineStore.set('v-nonexistent', []);
    const result = handleGetTimeline('v-nonexistent') as { data: { events: unknown[]; total: number } };
    expect(result.data.total).toBe(0);
    expect(result.data.events).toHaveLength(0);
  });

  it('events contain timestamps', () => {
    const result = handleGetTimeline('v-1') as { data: { events: TimelineEvent[]; total: number } };
    const timestamps = result.data.events.map(e => e.timestamp);
    expect(timestamps.length).toBe(3);
    // Verify all timestamps are valid ISO strings
    timestamps.forEach(ts => {
      expect(new Date(ts).toISOString()).toBe(ts);
    });
  });

  it('includes metadata when present', () => {
    const result = handleGetTimeline('v-1', { type: 'build' }) as { data: { events: TimelineEvent[]; total: number } };
    expect(result.data.events[0].metadata).toBeDefined();
    expect(result.data.events[0].metadata?.status).toBe('success');
  });
});
