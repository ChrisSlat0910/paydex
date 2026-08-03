import { randomBytes } from 'node:crypto';

import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { query } from '../../db/pool';
import { AppError } from '../../errors/app-error';
import { logger } from '../../config/logger';
import { redisConnection } from '../../queue/bullmq.config';

interface ApiKeyRow {
  id: string;
  user_id: string;
  prefix: string;
  environment: 'live' | 'test';
  is_active: number;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

function generateApiKey(environment: 'live' | 'test'): { plaintext: string; prefix: string } {
  const suffix = randomBytes(24).toString('base64url');
  const plaintext = `pd_${environment}_${suffix}`;
  const prefix = plaintext.substring(0, plaintext.indexOf('_', 8) + 9);

  return { plaintext, prefix };
}

export async function createApiKey(
  userId: string,
  environment: 'live' | 'test' = 'live',
): Promise<{ id: string; plaintext: string; prefix: string; environment: string }> {
  const { plaintext, prefix } = generateApiKey(environment);
  const hashedKey = await hash(plaintext, 12);
  const id = uuidv4();

  await query(
    'INSERT INTO api_keys (id, user_id, prefix, hashed_key, environment) VALUES ($1, $2, $3, $4, $5)',
    [id, userId, prefix, hashedKey, environment],
  );

  logger.info('API key created', { userId, prefix });

  return { id, plaintext, prefix, environment };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const result = await query<ApiKeyRow>(
    `SELECT id, user_id, prefix, environment, is_active, last_used_at, created_at, revoked_at
     FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );

  return result.rows;
}

export async function revokeApiKey(id: string, userId: string): Promise<void> {
  const result = await query<ApiKeyRow>(
    'SELECT id, prefix FROM api_keys WHERE id = $1 AND user_id = $2',
    [id, userId],
  );

  if (result.rows.length === 0) {
    throw new AppError('API key not found', 'API_KEY_NOT_FOUND', 404);
  }

  const key = result.rows[0];

  await query('UPDATE api_keys SET is_active = 0, revoked_at = NOW() WHERE id = $1', [id]);

  await redisConnection.del(`apikey:${key.prefix}`).catch(() => null);

  logger.info('API key revoked', { id, userId });
}

export async function rotateApiKey(
  id: string,
  userId: string,
): Promise<{ plaintext: string; prefix: string }> {
  const result = await query<ApiKeyRow>(
    'SELECT id, prefix, environment FROM api_keys WHERE id = $1 AND user_id = $2',
    [id, userId],
  );

  if (result.rows.length === 0) {
    throw new AppError('API key not found', 'API_KEY_NOT_FOUND', 404);
  }

  const oldKey = result.rows[0];
  const environment = oldKey.environment;

  await revokeApiKey(id, userId);
  const newKey = await createApiKey(userId, environment);

  logger.info('API key rotated', { oldId: id, newId: newKey.id, userId });

  return { plaintext: newKey.plaintext, prefix: newKey.prefix };
}
