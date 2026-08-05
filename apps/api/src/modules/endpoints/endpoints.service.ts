import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcryptjs';

import { logger } from '../../config/logger';
import { AppError } from '../../errors/app-error';
import { query } from '../../db/pool';

interface EndpointRow {
  id: string;
  owner_id: string;
  gateway_id: string;
  url: string;
  is_active: number;
  created_at: string;
}

export async function createEndpoint(
  ownerId: string,
  gatewayId: string,
  url: string,
  secret?: string,
): Promise<EndpointRow> {
  const id = uuidv4();
  const hashedSecret = secret ? await hash(secret, 12) : null;

  await query(
    `INSERT INTO endpoints (id, owner_id, gateway_id, url, hashed_secret)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, ownerId, gatewayId, url, hashedSecret],
  );

  const result = await query<EndpointRow>(
    'SELECT id, owner_id, gateway_id, url, is_active, created_at FROM endpoints WHERE id = $1',
    [id],
  );

  logger.info('Endpoint created', { id, ownerId, gatewayId });

  return result.rows[0];
}

export async function listEndpoints(ownerId: string): Promise<EndpointRow[]> {
  const result = await query<EndpointRow>(
    `SELECT id, owner_id, gateway_id, url, is_active, created_at
     FROM endpoints WHERE owner_id = $1 ORDER BY created_at DESC`,
    [ownerId],
  );

  return result.rows;
}

export async function deactivateEndpoint(id: string, ownerId: string): Promise<void> {
  const result = await query<EndpointRow>(
    'SELECT id FROM endpoints WHERE id = $1 AND owner_id = $2',
    [id, ownerId],
  );

  if (result.rows.length === 0) {
    throw new AppError('Endpoint not found', 'ENDPOINT_NOT_FOUND', 404);
  }

  await query('UPDATE endpoints SET is_active = 0 WHERE id = $1', [id]);

  logger.info('Endpoint deactivated', { id, ownerId });
}
