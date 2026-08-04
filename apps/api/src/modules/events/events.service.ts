import { query } from '../../db/pool';
import { AppError } from '../../errors/app-error';

interface WebhookEventRow {
  id: string;
  gateway_id: string;
  owner_id: string;
  external_id: string;
  event_type: string;
  status: string;
  raw_payload: string;
  normalized_payload: string;
  created_at: string;
  updated_at: string;
}

interface DeliveryLogRow {
  attempt_number: number;
  http_status: number | null;
  attempted_at: string;
}

interface EventListRow extends WebhookEventRow {
  latest_attempt_number: number | null;
  latest_http_status: number | null;
  latest_attempted_at: string | null;
}

interface ListEventsOptions {
  ownerId: string;
  isAdmin: boolean;
  status?: string;
  gatewayId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export async function listEvents(options: ListEventsOptions): Promise<{
  events: EventListRow[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const { ownerId, isAdmin, status, gatewayId, from, to, cursor, limit = 20 } = options;
  const params: unknown[] = [];
  const conditions: string[] = [];
  let paramIndex = 1;

  if (!isAdmin) {
    conditions.push(`we.owner_id = $${paramIndex}`);
    params.push(ownerId);
    paramIndex++;
  }

  if (status) {
    conditions.push(`we.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (gatewayId) {
    conditions.push(`we.gateway_id = $${paramIndex}`);
    params.push(gatewayId);
    paramIndex++;
  }

  if (from) {
    conditions.push(`we.created_at >= $${paramIndex}`);
    params.push(from);
    paramIndex++;
  }

  if (to) {
    conditions.push(`we.created_at <= $${paramIndex}`);
    params.push(to);
    paramIndex++;
  }

  if (cursor) {
    conditions.push(`we.created_at < $${paramIndex}`);
    params.push(cursor);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit + 1);

  const result = await query<EventListRow>(
    `SELECT
      we.id, we.gateway_id, we.owner_id, we.external_id, we.event_type,
      we.status, we.raw_payload, we.normalized_payload, we.created_at, we.updated_at,
      dl.attempt_number AS latest_attempt_number,
      dl.http_status AS latest_http_status,
      dl.attempted_at AS latest_attempted_at
     FROM webhook_events we
     LEFT JOIN LATERAL (
       SELECT attempt_number, http_status, attempted_at
       FROM delivery_logs
       WHERE event_id = we.id
       ORDER BY attempt_number DESC
       LIMIT 1
     ) dl ON true
     ${whereClause}
     ORDER BY we.created_at DESC
     LIMIT $${paramIndex}`,
    params,
  );

  const rows = result.rows;
  const hasMore = rows.length > limit;
  const events = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (events[events.length - 1]?.created_at ?? null) : null;

  return { events, nextCursor, hasMore };
}

export async function getEvent(
  id: string,
  ownerId: string,
  isAdmin: boolean,
): Promise<WebhookEventRow> {
  const result = isAdmin
    ? await query<WebhookEventRow>('SELECT * FROM webhook_events WHERE id = $1', [id])
    : await query<WebhookEventRow>('SELECT * FROM webhook_events WHERE id = $1 AND owner_id = $2', [
        id,
        ownerId,
      ]);

  if (result.rows.length === 0) {
    throw new AppError('Event not found', 'EVENT_NOT_FOUND', 404);
  }

  return result.rows[0];
}

export async function getDeliveryLogs(
  eventId: string,
  ownerId: string,
  isAdmin: boolean,
): Promise<DeliveryLogRow[]> {
  await getEvent(eventId, ownerId, isAdmin);

  const result = await query<DeliveryLogRow>(
    `SELECT attempt_number, http_status, response_body, duration_ms, status, error_message, attempted_at
     FROM delivery_logs WHERE event_id = $1 ORDER BY attempt_number ASC`,
    [eventId],
  );

  return result.rows;
}
