# ADR-003: Sliding Window Over Fixed Window Rate Limiting

**Status:** Accepted
**Date:** 2026-08-01

## Context

Paydex enforces 1,000 requests per minute per API key. The algorithm choice affects accuracy and Redis memory usage.

## Decision

Implement sliding window rate limiting using Redis sorted sets (ZSET). Each request adds a timestamped entry. `ZREMRANGEBYSCORE` removes entries older than 60 seconds before counting. `ZCARD` gives the current window count.

Four operations run in a single `MULTI/EXEC` pipeline: `ZREMRANGEBYSCORE` + `ZADD` + `ZCARD` + `EXPIRE`.

Fail open when Redis is unavailable — reject no requests if the rate limit store is down.

## Rationale

- Fixed window allows boundary bursts: 1,000 requests at 00:59 + 1,000 at 01:00 = 2,000 requests in 2 seconds. This is a real exploit pattern.
- Sliding window counts requests within the last 60 seconds at any point, preventing boundary bursts.
- Four Redis operations run in one pipeline round-trip — atomic execution.
- Memory per key is bounded: at 1,000 req/min maximum, the ZSET holds at most 1,000 entries (~50KB per key).

## Alternatives Considered

- **Fixed window counter (`INCR` + `EXPIRE`):** Simpler, O(1) memory, but allows boundary burst. Rejected.
- **Token bucket:** More flexible burst control, more complex to implement correctly in Redis. Rejected.
- **Leaky bucket:** Smooth output rate, correct but complex. Rejected.

## Consequences

- Positive: Eliminates boundary burst vulnerability.
- Positive: Implementation is ~25 lines using standard Redis sorted set operations.
- Negative: Slightly more memory than fixed window counter. Acceptable at demo scale.
- Negative: Four Redis ops per request vs two for fixed window. Mitigated by pipeline execution.
