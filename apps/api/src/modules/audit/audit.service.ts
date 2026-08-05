import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../config/logger';
import { query } from '../../db/pool';
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../../queue/bullmq.config';
import type { AuditJobData } from '../../queue/job-types';

interface AuditLogRow {
  id: string;
  curr_hash: string;
  prev_hash: string;
  event_id: string;
  action: string;
  actor_id: string;
  created_at: string;
}

function computeAuditHash(
  prevHash: string,
  eventId: string,
  action: string,
  actorId: string,
  timestamp: string,
): string {
  return createHash('sha256')
    .update(`${prevHash}${eventId}${action}${actorId}${timestamp}`)
    .digest('hex');
}

async function writeAuditEntry(data: AuditJobData): Promise<void> {
  const { eventId, action, actorId, metadata } = data;
  const client = await (await import('../../db/pool')).pool.connect();

  try {
    await client.query('BEGIN');

    const lastEntry = await client.query<AuditLogRow>(
      'SELECT curr_hash FROM audit_log ORDER BY created_at DESC LIMIT 1 FOR UPDATE',
    );

    const prevHash = lastEntry.rows[0]?.curr_hash ?? 'GENESIS';
    const timestamp = new Date().toISOString();
    const currHash = computeAuditHash(prevHash, eventId, action, actorId, timestamp);
    const id = uuidv4();

    await client.query(
      `INSERT INTO audit_log (id, event_id, actor_id, action, prev_hash, curr_hash, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, eventId, actorId, action, prevHash, currHash, JSON.stringify(metadata ?? {}), timestamp],
    );

    await client.query('COMMIT');

    logger.info('Audit entry written', { id, eventId, action });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function verifyAuditChain(): Promise<{
  valid: boolean;
  totalEntries: number;
  brokenAt?: string;
}> {
  const result = await query<AuditLogRow>(
    'SELECT id, event_id, action, actor_id, prev_hash, curr_hash, created_at FROM audit_log ORDER BY created_at ASC',
  );

  const entries = result.rows;
  let prevHash = 'GENESIS';

  for (const entry of entries) {
    const expected = computeAuditHash(
      prevHash,
      entry.event_id,
      entry.action,
      entry.actor_id,
      entry.created_at,
    );

    if (expected !== entry.curr_hash) {
      return { valid: false, totalEntries: entries.length, brokenAt: entry.id };
    }

    prevHash = entry.curr_hash;
  }

  return { valid: true, totalEntries: entries.length };
}

export function startAuditWorker(): Worker<AuditJobData> {
  const worker = new Worker<AuditJobData>(
    'audit',
    async (job: Job<AuditJobData>) => {
      await writeAuditEntry(job.data);
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error('Audit job failed', {
      jobId: job?.id,
      eventId: job?.data.eventId,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('Audit worker error', { error: err.message });
  });

  logger.info('Audit worker started');

  return worker;
}
