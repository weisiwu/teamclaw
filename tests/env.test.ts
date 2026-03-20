import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Replicate envSchema to test its validation logic
const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  API_KEY: z.string().optional(),
  EXTERNAL_API_URL: z.string().url().optional(),
  ENABLE_ANALYTICS: z
    .preprocess((val) => String(val ?? "false"), z.string())
    .transform((val) => val === "true")
    .default(false),
  ENABLE_DEBUG: z
    .preprocess((val) => String(val ?? "false"), z.string())
    .transform((val) => val === "true")
    .default(false),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

describe('envSchema - Zod validation', () => {
  describe('DATABASE_URL', () => {
    it('accepts valid URL', () => {
      const result = envSchema.safeParse({ DATABASE_URL: 'https://example.com/db' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid URL', () => {
      const result = envSchema.safeParse({ DATABASE_URL: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('accepts missing (optional)', () => {
      const result = envSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('NEXTAUTH_SECRET', () => {
    it('accepts non-empty string', () => {
      const result = envSchema.safeParse({ NEXTAUTH_SECRET: 'my-secret-key' });
      expect(result.success).toBe(true);
    });

    it('rejects empty string', () => {
      const result = envSchema.safeParse({ NEXTAUTH_SECRET: '' });
      expect(result.success).toBe(false);
    });

    it('accepts missing (optional)', () => {
      const result = envSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('ENABLE_ANALYTICS', () => {
    it('transforms string "true" to boolean true', () => {
      const result = envSchema.safeParse({ ENABLE_ANALYTICS: 'true' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.ENABLE_ANALYTICS).toBe(true);
    });

    it('transforms string "false" to boolean false', () => {
      const result = envSchema.safeParse({ ENABLE_ANALYTICS: 'false' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.ENABLE_ANALYTICS).toBe(false);
    });

    it('defaults to false when missing', () => {
      const result = envSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.ENABLE_ANALYTICS).toBe(false);
    });

    it('handles undefined/null gracefully via preprocess', () => {
      const result = envSchema.safeParse({ ENABLE_ANALYTICS: undefined });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.ENABLE_ANALYTICS).toBe(false);
    });
  });

  describe('ENABLE_DEBUG', () => {
    it('transforms string "true" to boolean true', () => {
      const result = envSchema.safeParse({ ENABLE_DEBUG: 'true' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.ENABLE_DEBUG).toBe(true);
    });

    it('defaults to false when missing', () => {
      const result = envSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.ENABLE_DEBUG).toBe(false);
    });
  });

  describe('NODE_ENV', () => {
    it('accepts "development"', () => {
      const result = envSchema.safeParse({ NODE_ENV: 'development' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.NODE_ENV).toBe('development');
    });

    it('accepts "production"', () => {
      const result = envSchema.safeParse({ NODE_ENV: 'production' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.NODE_ENV).toBe('production');
    });

    it('accepts "test"', () => {
      const result = envSchema.safeParse({ NODE_ENV: 'test' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.NODE_ENV).toBe('test');
    });

    it('rejects invalid value', () => {
      const result = envSchema.safeParse({ NODE_ENV: 'staging' });
      expect(result.success).toBe(false);
    });

    it('defaults to "development" when missing', () => {
      const result = envSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.NODE_ENV).toBe('development');
    });
  });

  describe('full env parse', () => {
    it('parses all fields correctly', () => {
      const result = envSchema.safeParse({
        DATABASE_URL: 'https://db.example.com',
        NEXTAUTH_SECRET: 'super-secret',
        NEXTAUTH_URL: 'http://localhost:3000',
        API_KEY: 'sk-test-123',
        EXTERNAL_API_URL: 'https://api.example.com',
        ENABLE_ANALYTICS: 'true',
        ENABLE_DEBUG: 'true',
        NODE_ENV: 'production',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_URL).toBe('https://db.example.com');
        expect(result.data.NEXTAUTH_SECRET).toBe('super-secret');
        expect(result.data.NEXTAUTH_URL).toBe('http://localhost:3000');
        expect(result.data.API_KEY).toBe('sk-test-123');
        expect(result.data.EXTERNAL_API_URL).toBe('https://api.example.com');
        expect(result.data.ENABLE_ANALYTICS).toBe(true);
        expect(result.data.ENABLE_DEBUG).toBe(true);
        expect(result.data.NODE_ENV).toBe('production');
      }
    });

    it('parses with all fields missing', () => {
      const result = envSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ENABLE_ANALYTICS).toBe(false);
        expect(result.data.ENABLE_DEBUG).toBe(false);
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.DATABASE_URL).toBeUndefined();
      }
    });
  });

  describe('error details', () => {
    it('returns ZodError issues for invalid fields', () => {
      const result = envSchema.safeParse({
        DATABASE_URL: 'not-url',
        NEXTAUTH_SECRET: '',
        NODE_ENV: 'invalid-env',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.some(i => i.path.includes('DATABASE_URL'))).toBe(true);
        expect(issues.some(i => i.path.includes('NEXTAUTH_SECRET'))).toBe(true);
        expect(issues.some(i => i.path.includes('NODE_ENV'))).toBe(true);
      }
    });
  });
});
