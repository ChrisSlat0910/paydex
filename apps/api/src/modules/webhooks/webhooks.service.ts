import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../config/logger';
import { AppError } from '../../errors/app-error';
import { query } from '../../db/pool';
import { deliveryQueue } from '../../queue/bullmq.config';
import { GatewayAdapterFactory } from '../../adapters/adapter.factory';

interface GatewayRow {
  id: string;
  owner_id: string;
  adapter_type: string;
  encrypted_credentials: string;
}

interface EndpointRow {
  id: string;
  url: string;
}

interface WebhookEventRow {
  id: string;
}

function decryptCredentials(encrypted: string): string {
  // Full AES-256-GCM decryption implemented in gateway service
  // For now return as-is — credentials stored encrypted, decrypted at use
  return encrypted;
}

export async function ingestWebhook(
  gatewayName: string,
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  isDuplicate: boolean,
  externalId: string,
): Promise<{ eventId: string; duplicate: boolean }> {
  const gatewayResult = await query<GatewayRow>(
    `SELECT id, owner_id, adapter_type, encrypted_credentials
     FROM gateways WHERE name = $1 AND is_active = 1`,
    [gatewayName],
  );

  if (gatewayResult.rows.length === 0) {
    throw new AppError(`Gateway not found: ${gatewayName}`, 'GATEWAY_NOT_FOUND', 404);
  }

  const gateway = gatewayResult.rows[0];
  const adapter = GatewayAdapterFactory.create(gateway.adapter_type);
  const secret = decryptCredentials(gateway.encrypted_credentials);

  const signatureValid = adapter.validateSignature(rawBody, headers, secret);

  if (!signatureValid) {
    throw new AppError('Invalid webhook signature', 'INVALID_SIGNATURE', 401);
  }

  const rawPayload = JSON.parse(rawBody.toString('utf-8')) as unknown;
  const normalized = adapter.normalizeEvent(rawPayload);
  const idempotencyKey = `${gatewayName}:${externalId}`;
  const eventHash = createHash('sha256').update(rawBody).digest('hex');

  if (isDuplicate) {
    logger.info('Duplicate webhook received', { gatewayName, externalId });

    const existingResult = await query<WebhookEventRow>(
      'SELECT id FROM webhook_events WHERE idempotency_key = $1',
      [idempotencyKey],
    );

    const eventId = existingResult.rows[0]?.id ?? uuidv4();

    return { eventId, duplicate: true };
  }

  const eventId = uuidv4();

  await query(
    `INSERT INTO webhook_events
      (id, gateway_id, owner_id, external_id, event_type, status, raw_payload, normalized_payload, idempotency_key, event_hash)
     VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, $8, $9)`,
    [
      eventId,
      gateway.id,
      gateway.owner_id,
      externalId,
      normalized.eventType,
      JSON.stringify(rawPayload),
      JSON.stringify(normalized),
      idempotencyKey,
      eventHash,
    ],
  );

  const endpointResult = await query<EndpointRow>(
    'SELECT id, url FROM endpoints WHERE owner_id = $1 AND is_active = 1',
    [gateway.owner_id],
  );

  for (const endpoint of endpointResult.rows) {
    await deliveryQueue.add('event:deliver', {
      eventId,
      endpointId: endpoint.id,
      endpointUrl: endpoint.url,
      payload: normalized,
      attemptNumber: 1,
    });
  }

  logger.info('Webhook ingested', { eventId, gatewayName, externalId });

  return { eventId, duplicate: false };
}
