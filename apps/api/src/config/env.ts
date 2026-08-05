import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),

  DATABASE_URL: z.url(),
  DATABASE_URL_TEST: z.url().optional(),

  REDIS_URL: z.url(),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  GATEWAY_ENCRYPTION_KEY: z.string().length(64),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.issues.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n');
  throw new Error(`Invalid environment variables:\n${errors}`);
}

export const env = parsed.data;
