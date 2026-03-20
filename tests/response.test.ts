import { describe, it, expect } from 'vitest';
import { success, error } from '@/server/src/utils/response';

describe('API Response Utilities', () => {
  describe('success()', () => {
    it('returns code 0 with data and default message', () => {
      const result = success({ id: 1 });
      expect(result.code).toBe(0);
      expect(result.data).toEqual({ id: 1 });
      expect(result.message).toBe('ok');
    });

    it('returns code 0 with custom message', () => {
      const result = success(null, 'Operation completed');
      expect(result.code).toBe(0);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Operation completed');
    });

    it('returns code 0 with array data', () => {
      const result = success([1, 2, 3]);
      expect(result.code).toBe(0);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('returns code 0 with primitive data', () => {
      const result = success(42);
      expect(result.code).toBe(0);
      expect(result.data).toBe(42);
    });

    it('data property can be undefined', () => {
      const result = success(undefined);
      expect(result.data).toBeUndefined();
    });
  });

  describe('error()', () => {
    it('accepts code (number) and message as two args', () => {
      const result = error(404, 'Not found');
      expect(result.code).toBe(404);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Not found');
    });

    it('accepts only message string (defaults code to 500)', () => {
      const result = error('Something went wrong');
      expect(result.code).toBe(500);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Something went wrong');
    });

    it('defaults empty message when code given without message', () => {
      const result = error(403);
      expect(result.code).toBe(403);
      expect(result.message).toBe('');
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
        expect(result.code).toBe(code);
        expect(result.message).toBe(msg);
        expect(result.data).toBeNull();
      }
    });
  });
});
