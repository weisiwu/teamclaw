import { describe, it, expect } from 'vitest';
import { apiSuccess, apiError, json, type ApiSuccess, type ApiError } from '@/lib/api-response';

describe('apiSuccess()', () => {
  it('returns code 0 with data and message ok', () => {
    const result = apiSuccess({ id: 1 });
    expect(result.code).toBe(0);
    expect(result.message).toBe('ok');
    expect(result.data).toEqual({ id: 1 });
  });

  it('returns code 0 with primitive data', () => {
    expect(apiSuccess(42).data).toBe(42);
    expect(apiSuccess('hello').data).toBe('hello');
    expect(apiSuccess(true).data).toBe(true);
    expect(apiSuccess(null).data).toBeNull();
  });

  it('returns code 0 with array data', () => {
    const result = apiSuccess([{ name: 'v1' }, { name: 'v2' }]);
    expect(result.code).toBe(0);
    expect(result.data).toHaveLength(2);
  });

  it('data can be undefined', () => {
    const result = apiSuccess(undefined);
    expect(result.code).toBe(0);
    expect(result.message).toBe('ok');
    expect(result.data).toBeUndefined();
  });
});

describe('apiError()', () => {
  it('returns correct status code and message', () => {
    const result = apiError('Not found', 404);
    expect(result.code).toBe(404);
    expect(result.message).toBe('Not found');
    expect(result.data).toBeUndefined();
  });

  it('defaults to 500 when only message provided', () => {
    const result = apiError('Something went wrong');
    expect(result.code).toBe(500);
    expect(result.message).toBe('Something went wrong');
  });

  it('defaults to 500 when only code provided', () => {
    const result = apiError('Internal error', 500);
    expect(result.code).toBe(500);
    expect(result.message).toBe('Internal error');
  });

  it('handles common HTTP error codes', () => {
    const cases: [string, number][] = [
      ['Bad request', 400],
      ['Unauthorized', 401],
      ['Forbidden', 403],
      ['Not found', 404],
      ['Conflict', 409],
      ['Internal server error', 500],
    ];
    for (const [msg, code] of cases) {
      const result = apiError(msg, code);
      expect(result.code).toBe(code);
      expect(result.message).toBe(msg);
    }
  });
});

describe('json()', () => {
  it('is exported as a function', () => {
    expect(typeof json).toBe('function');
  });

  it('returns a NextResponse instance', () => {
    const result = json({ foo: 'bar' });
    // NextResponse.json() returns a NextResponse-like object with a json() method
    expect(result).toBeDefined();
    expect(typeof result.json).toBe('function');
  });

  it('wraps data in apiSuccess format via json method', async () => {
    const result = json({ id: 1 });
    const body = await result.json();
    expect(body.code).toBe(0);
    expect(body.message).toBe('ok');
    expect(body.data).toEqual({ id: 1 });
  });

  it('json with empty data', async () => {
    const result = json([]);
    const body = await result.json();
    expect(body.code).toBe(0);
    expect(body.data).toEqual([]);
  });

  it('json accepts ResponseInit options', () => {
    const result = json({ ok: true }, { status: 201 });
    expect(result).toBeDefined();
  });
});

describe('ApiResponse union type', () => {
  it('ApiSuccess has code 0 and data', () => {
    const success: ApiSuccess = { code: 0, message: 'ok', data: {} };
    expect(success.code).toBe(0);
    expect(success.data).toBeDefined();
  });

  it('ApiError has non-zero code and message', () => {
    const error: ApiError = { code: 403, message: 'Forbidden' };
    expect(error.code).toBe(403);
    expect(error.message).toBe('Forbidden');
  });
});
