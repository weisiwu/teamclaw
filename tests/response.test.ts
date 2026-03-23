import { describe, it, expect } from 'vitest';
import { success, error } from '@/server/src/utils/response';

describe('API Response Utilities', () => {
  describe('success()', () => {
    it('returns success:true, code 200 with data', () => {
      const result = success({ id: 1 });
      expect(result.success).toBe(true);
      expect(result.code).toBe(200);
      expect(result.data).toEqual({ id: 1 });
      expect(result.message).toBe('ok');
      expect(result.requestId).toBeDefined();
    });

    it('accepts custom requestId', () => {
      const result = success({ id: 1 }, 'custom-id');
      expect(result.requestId).toBe('custom-id');
    });

    it('returns with array data', () => {
      const result = success([1, 2, 3]);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('returns with primitive data', () => {
      const result = success(42);
      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });

    it('data property can be undefined', () => {
      const result = success(undefined);
      expect(result.data).toBeUndefined();
    });
  });

  describe('error()', () => {
    it('accepts statusCode and message as two args', () => {
      const result = error(404, 'Not found');
      expect(result.success).toBe(false);
      expect(result.code).toBe(404);
      expect(result.errorCode).toBe('NOT_FOUND');
      expect(result.message).toBe('Not found');
      expect(result.requestId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('accepts statusCode, message, and errorCode', () => {
      const result = error(400, 'Invalid params', 'VALIDATION_ERROR');
      expect(result.success).toBe(false);
      expect(result.code).toBe(400);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Invalid params');
    });

    it('accepts errorCode string and message (backward compat)', () => {
      const result = error('INVALID_PARAMS', '需要 q 参数');
      expect(result.success).toBe(false);
      expect(result.code).toBe(400);
      expect(result.errorCode).toBe('INVALID_PARAMS');
      expect(result.message).toBe('需要 q 参数');
    });

    it('handles common HTTP error codes', () => {
      const cases: [number, string][] = [
        [400, 'Bad request'],
        [401, 'Unauthorized'],
        [403, 'Forbidden'],
        [404, 'Not found'],
        [500, 'Internal server error'],
      ];
      for (const [code, msg] of cases) {
        const result = error(code, msg);
        expect(result.success).toBe(false);
        expect(result.code).toBe(code);
        expect(result.message).toBe(msg);
        expect(result.errorCode).toBeDefined();
      }
    });
  });
});
