import { Pool } from 'pg';

import { env } from '../config/env';

const connectionString =
  env.NODE_ENV === 'test' && env.DATABASE_URL_TEST ? env.DATABASE_URL_TEST : env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const query = <T extends object = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => pool.query<T>(text, params);
