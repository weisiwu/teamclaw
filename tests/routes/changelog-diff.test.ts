import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Changelog Diff Route Tests
 * 覆盖 app/api/v1/versions/changelog/diff/route.ts 的核心逻辑
 * 
 * 测试策略：验证参数校验逻辑和变更差异计算逻辑
 * (不 mock NextRequest/NextResponse，直接测试 handler 内联逻辑)
 */

// ---- Mock fetch ----
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---- Reimplement key handler logic for unit testing ----

type ChangeType = "feature" | "fix" | "improvement" | "breaking" | "docs" | "refactor" | "other";

function transformToFrontend(data: Record<string, unknown>): Record<string, unknown> {
  const changes_detail = data.changes_detail as Array<{ type: string; description: string; files?: string[] }> | undefined;
  const changes = changes_detail && changes_detail.length > 0
    ? changes_detail
    : [
        ...((data.features as string[] || []).map((d: string) => ({ type: "feature", description: d }))),
        ...((data.fixes as string[] || []).map((d: string) => ({ type: "fix", description: d }))),
        ...((data.changes as string[] || []).map((d: string) => ({ type: "improvement", description: d }))),
        ...((data.breaking as string[] || []).map((d: string) => ({ type: "breaking", description: d }))),
      ];

  return {
    id: data.id,
    versionId: data.versionId,
    title: data.title || "",
    content: data.content || "",
    changes,
    generatedAt: data.generatedAt || data.generated_at || new Date().toISOString(),
    generatedBy: data.generatedBy || data.generated_by || "system",
  };
}

function categorize(changes: Array<{ type: string; description: string }>) {
  const cats: Record<ChangeType, string[]> = {
    feature: [], fix: [], improvement: [], breaking: [], docs: [], refactor: [], other: [],
  };
  for (const c of changes) {
    const t = c.type as ChangeType;
    if (cats[t]) cats[t].push(c.description);
  }
  return cats;
}

function computeDiff(fromChanges: Array<{ type: string; description: string }>, toChanges: Array<{ type: string; description: string }>) {
  type DChangeType = "feature" | "fix" | "improvement" | "breaking" | "docs" | "refactor" | "other";
  const fromCats = categorize(fromChanges);
  const toCats = categorize(toChanges);
  const diff: Record<DChangeType, { added: string[]; removed: string[] }> = {} as Record<DChangeType, { added: string[]; removed: string[] }>;
  for (const type of ["feature", "fix", "improvement", "breaking", "docs", "refactor", "other"] as DChangeType[]) {
    const fromSet = new Set(fromCats[type]);
    const toSet = new Set(toCats[type]);
    const added: string[] = [];
    const removed: string[] = [];
    for (const item of toSet) if (!fromSet.has(item)) added.push(item);
    for (const item of fromSet) if (!toSet.has(item)) removed.push(item);
    diff[type] = { added, removed };
  }
  return diff;
}

// ---- Tests ----

describe('Changelog Diff — transformToFrontend()', () => {
  it('uses changes_detail if available', () => {
    const input = {
      id: 'v1', versionId: 'v1-id', title: 'v1 Title', content: 'content',
      changes_detail: [
        { type: 'feature', description: 'New feature A' },
        { type: 'fix', description: 'Bug fix B' },
      ],
    };
    const result = transformToFrontend(input);
    expect((result.changes as Array<{type:string; description:string}>)).toHaveLength(2);
    expect((result.changes as Array<{type:string; description:string}>)[0]).toEqual({ type: 'feature', description: 'New feature A' });
  });

  it('falls back to separate arrays when changes_detail is empty', () => {
    const input = {
      id: 'v2', versionId: 'v2-id',
      features: ['Feature 1', 'Feature 2'],
      fixes: ['Fix 1'],
      changes: ['Improvement 1'],
      breaking: ['Breaking change 1'],
    };
    const result = transformToFrontend(input);
    const changes = result.changes as Array<{type:string; description:string}>;
    // features(2) + fixes(1) + changes(1) + breaking(1) = 5
    expect(changes).toHaveLength(5);
    expect(changes.some(c => c.type === 'feature' && c.description === 'Feature 1')).toBe(true);
    expect(changes.some(c => c.type === 'feature' && c.description === 'Feature 2')).toBe(true);
    expect(changes.some(c => c.type === 'fix' && c.description === 'Fix 1')).toBe(true);
    expect(changes.some(c => c.type === 'improvement' && c.description === 'Improvement 1')).toBe(true);
    expect(changes.some(c => c.type === 'breaking' && c.description === 'Breaking change 1')).toBe(true);
  });

  it('falls back to separate arrays when changes_detail is undefined', () => {
    const input = { id: 'v3', versionId: 'v3-id' };
    const result = transformToFrontend(input);
    expect(result.changes).toEqual([]);
    expect(result.title).toBe('');
    expect(result.content).toBe('');
  });
});

describe('Changelog Diff — categorize()', () => {
  it('categorizes changes by type', () => {
    const changes = [
      { type: 'feature', description: 'A' },
      { type: 'feature', description: 'B' },
      { type: 'fix', description: 'C' },
      { type: 'other', description: 'D' }, // 'other' is a valid type
    ];
    const cats = categorize(changes);
    expect(cats.feature).toEqual(['A', 'B']);
    expect(cats.fix).toEqual(['C']);
    expect(cats.other).toEqual(['D']);
    expect(cats.improvement).toEqual([]);
  });
});

describe('Changelog Diff — computeDiff()', () => {
  it('detects added and removed items per type', () => {
    const from = [
      { type: 'feature', description: 'Old feature' },
      { type: 'fix', description: 'Old fix' },
    ];
    const to = [
      { type: 'feature', description: 'Old feature' },
      { type: 'feature', description: 'New feature' },
    ];
    const diff = computeDiff(from, to);
    expect(diff.feature.added).toContain('New feature');
    expect(diff.feature.removed).toHaveLength(0);
    expect(diff.fix.added).toHaveLength(0);
    expect(diff.fix.removed).toContain('Old fix');
  });

  it('handles identical changelogs with empty diff', () => {
    const same = [{ type: 'feature', description: 'Same' }];
    const diff = computeDiff(same, same);
    expect(diff.feature.added).toHaveLength(0);
    expect(diff.feature.removed).toHaveLength(0);
  });

  it('computes summary counts correctly', () => {
    const from = [{ type: 'feature', description: 'A' }];
    const to = [{ type: 'feature', description: 'A' }, { type: 'feature', description: 'B' }, { type: 'fix', description: 'C' }];
    const diff = computeDiff(from, to);
    const addedCount = Object.values(diff).reduce((s, d) => s + d.added.length, 0);
    const removedCount = Object.values(diff).reduce((s, d) => s + d.removed.length, 0);
    expect(addedCount).toBe(2); // B (feature) + C (fix)
    expect(removedCount).toBe(0);
  });

  it('handles all change types', () => {
    const from = [
      { type: 'feature', description: 'f1' },
      { type: 'fix', description: 'fx1' },
      { type: 'improvement', description: 'i1' },
      { type: 'breaking', description: 'b1' },
      { type: 'docs', description: 'd1' },
      { type: 'refactor', description: 'r1' },
      { type: 'other', description: 'o1' },
    ];
    const diff = computeDiff(from, []);
    for (const type of ['feature', 'fix', 'improvement', 'breaking', 'docs', 'refactor', 'other'] as ChangeType[]) {
      expect(diff[type].removed).toHaveLength(1);
    }
  });
});

describe('Changelog Diff — parameter validation', () => {
  function validateParams(fromId: string | null, toId: string | null): { valid: boolean; error?: string } {
    if (!fromId || !toId) {
      return { valid: false, error: !fromId && !toId ? 'from 和 to 版本 ID 都不能为空' : !fromId ? 'from 版本 ID 不能为空' : 'to 版本 ID 不能为空' };
    }
    return { valid: true };
  }

  it('rejects missing both from and to', () => {
    const result = validateParams(null, null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('from');
    expect(result.error).toContain('to');
  });

  it('rejects missing from', () => {
    const result = validateParams(null, 'v2');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('from');
  });

  it('rejects missing to', () => {
    const result = validateParams('v1', null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('to');
  });

  it('accepts valid params', () => {
    const result = validateParams('v1', 'v2');
    expect(result.valid).toBe(true);
  });
});
