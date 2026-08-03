# ADR-002: BullMQ Over Native Redis Pub/Sub for Delivery Queue

**Status:** Accepted
**Date:** 2026-08-01

## Context

Paydex needs reliable async delivery of webhook events with exponential backoff retry, attempt tracking, and dead letter queue for exhausted jobs.

## Decision

Use BullMQ for all async job processing. Two queues:

- `delivery` — concurrency 5, attempts 6, exponential backoff delay 1000ms
- `audit` — concurrency 1 (serial, preserves chain ordering), attempts 3

Both use `removeOnComplete: false` and `removeOnFail: false`.

## Rationale

- Exponential backoff is a single config option in BullMQ. Building equivalent retry logic on raw pub/sub requires custom timer management and hundreds of lines of code.
- BullMQ persists jobs in Redis sorted sets. Jobs survive worker restarts. Raw pub/sub messages are lost if the subscriber is down.
- Dead letter queue (`removeOnFail: false`) is a BullMQ config option. Raw pub/sub has no DLQ concept.
- BullMQ shares the same Upstash Redis instance as rate limiting and idempotency — one external dependency.

## Alternatives Considered

- **Native Redis pub/sub:** Zero additional dependency, but requires manual retry, backoff, DLQ, and persistence. Rejected.
- **RabbitMQ:** Feature-complete but overkill for a single-service monolith, not available on free tier. Rejected.
- **Database-backed queue (polling):** Simpler, no Redis dependency. Polling adds latency and is a known anti-pattern under load. Rejected.

## Consequences

- Positive: Retry logic, backoff, DLQ, and job persistence require zero custom code.
- Positive: One Redis instance for queue + cache + rate limiting.
- Negative: BullMQ requires Redis. If Redis goes down, delivery queue goes down. Mitigated by Upstash managed Redis.
