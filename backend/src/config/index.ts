import 'dotenv/config';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Environment schema
// All values are validated at startup. The app will not start if required
// variables are missing or malformed, giving an explicit error rather than
// a silent runtime failure later.
// ---------------------------------------------------------------------------

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z
    .string()
    .default('8000')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().positive()),

  // Database — required for phases 3+; optional in pure foundation phase
  DATABASE_URL: z.string().url().optional(),

  // Redis — required for phases 3+
  REDIS_URL: z.string().optional(),

  // CORS — comma-separated allowed origins; defaults to localhost dev ports
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173'),

  // ML adapter URL — empty means use mock adapter
  ML_ADAPTER_URL: z.string().url().optional().or(z.literal('')),

  // Notification mode — must be "mock" in non-production
  SMS_MODE: z.enum(['mock', 'live']).default('mock'),

  // Object storage — optional until Phase 7 (reports with media)
  OBJECT_STORAGE_ENDPOINT: z.string().optional(),
  OBJECT_STORAGE_BUCKET: z.string().default('garud-drishti-media'),
  OBJECT_STORAGE_ACCESS_KEY: z.string().optional(),
  OBJECT_STORAGE_SECRET_KEY: z.string().optional(),

  // Auth — optional until Phase 13
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('24h'),
});

export type Config = z.infer<typeof envSchema>;

// Parse once at module load time.
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '[config] Invalid environment variables:\n',
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const config: Config = parsed.data;

// Derived helpers
export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
export const isTest = config.NODE_ENV === 'test';

export const corsOrigins: string[] = config.CORS_ORIGINS.split(',').map(
  (o) => o.trim(),
);
