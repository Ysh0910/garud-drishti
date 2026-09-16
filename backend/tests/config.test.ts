import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

describe('Configuration Schema Validation', () => {
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z
      .string()
      .default('8000')
      .transform((v) => parseInt(v, 10))
      .pipe(z.number().positive()),
    SMS_MODE: z.enum(['mock', 'live']).default('mock'),
    CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  });

  it('populates defaults when env variables are omitted', () => {
    const parsed = envSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.NODE_ENV).toBe('development');
      expect(parsed.data.PORT).toBe(8000);
      expect(parsed.data.SMS_MODE).toBe('mock');
    }
  });

  it('parses and casts valid string PORT to number', () => {
    const parsed = envSchema.safeParse({ PORT: '9000' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.PORT).toBe(9000);
    }
  });

  it('fails on invalid NODE_ENV', () => {
    const parsed = envSchema.safeParse({ NODE_ENV: 'invalid_env' });
    expect(parsed.success).toBe(false);
  });

  it('fails on invalid non-numeric PORT', () => {
    const parsed = envSchema.safeParse({ PORT: 'not-a-port' });
    expect(parsed.success).toBe(false);
  });
});
