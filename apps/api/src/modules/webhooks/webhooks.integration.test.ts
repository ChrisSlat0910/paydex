import { createHash } from 'node:crypto';

import request from 'supertest';

import { app } from '../../app';
import { pool } from '../../db/pool';
import { redisConnection } from '../../queue/bullmq.config';

function generateMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
): string {
  return createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
}

describe('Webhook Ingestion Integration', () => {
  const serverKey = 'test-server-key';

  beforeEach(async () => {
    await pool.query('DELETE FROM audit_log');
    await pool.query('DELETE FROM delivery_logs');
    await pool.query('DELETE FROM idempotency_keys');
    await pool.query('DELETE FROM webhook_events');
    await pool.query('DELETE FROM endpoints');
    await pool.query('DELETE FROM gateways');
    await pool.query('DELETE FROM api_keys');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM users');
    await redisConnection.flushdb();
  });

  afterAll(async () => {
    await pool.end();
    await redisConnection.quit();
  });

  it('should return 404 when gateway not found', async () => {
    const payload = {
      order_id: 'ORDER-001',
      transaction_status: 'settlement',
      gross_amount: '100000',
      status_code: '200',
      signature_key: generateMidtransSignature('ORDER-001', '200', '100000', serverKey),
    };

    const res = await request(app)
      .post('/api/v1/webhook/midtrans')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('GATEWAY_NOT_FOUND');
  });

  it('should return 200 for duplicate event', async () => {
    await pool.query(
      `INSERT INTO users (id, email, bcrypt_hash, role) VALUES ('user-1', 'admin@test.com', 'hash', 'admin')`,
    );
    await pool.query(
      `INSERT INTO gateways (id, owner_id, name, adapter_type, encrypted_credentials) VALUES ('gw-1', 'user-1', 'midtrans', 'midtrans', $1)`,
      [serverKey],
    );

    const externalId = 'ORDER-DUP';
    await redisConnection.set(`idempotency:midtrans:${externalId}`, '1', 'EX', 86400);

    const payload = {
      order_id: externalId,
      transaction_status: 'settlement',
      gross_amount: '100000',
      status_code: '200',
      signature_key: generateMidtransSignature(externalId, '200', '100000', serverKey),
    };

    const res = await request(app)
      .post('/api/v1/webhook/midtrans')
      .set('Content-Type', 'application/json')
      .set('x-transaction-id', externalId)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.data.duplicate).toBe(true);
  });
});
