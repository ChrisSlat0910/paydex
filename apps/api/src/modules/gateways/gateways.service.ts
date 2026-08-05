import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../config/logger';
import { AppError } from '../../errors/app-error';
import { query } from '../../db/pool';
import { env } from '../../config/env';

interface GatewayRow {
  id: string;
  owner_id: string;
  name: string;
  adapter_type: string;
  is_active: number;
  created_at: string;
}

function encryptCredentials(plaintext: string): string {
  const key = Buffer.from(env.GATEWAY_ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptCredentials(encrypted: string): string {
  const key = Buffer.from(env.GATEWAY_ENCRYPTION_KEY, 'hex');
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new AppError('Invalid encrypted credentials format', 'INTERNAL_ERROR', 500);
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedData = Buffer.from(encryptedHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encryptedData).toString('utf-8') + decipher.final('utf-8');
}

export async function createGateway(
  ownerId: string,
  name: string,
  adapterType: string,
  credentials: string,
): Promise<GatewayRow> {
  const encrypted = encryptCredentials(credentials);
  const id = uuidv4();

  await query(
    `INSERT INTO gateways (id, owner_id, name, adapter_type, encrypted_credentials)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, ownerId, name, adapterType, encrypted],
  );

  const result = await query<GatewayRow>(
    'SELECT id, owner_id, name, adapter_type, is_active, created_at FROM gateways WHERE id = $1',
    [id],
  );

  logger.info('Gateway created', { id, ownerId, name, adapterType });

  return result.rows[0];
}

export async function listGateways(ownerId: string, isAdmin: boolean): Promise<GatewayRow[]> {
  const result = isAdmin
    ? await query<GatewayRow>(
        'SELECT id, owner_id, name, adapter_type, is_active, created_at FROM gateways ORDER BY created_at DESC',
      )
    : await query<GatewayRow>(
        'SELECT id, owner_id, name, adapter_type, is_active, created_at FROM gateways WHERE owner_id = $1 ORDER BY created_at DESC',
        [ownerId],
      );

  return result.rows;
}

export async function getGateway(
  id: string,
  ownerId: string,
  isAdmin: boolean,
): Promise<GatewayRow> {
  const result = isAdmin
    ? await query<GatewayRow>(
        'SELECT id, owner_id, name, adapter_type, is_active, created_at FROM gateways WHERE id = $1',
        [id],
      )
    : await query<GatewayRow>(
        'SELECT id, owner_id, name, adapter_type, is_active, created_at FROM gateways WHERE id = $1 AND owner_id = $2',
        [id, ownerId],
      );

  if (result.rows.length === 0) {
    throw new AppError('Gateway not found', 'GATEWAY_NOT_FOUND', 404);
  }

  return result.rows[0];
}

export async function updateGateway(
  id: string,
  ownerId: string,
  updates: { name?: string; credentials?: string },
): Promise<GatewayRow> {
  const gateway = await getGateway(id, ownerId, false);

  if (!gateway) {
    throw new AppError('Gateway not found', 'GATEWAY_NOT_FOUND', 404);
  }

  if (updates.name) {
    await query('UPDATE gateways SET name = $1 WHERE id = $2', [updates.name, id]);
  }

  if (updates.credentials) {
    const encrypted = encryptCredentials(updates.credentials);
    await query('UPDATE gateways SET encrypted_credentials = $1 WHERE id = $2', [encrypted, id]);
  }

  logger.info('Gateway updated', { id, ownerId });

  return getGateway(id, ownerId, false);
}

export async function deactivateGateway(id: string, ownerId: string): Promise<void> {
  await getGateway(id, ownerId, false);

  await query('UPDATE gateways SET is_active = 0 WHERE id = $1', [id]);

  logger.info('Gateway deactivated', { id, ownerId });
}
