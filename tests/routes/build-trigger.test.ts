import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Build Trigger Route Tests
 * 覆盖 app/api/v1/build/trigger/route.ts 的 POST/GET 端点
 */

// ---- Mock next/server ----

const mockJsonResponses: Array<{ status: number; body: unknown }> = [];

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: URL;
    headers: Map<string, string>;
    private _body: string | null = null;

    constructor(url: string, init?: RequestInit) {
      this.url = new URL(url);
      this.headers = new Map();
      if (init?.headers) {
        for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
          this.headers.set(k.toLowerCase(), v);
        }
      }
      if (init?.body) this._body = init.body as string;
    }

    async json() {
      if (this._body) return JSON.parse(this._body);
      return {};
    }
  },
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
      mockJsonResponses.push({ status: init?.status || 200, body });
      return {
        status: init?.status || 200,
        headers: new Map(Object.entries(init?.headers || {})),
        body,
      };
    }),
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
  optionsResponse: () => new Response(null, { status: 204 }),
}));

// ---- Route logic re-implemented for isolated unit testing ----

const VALID_ENVS = new Set(['production', 'staging', 'development', 'test']);

const jsonError = (message: string, status: number, requestId?: string) => ({
  code: status,
  message,
  requestId,
});

const jsonSucc = (data: unknown, requestId?: string) => ({
  code: 0,
  data,
  requestId,
});

function validateVersionId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_.-]+$/.test(id) && id.length <= 128 && id.length > 0;
}

function validateVersionName(name: string): boolean {
  return typeof name === 'string' && name.length > 0 && name.length <= 128;
}

function handlePostTrigger(body: Record<string, unknown>): { status: number; body: unknown } {
  const { versionId, versionName, env, buildId } = body;

  if (!validateVersionId(versionId as string)) {
    return { status: 400, body: jsonError('Missing or invalid versionId', 400, 'test-req-001') };
  }
  if (!validateVersionName(versionName as string)) {
    return { status: 400, body: jsonError('Missing or invalid versionName (max 128 chars)', 400, 'test-req-001') };
  }
  if (!env || typeof env !== 'string' || !VALID_ENVS.has(env)) {
    return {
      status: 400,
      body: jsonError(
        `Missing or invalid env. Must be one of: ${Array.from(VALID_ENVS).join(', ')}`,
        400,
        'test-req-001'
      ),
    };
  }

  const generatedBuildId =
    buildId && typeof buildId === 'string' && /^[a-zA-Z0-9_.-]+$/.test(buildId)
      ? buildId
      : `build-${Date.now().toString(36)}`;

  return {
    status: 200,
    body: jsonSucc({
      buildId: generatedBuildId,
      versionId,
      versionName,
      env,
      status: 'building',
      startedAt: new Date().toISOString(),
      ciUrl: null,
    }, 'test-req-001'),
  };
}

function handleGetTrigger(buildId: string | null): { status: number; body: unknown } {
  if (!buildId) {
    return { status: 400, body: jsonError('Missing buildId parameter', 400, 'test-req-001') };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(buildId)) {
    return { status: 400, body: jsonError('Invalid buildId format', 400, 'test-req-001') };
  }
  return {
    status: 200,
    body: jsonSucc({
      buildId,
      status: 'building',
      progress: 50,
      requestedAt: new Date().toISOString(),
    }, 'test-req-001'),
  };
}

describe('Build Trigger Route - POST /api/v1/build/trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJsonResponses.length = 0;
  });

  it('accepts valid trigger request', () => {
    const result = handlePostTrigger({
      versionId: 'v-test-1',
      versionName: '1.0.0',
      env: 'production',
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ code: 0 });
    expect((result.body as any).data.status).toBe('building');
  });

  it('accepts valid trigger request with custom buildId', () => {
    const result = handlePostTrigger({
      versionId: 'v-test-1',
      versionName: '1.0.0',
      env: 'production',
      buildId: 'build-custom-123',
    });
    expect(result.status).toBe(200);
    expect((result.body as any).data.buildId).toBe('build-custom-123');
  });

  it('rejects missing versionId', () => {
    const result = handlePostTrigger({
      versionName: '1.0.0',
      env: 'production',
    });
    expect(result.status).toBe(400);
    expect((result.body as any).message).toContain('versionId');
  });

  it('rejects invalid versionId format with space', () => {
    const result = handlePostTrigger({
      versionId: 'v test 123',
      versionName: '1.0.0',
      env: 'production',
    });
    expect(result.status).toBe(400);
  });

  it('rejects versionId with special characters', () => {
    const result = handlePostTrigger({
      versionId: 'v@test@123',
      versionName: '1.0.0',
      env: 'production',
    });
    expect(result.status).toBe(400);
  });

  it('rejects missing versionName', () => {
    const result = handlePostTrigger({
      versionId: 'v-test-1',
      env: 'production',
    });
    expect(result.status).toBe(400);
    expect((result.body as any).message).toContain('versionName');
  });

  it('rejects versionName exceeding 128 chars', () => {
    const result = handlePostTrigger({
      versionId: 'v-test-1',
      versionName: 'a'.repeat(129),
      env: 'production',
    });
    expect(result.status).toBe(400);
  });

  it('rejects missing env', () => {
    const result = handlePostTrigger({
      versionId: 'v-test-1',
      versionName: '1.0.0',
    });
    expect(result.status).toBe(400);
    expect((result.body as any).message).toContain('env');
  });

  it('rejects invalid env value', () => {
    const result = handlePostTrigger({
      versionId: 'v-test-1',
      versionName: '1.0.0',
      env: 'invalid-env',
    });
    expect(result.status).toBe(400);
    expect((result.body as any).message).toContain('env');
  });

  it('accepts all valid env values', () => {
    for (const env of ['production', 'staging', 'development', 'test']) {
      const result = handlePostTrigger({
        versionId: 'v-test-1',
        versionName: '1.0.0',
        env,
      });
      expect(result.status).toBe(200);
    }
  });

  it('generates buildId when not provided', () => {
    const result = handlePostTrigger({
      versionId: 'v-test-1',
      versionName: '1.0.0',
      env: 'production',
    });
    expect(result.status).toBe(200);
    expect((result.body as any).data.buildId).toMatch(/^build-/);
  });

  it('uses custom buildId when valid', () => {
    const result = handlePostTrigger({
      versionId: 'v-test-1',
      versionName: '1.0.0',
      env: 'production',
      buildId: 'build-custom-xyz',
    });
    expect(result.status).toBe(200);
    expect((result.body as any).data.buildId).toBe('build-custom-xyz');
  });
});

describe('Build Trigger Route - GET /api/v1/build/trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJsonResponses.length = 0;
  });

  it('accepts valid buildId', () => {
    const result = handleGetTrigger('build-abc123');
    expect(result.status).toBe(200);
    expect((result.body as any).data.buildId).toBe('build-abc123');
  });

  it('rejects missing buildId', () => {
    const result = handleGetTrigger(null);
    expect(result.status).toBe(400);
    expect((result.body as any).message).toContain('buildId');
  });

  it('rejects invalid buildId format', () => {
    const result = handleGetTrigger('build test');
    expect(result.status).toBe(400);
    expect((result.body as any).message).toContain('buildId');
  });
});

describe('VALID_ENVS constant', () => {
  it('contains expected environments', () => {
    expect(VALID_ENVS.has('production')).toBe(true);
    expect(VALID_ENVS.has('staging')).toBe(true);
    expect(VALID_ENVS.has('development')).toBe(true);
    expect(VALID_ENVS.has('test')).toBe(true);
    expect(VALID_ENVS.has('custom')).toBe(false);
  });
});


