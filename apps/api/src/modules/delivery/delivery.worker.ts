import { Worker, Job } from 'bullmq';

import { logger } from '../../config/logger';
import { query } from '../../db/pool';
import { redisConnection, auditQueue } from '../../queue/bullmq.config';
import type { DeliveryJobData } from '../../queue/job-types';

const DELIVERY_TIMEOUT_MS = 30000;

async function processDeliveryJob(job: Job<DeliveryJobData>): Promise<void> {
  const { eventId, endpointId, endpointUrl, payload, attemptNumber } = job.data;
  const startTime = Date.now();

  logger.info('Processing delivery job', { eventId, endpointId, attemptNumber });

  let httpStatus: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      httpStatus = response.status;
      responseBody = await response.text();
      success = response.ok;
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn('Delivery attempt failed', { eventId, endpointId, error: errorMessage });
  }

  const durationMs = Date.now() - startTime;
  const status = success ? 'SUCCESS' : 'FAILED';

  await query(
    `INSERT INTO delivery_logs
      (id, event_id, endpoint_id, attempt_number, http_status, response_body, duration_ms, status, error_message)
     VALUES (gen_random_uuid()::varchar, $1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      eventId,
      endpointId,
      attemptNumber,
      httpStatus,
      responseBody,
      durationMs,
      status,
      errorMessage,
    ],
  );

  if (success) {
    await query(
      `UPDATE webhook_events SET status = 'DELIVERED', updated_at = NOW() WHERE id = $1`,
      [eventId],
    );

    await auditQueue.add('audit:write', {
      eventId,
      action: 'DELIVERY_SUCCESS',
      actorId: 'system',
      metadata: { attemptNumber, httpStatus, durationMs },
    });

    logger.info('Event delivered successfully', { eventId, endpointId, attemptNumber });
  } else {
    const maxAttempts = 6;

    if (attemptNumber >= maxAttempts) {
      await query(`UPDATE webhook_events SET status = 'FAILED', updated_at = NOW() WHERE id = $1`, [
        eventId,
      ]);

      await auditQueue.add('audit:write', {
        eventId,
        action: 'DELIVERY_EXHAUSTED',
        actorId: 'system',
        metadata: { attemptNumber, httpStatus, errorMessage },
      });

      logger.error('Delivery exhausted after max attempts', { eventId, endpointId });
    }

    throw new Error(errorMessage ?? `HTTP ${httpStatus ?? 'unknown'}`);
  }
}

export function startDeliveryWorker(): Worker<DeliveryJobData> {
  const worker = new Worker<DeliveryJobData>('delivery', (job) => processDeliveryJob(job), {
    connection: redisConnection,
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    logger.error('Delivery job failed', {
      jobId: job?.id,
      eventId: job?.data.eventId,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('Delivery worker error', { error: err.message });
  });

  logger.info('Delivery worker started');

  return worker;
}
