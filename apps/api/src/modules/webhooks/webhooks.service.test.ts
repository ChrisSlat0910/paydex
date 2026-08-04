import { ingestWebhook } from './webhooks.service';
import { query } from '../../db/pool';
import { deliveryQueue } from '../../queue/bullmq.config';
import { GatewayAdapterFactory } from '../../adapters/adapter.factory';

jest.mock('../../db/pool');
jest.mock('../../queue/bullmq.config', () => ({
  deliveryQueue: { add: jest.fn() },
  auditQueue: { add: jest.fn() },
  redisConnection: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));
jest.mock('../../adapters/adapter.factory');

const mockQuery = jest.mocked(query);
const mockDeliveryQueueAdd = jest.mocked(deliveryQueue.add);
const mockFactoryCreate = jest.mocked(GatewayAdapterFactory.create);

const gatewayRow = {
  rows: [
    {
      id: 'gateway-id',
      owner_id: 'owner-id',
      adapter_type: 'midtrans',
      encrypted_credentials: 'encrypted',
    },
  ],
  rowCount: 1,
};

const mockAdapter = {
  validateSignature: jest.fn().mockReturnValue(true),
  normalizeEvent: jest.fn().mockReturnValue({
    externalId: 'ORDER-001',
    eventType: 'settlement',
    amount: 100000,
    currency: 'IDR',
    status: 'settlement',
    rawPayload: {},
    metadata: {},
  }),
};

const rawBody = Buffer.from(
  JSON.stringify({
    order_id: 'ORDER-001',
    transaction_status: 'settlement',
    gross_amount: '100000',
    status_code: '200',
    signature_key: 'valid-signature',
  }),
);

const headers = { 'content-type': 'application/json' };

describe('WebhookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockAdapter.validateSignature.mockReturnValue(true);
    mockAdapter.normalizeEvent.mockReturnValue({
      externalId: 'ORDER-001',
      eventType: 'settlement',
      amount: 100000,
      currency: 'IDR',
      status: 'settlement',
      rawPayload: {},
      metadata: {},
    });
  });

  it('should throw when gateway not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await expect(ingestWebhook('unknown', rawBody, headers, false, 'ORDER-001')).rejects.toThrow(
      'Gateway not found: unknown',
    );
  });

  it('should throw when signature validation fails', async () => {
    mockQuery.mockResolvedValueOnce(gatewayRow as any);
    mockFactoryCreate.mockReturnValue({
      ...mockAdapter,
      validateSignature: jest.fn().mockReturnValue(false),
    });

    await expect(ingestWebhook('midtrans', rawBody, headers, false, 'ORDER-001')).rejects.toThrow(
      'Invalid webhook signature',
    );
  });

  it('should return duplicate true when isDuplicate flag is set', async () => {
    mockQuery
      .mockResolvedValueOnce(gatewayRow as any)
      .mockResolvedValueOnce({ rows: [{ id: 'existing-event-id' }], rowCount: 1 } as any);

    mockFactoryCreate.mockReturnValue(mockAdapter);

    const result = await ingestWebhook('midtrans', rawBody, headers, true, 'ORDER-001');

    expect(result.duplicate).toBe(true);
    expect(mockDeliveryQueueAdd).not.toHaveBeenCalled();
  });

  it('should ingest a valid webhook and enqueue delivery job', async () => {
    mockQuery
      .mockResolvedValueOnce(gatewayRow as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'event-id' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({
        rows: [{ id: 'endpoint-id', url: 'https://example.com/webhook' }],
        rowCount: 1,
      } as any);

    mockFactoryCreate.mockReturnValue(mockAdapter);
    mockDeliveryQueueAdd.mockResolvedValue({} as any);

    const result = await ingestWebhook('midtrans', rawBody, headers, false, 'ORDER-001');

    expect(result.duplicate).toBe(false);
    expect(mockDeliveryQueueAdd).toHaveBeenCalledTimes(1);
  });
});
