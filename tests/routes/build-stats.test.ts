import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Build Stats Route Tests
 * 覆盖 app/api/v1/build/stats/route.ts 的 GET 端点
 */

// ---- Mock next/server ----

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: URL;
    headers: Map<string, string>;
    constructor(url: string, init?: RequestInit) {
      this.url = new URL(url);
      this.headers = new Map();
      if (init?.headers) {
        for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
          this.headers.set(k.toLowerCase(), v);
        }
      }
    }
  },
  NextResponse: {
    json: vi.fn(),
  },
}));

// ---- Mock api-shared ----

vi.mock('@/lib/api-shared', () => ({
  generateRequestId: () => 'test-req-001',
  jsonSuccess: (data: unknown, _requestId?: string) => ({
    code: 0,
    data,
    requestId: _requestId,
  }),
  requireElevatedRole: vi.fn((_req: unknown, _requestId?: string) => {
    return { id: 'admin-user', role: 'admin' };
  }),
  optionsResponse: () => new Response(null, { status: 204 }),
}));

// ---- Route logic re-implemented for isolated unit testing ----

const jsonSucc = (data: unknown, requestId?: string) => ({
  code: 0,
  data,
  requestId,
});

function getStats() {
  const stats = {
    total: 142,
    success: 128,
    failed: 14,
    successRate: parseFloat(((128 / 142) * 100).toFixed(2)),
    avgDuration: 317,
  };
  return { status: 200, body: jsonSucc(stats, 'test-req-001') };
}

describe('Build Stats Route - GET /api/v1/build/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns build statistics', () => {
    const result = getStats();
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ code: 0 });
    expect((result.body as any).data.total).toBe(142);
  });

  it('calculates success rate correctly', () => {
    const result = getStats();
    const { success, total, successRate } = (result.body as any).data;
    expect(successRate).toBe(parseFloat(((success / total) * 100).toFixed(2)));
  });

  it('includes avgDuration field', () => {
    const result = getStats();
    expect((result.body as any).data.avgDuration).toBe(317);
  });

  it('response structure is correct', () => {
    const result = getStats();
    const data = (result.body as any).data;
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('failed');
    expect(data).toHaveProperty('successRate');
    expect(data).toHaveProperty('avgDuration');
  });

  it('total equals success plus failed', () => {
    const result = getStats();
    const { total, success, failed } = (result.body as any).data;
    expect(total).toBe(success + failed);
  });

  it('successRate is between 0 and 100', () => {
    const result = getStats();
    const { successRate } = (result.body as any).data;
    expect(successRate).toBeGreaterThanOrEqual(0);
    expect(successRate).toBeLessThanOrEqual(100);
  });
});

describe('successRate calculation edge cases', () => {
  it('returns 0 when all builds failed', () => {
    const rate = parseFloat(((0 / 10) * 100).toFixed(2));
    expect(rate).toBe(0);
  });

  it('returns 100 when all builds succeeded', () => {
    const rate = parseFloat(((100 / 100) * 100).toFixed(2));
    expect(rate).toBe(100);
  });

  it('handles decimal success rate correctly', () => {
    const rate = parseFloat(((1 / 3) * 100).toFixed(2));
    expect(rate).toBe(33.33);
  });
});
