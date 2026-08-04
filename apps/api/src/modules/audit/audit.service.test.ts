import { verifyAuditChain } from './audit.service';
import { query } from '../../db/pool';

jest.mock('../../db/pool');
jest.mock('../../queue/bullmq.config', () => ({
  deliveryQueue: { add: jest.fn() },
  auditQueue: { add: jest.fn() },
  redisConnection: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return valid: true for empty audit log', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const result = await verifyAuditChain();

    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(0);
  });

  it('should return valid: false when chain is tampered', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'entry-1',
          event_id: 'event-1',
          action: 'EVENT_RECEIVED',
          actor_id: 'system',
          prev_hash: 'GENESIS',
          curr_hash: 'tampered-hash',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      rowCount: 1,
    } as any);

    const result = await verifyAuditChain();

    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe('entry-1');
  });
});
